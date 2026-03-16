/**
 * JXR.js — Code Editor Component
 * Design: LavaFlow OS — Thermal Precision + Edge Command
 * Lightweight code editor with syntax highlighting and tab management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useJXR } from '@/contexts/JXRContext';
import { X, Save, FileCode2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Syntax highlighter ───────────────────────────────────────────────────────

function highlight(code: string, language: string): string {
  if (!['tsx', 'ts', 'jsx', 'js'].includes(language)) {
    return escapeHtml(code);
  }

  let result = escapeHtml(code);

  // Keywords
  result = result.replace(
    /\b(import|export|from|default|const|let|var|function|return|if|else|for|while|class|extends|new|typeof|instanceof|async|await|try|catch|throw|interface|type|enum|implements|abstract|readonly|private|public|protected|static|override|declare|namespace|module|as|in|of|void|null|undefined|true|false|this|super)\b/g,
    '<span class="syn-keyword">$1</span>'
  );

  // JSX tags
  result = result.replace(
    /(&lt;\/?[A-Z][A-Za-z0-9.]*)/g,
    '<span class="syn-component">$1</span>'
  );
  result = result.replace(
    /(&lt;\/?[a-z][a-z0-9-]*)/g,
    '<span class="syn-tag">$1</span>'
  );

  // Strings
  result = result.replace(
    /(&quot;[^&]*&quot;|&#39;[^&]*&#39;|`[^`]*`)/g,
    '<span class="syn-string">$1</span>'
  );

  // Comments
  result = result.replace(
    /(\/\/[^\n]*)/g,
    '<span class="syn-comment">$1</span>'
  );
  result = result.replace(
    /(\/\*[\s\S]*?\*\/)/g,
    '<span class="syn-comment">$1</span>'
  );

  // Numbers
  result = result.replace(
    /\b(\d+\.?\d*)\b/g,
    '<span class="syn-number">$1</span>'
  );

  // Function names
  result = result.replace(
    /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g,
    '<span class="syn-function">$1</span>'
  );

  // Types (PascalCase)
  result = result.replace(
    /\b([A-Z][A-Za-z0-9]*)\b/g,
    '<span class="syn-type">$1</span>'
  );

  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar() {
  const { openTabs, activeFile, openFile, closeFile } = useJXR();

  return (
    <div className="flex items-center overflow-x-auto border-b border-border bg-card scrollbar-thin">
      {openTabs.map((tab) => {
        const isActive = tab.path === activeFile?.path;
        const name = tab.path.split('/').pop() ?? tab.path;
        return (
          <div
            key={tab.path}
            className={cn(
              'group flex items-center gap-1.5 px-3 py-2 border-r border-border cursor-pointer',
              'text-xs font-mono whitespace-nowrap transition-colors duration-100 shrink-0',
              isActive
                ? 'bg-background text-foreground border-t-2 border-t-lava'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
            onClick={() => openFile(tab.path)}
          >
            <FileCode2 className="w-3 h-3 shrink-0" />
            <span>{name}</span>
            {tab.dirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-lava shrink-0" />
            )}
            <button
              className={cn(
                'ml-0.5 p-0.5 rounded hover:bg-muted transition-opacity',
                isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
              )}
              onClick={(e) => {
                e.stopPropagation();
                closeFile(tab.path);
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

export function CodeEditor() {
  const { activeFile, saveFile, openTabs } = useJXR();
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync content when active file changes
  useEffect(() => {
    if (activeFile) {
      setContent(activeFile.content);
      setIsDirty(false);
    }
  }, [activeFile?.path]);

  // Auto-save after 1.5s of inactivity
  useEffect(() => {
    if (!isDirty || !activeFile) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveFile(activeFile.path, content);
      setIsDirty(false);
    }, 1500);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [content, isDirty, activeFile, saveFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab key → insert 2 spaces
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = e.currentTarget.selectionStart;
        const end = e.currentTarget.selectionEnd;
        const newContent = content.substring(0, start) + '  ' + content.substring(end);
        setContent(newContent);
        setIsDirty(true);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start + 2;
            textareaRef.current.selectionEnd = start + 2;
          }
        });
      }
      // Ctrl/Cmd+S → save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFile) {
          saveFile(activeFile.path, content);
          setIsDirty(false);
          toast.success('Saved', { duration: 1000 });
        }
      }
    },
    [content, activeFile, saveFile]
  );

  // Sync scroll between textarea and highlight layer
  const handleScroll = useCallback(() => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const lines = content.split('\n');
  const highlighted = activeFile
    ? highlight(content, activeFile.language)
    : escapeHtml(content);

  if (openTabs.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center space-y-3">
            <FileCode2 className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Select a file to edit</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <TabBar />

      {/* Editor area */}
      <div className="flex-1 overflow-hidden relative">
        {activeFile ? (
          <div className="flex h-full">
            {/* Line numbers */}
            <div
              className="select-none text-right pr-3 pl-3 py-4 text-xs font-mono text-muted-foreground/40 bg-card/50 border-r border-border overflow-hidden"
              style={{ minWidth: '3rem', lineHeight: '1.6' }}
            >
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Code area */}
            <div className="flex-1 relative overflow-hidden">
              {/* Syntax highlight layer */}
              <div
                ref={highlightRef}
                className="absolute inset-0 px-4 py-4 text-xs font-mono overflow-auto pointer-events-none whitespace-pre"
                style={{ lineHeight: '1.6', color: 'transparent' }}
                dangerouslySetInnerHTML={{ __html: highlighted }}
              />

              {/* Actual textarea */}
              <textarea
                ref={textareaRef}
                className={cn(
                  'absolute inset-0 w-full h-full px-4 py-4',
                  'text-xs font-mono bg-transparent text-foreground',
                  'resize-none outline-none border-none',
                  'caret-lava selection:bg-lava/30',
                  'overflow-auto whitespace-pre'
                )}
                style={{ lineHeight: '1.6', caretColor: 'var(--lava)' }}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No file selected</p>
          </div>
        )}
      </div>

      {/* Status bar */}
      {activeFile && (
        <div className="flex items-center justify-between px-4 py-1 border-t border-border bg-card text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="font-mono">{activeFile.language.toUpperCase()}</span>
            <span>{lines.length} lines</span>
            <span>{(activeFile.size / 1024).toFixed(1)} KB</span>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-lava flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-lava inline-block" />
                Unsaved
              </span>
            )}
            <span>UTF-8</span>
            <span>LF</span>
          </div>
        </div>
      )}

      {/* Syntax highlight CSS */}
      <style>{`
        .syn-keyword { color: #c792ea; }
        .syn-component { color: #82aaff; }
        .syn-tag { color: #f07178; }
        .syn-string { color: #c3e88d; }
        .syn-comment { color: #546e7a; font-style: italic; }
        .syn-number { color: #f78c6c; }
        .syn-function { color: #82aaff; }
        .syn-type { color: #ffcb6b; }
      `}</style>
    </div>
  );
}
