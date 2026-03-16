/**
 * JXR.js — React Context & Runtime Hooks
 * ─────────────────────────────────────────────────────────────────────────────
 * Design: LavaFlow OS — Thermal Precision + Edge Command
 * Layer: UI / State Management
 *
 * Provides reactive access to all JXR runtime subsystems via React context.
 * All state updates are batched and debounced to prevent render thrashing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  jxrRuntime,
  type JXRRuntimeMetrics,
  type VirtualFile,
  type VirtualDirectory,
} from '@/lib/jxr-runtime';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EditorTab = {
  path: string;
  dirty: boolean;
};

export type PreviewState = 'idle' | 'building' | 'ready' | 'error';

export interface JXRContextValue {
  // Runtime
  runtime: typeof jxrRuntime;
  metrics: JXRRuntimeMetrics | null;
  isInitialized: boolean;

  // File system
  fileTree: VirtualDirectory | null;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  saveFile: (path: string, content: string) => void;
  createFile: (path: string, content?: string) => void;
  deleteFile: (path: string) => void;
  activeFile: VirtualFile | null;
  openTabs: EditorTab[];

  // Preview
  previewState: PreviewState;
  previewHtml: string;
  previewError: string | null;
  refreshPreview: () => void;

  // Terminal
  terminalLines: TerminalLine[];
  pushTerminalLine: (line: TerminalLine) => void;
  clearTerminal: () => void;
}

export interface TerminalLine {
  id: string;
  type: 'info' | 'success' | 'error' | 'warn' | 'command' | 'output';
  text: string;
  timestamp: number;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const JXRContext = createContext<JXRContextValue | null>(null);

export function useJXR(): JXRContextValue {
  const ctx = useContext(JXRContext);
  if (!ctx) throw new Error('useJXR must be used within JXRProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function JXRProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [metrics, setMetrics] = useState<JXRRuntimeMetrics | null>(null);
  const [fileTree, setFileTree] = useState<VirtualDirectory | null>(null);
  const [activeFilePath, setActiveFilePath] = useState<string | null>('/src/App.tsx');
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([
    { path: '/src/App.tsx', dirty: false },
    { path: '/src/components/Button.tsx', dirty: false },
    { path: '/src/hooks/useCounter.ts', dirty: false },
  ]);
  const [previewState, setPreviewState] = useState<PreviewState>('idle');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const previewDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineCounter = useRef(0);

  // ─── Initialize runtime ───────────────────────────────────────────────────

  useEffect(() => {
    let unsubMetrics: (() => void) | null = null;
    let unsubFS: (() => void) | null = null;

    const init = async () => {
      pushLine('command', '$ jxr init --edge --moq --crypto');
      pushLine('info', 'Initializing JXR.js Edge Runtime v1.0.0...');

      await jxrRuntime.init();

      pushLine('success', '✓ MoQ transport connected (edge://jxr-local)');
      pushLine('success', '✓ Worker pool initialized (cores: ' + (navigator.hardwareConcurrency ?? 4) + ')');
      pushLine('success', '✓ Web Crypto engine ready (AES-GCM-256 + ECDSA P-256)');
      pushLine('success', '✓ Virtual FS mounted (/src)');
      pushLine('success', '✓ Module resolver online (esm.sh CDN)');
      pushLine('output', '');
      pushLine('output', 'JXR.js ready. No build step required.');

      // Subscribe to metrics
      unsubMetrics = jxrRuntime.onMetrics((m) => setMetrics(m));

      // Subscribe to FS changes
      unsubFS = jxrRuntime.vfs.onChange(() => {
        setFileTree(jxrRuntime.vfs.buildTree('/'));
        schedulePreviewRefresh();
      });

      setFileTree(jxrRuntime.vfs.buildTree('/'));
      setIsInitialized(true);
      schedulePreviewRefresh();
    };

    init().catch((err) => {
      pushLine('error', `✗ Runtime init failed: ${err.message}`);
    });

    return () => {
      unsubMetrics?.();
      unsubFS?.();
      jxrRuntime.dispose();
    };
  }, []);

  // ─── Terminal helpers ─────────────────────────────────────────────────────

  const pushLine = useCallback((type: TerminalLine['type'], text: string) => {
    setTerminalLines((prev) => [
      ...prev.slice(-200), // Keep last 200 lines
      { id: `line-${++lineCounter.current}`, type, text, timestamp: Date.now() },
    ]);
  }, []);

  const pushTerminalLine = useCallback(
    (line: TerminalLine) => setTerminalLines((prev) => [...prev.slice(-200), line]),
    []
  );

  const clearTerminal = useCallback(() => setTerminalLines([]), []);

  // ─── Preview engine ───────────────────────────────────────────────────────

  const schedulePreviewRefresh = useCallback(() => {
    if (previewDebounce.current) clearTimeout(previewDebounce.current);
    previewDebounce.current = setTimeout(() => {
      refreshPreview();
    }, 300);
  }, []);

  const refreshPreview = useCallback(() => {
    setPreviewState('building');
    setPreviewError(null);

    try {
      const html = jxrRuntime.buildPreviewDocument();
      setPreviewHtml(html);
      setPreviewState('ready');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setPreviewError(message);
      setPreviewState('error');
      pushLine('error', `Preview error: ${message}`);
    }
  }, [pushLine]);

  // ─── File operations ──────────────────────────────────────────────────────

  const openFile = useCallback((path: string) => {
    setActiveFilePath(path);
    setOpenTabs((prev) => {
      if (prev.find((t) => t.path === path)) return prev;
      return [...prev, { path, dirty: false }];
    });
  }, []);

  const closeFile = useCallback(
    (path: string) => {
      setOpenTabs((prev) => {
        const next = prev.filter((t) => t.path !== path);
        if (activeFilePath === path && next.length > 0) {
          setActiveFilePath(next[next.length - 1].path);
        }
        return next;
      });
    },
    [activeFilePath]
  );

  const saveFile = useCallback(
    (path: string, content: string) => {
      jxrRuntime.vfs.write(path, content);
      jxrRuntime.cache.invalidate(path);
      setOpenTabs((prev) =>
        prev.map((t) => (t.path === path ? { ...t, dirty: false } : t))
      );
      pushLine('success', `✓ Saved ${path}`);
    },
    [pushLine]
  );

  const createFile = useCallback(
    (path: string, content = '') => {
      jxrRuntime.vfs.write(path, content);
      openFile(path);
      pushLine('success', `✓ Created ${path}`);
    },
    [openFile, pushLine]
  );

  const deleteFile = useCallback(
    (path: string) => {
      jxrRuntime.vfs.delete(path);
      closeFile(path);
      pushLine('warn', `⚠ Deleted ${path}`);
    },
    [closeFile, pushLine]
  );

  const activeFile = activeFilePath ? jxrRuntime.vfs.read(activeFilePath) : null;

  const value: JXRContextValue = {
    runtime: jxrRuntime,
    metrics,
    isInitialized,
    fileTree,
    openFile,
    closeFile,
    saveFile,
    createFile,
    deleteFile,
    activeFile,
    openTabs,
    previewState,
    previewHtml,
    previewError,
    refreshPreview,
    terminalLines,
    pushTerminalLine,
    clearTerminal,
  };

  return <JXRContext.Provider value={value}>{children}</JXRContext.Provider>;
}
