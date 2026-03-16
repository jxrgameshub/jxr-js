/**
 * JXR.js — File Explorer Component
 * Design: LavaFlow OS — Thermal Precision + Edge Command
 * Sidebar file tree with context menu, drag-and-drop ready
 */

import { useState, useCallback } from 'react';
import { useJXR } from '@/contexts/JXRContext';
import type { VirtualFile, VirtualDirectory } from '@/lib/jxr-runtime';
import {
  ChevronRight,
  ChevronDown,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function isVirtualFile(node: VirtualFile | VirtualDirectory): node is VirtualFile {
  return 'content' in node;
}

function getFileIcon(file: VirtualFile) {
  const iconClass = 'w-3.5 h-3.5 shrink-0';
  switch (file.language) {
    case 'tsx':
    case 'jsx':
      return <FileCode2 className={cn(iconClass, 'text-cyan-400')} />;
    case 'ts':
    case 'js':
      return <FileCode2 className={cn(iconClass, 'text-yellow-400')} />;
    case 'json':
      return <FileJson className={cn(iconClass, 'text-green-400')} />;
    case 'css':
      return <FileCode2 className={cn(iconClass, 'text-pink-400')} />;
    default:
      return <FileText className={cn(iconClass, 'text-muted-foreground')} />;
  }
}

function getFileName(path: string): string {
  return path.split('/').pop() ?? path;
}

interface TreeNodeProps {
  node: VirtualFile | VirtualDirectory;
  depth: number;
  activePath: string | null;
  onFileClick: (file: VirtualFile) => void;
  onDelete: (path: string) => void;
}

function TreeNode({ node, depth, activePath, onFileClick, onDelete }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const indent = depth * 12;

  if (isVirtualFile(node)) {
    const isActive = node.path === activePath;
    return (
      <div
        className={cn(
          'group flex items-center gap-1.5 px-2 py-[3px] cursor-pointer rounded-sm text-xs',
          'hover:bg-sidebar-accent/60 transition-colors duration-100',
          isActive && 'bg-sidebar-accent text-lava border-l-2 border-lava'
        )}
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={() => onFileClick(node)}
      >
        {getFileIcon(node)}
        <span className={cn(
          'flex-1 truncate font-mono',
          isActive ? 'text-lava' : 'text-sidebar-foreground/80'
        )}>
          {getFileName(node.path)}
        </span>
        <button
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node.path);
          }}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Directory node
  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-[3px] cursor-pointer rounded-sm text-xs',
          'hover:bg-sidebar-accent/40 transition-colors duration-100'
        )}
        style={{ paddingLeft: `${indent + 4}px` }}
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
        )}
        {expanded ? (
          <FolderOpen className="w-3.5 h-3.5 text-lava shrink-0" />
        ) : (
          <Folder className="w-3.5 h-3.5 text-lava/70 shrink-0" />
        )}
        <span className="text-sidebar-foreground/90 font-medium">
          {node.name}
        </span>
      </div>
      {expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={isVirtualFile(child) ? child.path : child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              onFileClick={onFileClick}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer() {
  const { fileTree, openFile, deleteFile, createFile, activeFile } = useJXR();
  const [newFileName, setNewFileName] = useState('');
  const [showNewFile, setShowNewFile] = useState(false);

  const handleFileClick = useCallback(
    (file: VirtualFile) => {
      openFile(file.path);
    },
    [openFile]
  );

  const handleDelete = useCallback(
    (path: string) => {
      deleteFile(path);
      toast.success(`Deleted ${path.split('/').pop()}`);
    },
    [deleteFile]
  );

  const handleCreateFile = useCallback(() => {
    if (!newFileName.trim()) return;
    const path = `/src/${newFileName.trim()}`;
    const ext = newFileName.split('.').pop() ?? 'ts';
    const templates: Record<string, string> = {
      tsx: `export default function ${newFileName.replace('.tsx', '')}() {\n  return <div>Hello from ${newFileName}</div>;\n}\n`,
      ts: `// ${newFileName}\nexport {};\n`,
      css: `/* ${newFileName} */\n`,
      json: `{}\n`,
    };
    createFile(path, templates[ext] ?? '');
    setNewFileName('');
    setShowNewFile(false);
  }, [newFileName, createFile]);

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            className="p-1 hover:text-lava transition-colors rounded"
            onClick={() => setShowNewFile((v) => !v)}
            title="New file"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 hover:text-lava transition-colors rounded"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* New file input */}
      {showNewFile && (
        <div className="px-3 py-2 border-b border-sidebar-border">
          <input
            autoFocus
            className="w-full bg-input text-xs font-mono px-2 py-1 rounded border border-border focus:border-lava outline-none"
            placeholder="filename.tsx"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFile();
              if (e.key === 'Escape') setShowNewFile(false);
            }}
          />
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
        {fileTree ? (
          <TreeNode
            node={fileTree}
            depth={0}
            activePath={activeFile?.path ?? null}
            onFileClick={handleFileClick}
            onDelete={handleDelete}
          />
        ) : (
          <div className="px-4 py-3 text-xs text-muted-foreground">Loading...</div>
        )}
      </div>
    </div>
  );
}
