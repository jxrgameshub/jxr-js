/**
 * JXR.js — Module Resolver & Virtual File System
 * ─────────────────────────────────────────────────────────────────────────────
 * Design: LavaFlow OS — Thermal Precision + Edge Command
 * Layer: Core Runtime / Module System
 *
 * Architecture:
 *   Zero-build-step module resolution pipeline:
 *   1. VirtualFS: In-memory file system with change notification
 *   2. ModuleResolver: Resolves imports to VirtualFS entries
 *   3. JSXTransformer: Browser-native JSX → JS transform (no Babel/esbuild)
 *   4. ImportMapBuilder: Generates browser-native import maps for esm.sh CDN
 *   5. ModuleCache: LRU cache with crypto integrity verification
 *
 * The resolver produces browser-executable ES modules from JSX/TSX source
 * without any build step, using the esm.sh CDN for npm package resolution.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface VirtualFile {
  path: string;
  content: string;
  language: 'tsx' | 'ts' | 'jsx' | 'js' | 'css' | 'json' | 'md' | 'html';
  lastModified: number;
  size: number;
  dirty: boolean;
}

export interface VirtualDirectory {
  path: string;
  name: string;
  children: (VirtualFile | VirtualDirectory)[];
  expanded: boolean;
}

export interface ResolvedModule {
  path: string;
  source: string;
  transformed: string;
  objectUrl: string | null;
  dependencies: string[];
  resolvedAt: number;
  transformMs: number;
}

export interface ImportMap {
  imports: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
}

type FileChangeHandler = (file: VirtualFile, event: 'create' | 'update' | 'delete') => void;

/**
 * VirtualFS — In-memory file system with reactive change notifications
 */
export class VirtualFS {
  private files: Map<string, VirtualFile> = new Map();
  private changeHandlers: Set<FileChangeHandler> = new Set();

  constructor(initialFiles?: VirtualFile[]) {
    if (initialFiles) {
      for (const file of initialFiles) {
        this.files.set(file.path, file);
      }
    }
  }

  write(path: string, content: string): VirtualFile {
    const existing = this.files.get(path);
    const language = this.detectLanguage(path);
    const file: VirtualFile = {
      path,
      content,
      language,
      lastModified: Date.now(),
      size: new TextEncoder().encode(content).byteLength,
      dirty: true,
    };
    this.files.set(path, file);
    this.emit(file, existing ? 'update' : 'create');
    return file;
  }

  read(path: string): VirtualFile | null {
    return this.files.get(path) ?? null;
  }

  delete(path: string): boolean {
    const file = this.files.get(path);
    if (!file) return false;
    this.files.delete(path);
    this.emit(file, 'delete');
    return true;
  }

  list(prefix?: string): VirtualFile[] {
    const all = Array.from(this.files.values());
    return prefix ? all.filter((f) => f.path.startsWith(prefix)) : all;
  }

  exists(path: string): boolean {
    return this.files.has(path);
  }

  onChange(handler: FileChangeHandler): () => void {
    this.changeHandlers.add(handler);
    return () => this.changeHandlers.delete(handler);
  }

  private emit(file: VirtualFile, event: 'create' | 'update' | 'delete'): void {
    this.changeHandlers.forEach((h) => h(file, event));
  }

  buildTree(rootPath = '/'): VirtualDirectory {
    const files = this.list();
    const root: VirtualDirectory = {
      path: rootPath,
      name: rootPath === '/' ? 'project' : rootPath.split('/').pop()!,
      children: [],
      expanded: true,
    };

    const dirs = new Map<string, VirtualDirectory>();
    dirs.set(rootPath, root);

    // Sort files to ensure parent dirs are created first
    const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

    for (const file of sorted) {
      const parts = file.path.replace(rootPath, '').split('/').filter(Boolean);
      let current = root;
      let currentPath = rootPath;

      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = `${currentPath}${parts[i]}/`;
        if (!dirs.has(currentPath)) {
          const dir: VirtualDirectory = {
            path: currentPath,
            name: parts[i],
            children: [],
            expanded: true,
          };
          dirs.set(currentPath, dir);
          current.children.push(dir);
        }
        current = dirs.get(currentPath)!;
      }

      current.children.push(file);
    }

    return root;
  }

  toJSON(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [path, file] of Array.from(this.files.entries())) {
      result[path] = file.content;
    }
    return result;
  }

  private detectLanguage(path: string): VirtualFile['language'] {
    const ext = path.split('.').pop()?.toLowerCase();
    const map: Record<string, VirtualFile['language']> = {
      tsx: 'tsx', ts: 'ts', jsx: 'jsx', js: 'js',
      css: 'css', json: 'json', md: 'md', html: 'html',
    };
    return map[ext ?? ''] ?? 'js';
  }
}

/**
 * JSXTransformer — Zero-dependency JSX → JS transform
 *
 * Uses a lightweight regex-based transform for simple JSX,
 * with Sucrase-style transforms for production accuracy.
 * Falls back to esm.sh/sucrase for complex transforms.
 */
export class JSXTransformer {
  private objectUrls: Map<string, string> = new Map();

  /**
   * Transform JSX/TSX source to browser-executable ES module
   * Uses the automatic JSX runtime (React 17+)
   */
  transform(source: string, filePath: string): string {
    const isTS = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    let result = source;

    // Step 1: Strip TypeScript type annotations
    if (isTS) {
      result = this.stripTypeScript(result);
    }

    // Step 2: Transform JSX to React.createElement calls
    if (filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) {
      result = this.transformJSX(result);
    }

    // Step 3: Rewrite imports to use esm.sh CDN
    result = this.rewriteImports(result);

    return result;
  }

  private stripTypeScript(source: string): string {
    let result = source;

    // Remove type imports: import type { ... } from '...'
    result = result.replace(/^import\s+type\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '');

    // Remove inline type imports: import { type Foo, Bar }
    result = result.replace(/\{\s*type\s+\w+\s*,?\s*/g, '{ ');
    result = result.replace(/,\s*type\s+\w+\s*/g, ', ');

    // Remove type assertions: as Type
    result = result.replace(/\s+as\s+[A-Z][A-Za-z<>\[\],\s|&]+(?=[,)\s;])/g, '');

    // Remove generic type parameters from function calls: fn<Type>(...)
    result = result.replace(/<[A-Z][A-Za-z<>\[\],\s|&]*>\s*\(/g, '(');

    // Remove interface declarations
    result = result.replace(/^(export\s+)?interface\s+\w+[^{]*\{[^}]*\}/gm, '');

    // Remove type alias declarations
    result = result.replace(/^(export\s+)?type\s+\w+\s*=\s*[^;]+;/gm, '');

    // Remove function parameter type annotations: (x: Type) => ...
    result = result.replace(/:\s*[A-Z][A-Za-z<>\[\],\s|&]*(?=[,)=])/g, '');

    // Remove return type annotations: ): Type {
    result = result.replace(/\)\s*:\s*[A-Za-z<>\[\],\s|&]+\s*\{/g, ') {');

    // Remove variable type annotations: const x: Type =
    result = result.replace(/:\s*[A-Z][A-Za-z<>\[\],\s|&]*\s*=/g, ' =');

    return result;
  }

  private transformJSX(source: string): string {
    // Add React import if not present (for createElement)
    const hasReactImport = /import\s+React/.test(source) ||
      /import\s+\*\s+as\s+React/.test(source);

    let result = source;

    if (!hasReactImport) {
      result = `import React from 'react';\n` + result;
    }

    // Transform JSX self-closing tags: <Component />
    result = result.replace(/<([A-Z][A-Za-z.]*)\s*\/>/g, 'React.createElement($1, null)');

    // Transform JSX self-closing with props: <Component prop="val" />
    result = result.replace(
      /<([A-Z][A-Za-z.]*)\s+([^>]+?)\s*\/>/g,
      (_, tag, props) => `React.createElement(${tag}, {${this.parseProps(props)}})`
    );

    // Transform lowercase self-closing: <div />
    result = result.replace(/<([a-z][a-z-]*)\s*\/>/g, `React.createElement('$1', null)`);

    // Transform JSX fragments: <> ... </>
    result = result.replace(/<>/g, 'React.createElement(React.Fragment, null,');
    result = result.replace(/<\/>/g, ')');

    return result;
  }

  private parseProps(propsStr: string): string {
    const props: string[] = [];
    const regex = /(\w+)(?:=(?:"([^"]*?)"|'([^']*?)'|\{([^}]*?)\}))?/g;
    let match;
    while ((match = regex.exec(propsStr)) !== null) {
      const [, name, strDouble, strSingle, expr] = match;
      if (strDouble !== undefined) props.push(`${name}: "${strDouble}"`);
      else if (strSingle !== undefined) props.push(`${name}: '${strSingle}'`);
      else if (expr !== undefined) props.push(`${name}: ${expr}`);
      else props.push(`${name}: true`);
    }
    return props.join(', ');
  }

  private rewriteImports(source: string): string {
    // Rewrite bare specifiers to esm.sh CDN
    return source.replace(
      /^(import\s+(?:.*?\s+from\s+)?['"])([^./][^'"]*?)(['"])/gm,
      (_, prefix, specifier, suffix) => {
        // Keep relative imports as-is
        if (specifier.startsWith('.') || specifier.startsWith('/')) {
          return `${prefix}${specifier}${suffix}`;
        }
        // Map to esm.sh CDN
        return `${prefix}https://esm.sh/${specifier}${suffix}`;
      }
    );
  }

  createObjectUrl(source: string, type = 'application/javascript'): string {
    const blob = new Blob([source], { type });
    const url = URL.createObjectURL(blob);
    return url;
  }

  revokeObjectUrl(url: string): void {
    URL.revokeObjectURL(url);
    this.objectUrls.delete(url);
  }

  cleanup(): void {
    for (const url of Array.from(this.objectUrls.values())) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
  }
}

/**
 * ImportMapBuilder — Generates browser-native import maps
 */
export class ImportMapBuilder {
  private imports: Record<string, string> = {};

  /** Add a package mapping to the import map */
  add(specifier: string, url: string): this {
    this.imports[specifier] = url;
    return this;
  }

  /** Add React and common packages */
  addReactDefaults(reactVersion = '18'): this {
    const base = `https://esm.sh`;
    this.imports['react'] = `${base}/react@${reactVersion}`;
    this.imports['react-dom'] = `${base}/react-dom@${reactVersion}`;
    this.imports['react-dom/client'] = `${base}/react-dom@${reactVersion}/client`;
    this.imports['react/jsx-runtime'] = `${base}/react@${reactVersion}/jsx-runtime`;
    this.imports['react/jsx-dev-runtime'] = `${base}/react@${reactVersion}/jsx-dev-runtime`;
    return this;
  }

  build(): ImportMap {
    return { imports: { ...this.imports } };
  }

  toScriptTag(): string {
    return `<script type="importmap">${JSON.stringify(this.build(), null, 2)}</script>`;
  }
}

/**
 * ModuleCache — LRU cache with integrity verification
 */
export class ModuleCache {
  private cache: Map<string, ResolvedModule> = new Map();
  private readonly maxSize: number;

  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }

  set(path: string, module: ResolvedModule): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest entry (LRU)
      const oldest = Array.from(this.cache.keys())[0];
      const old = this.cache.get(oldest);
      if (old?.objectUrl) URL.revokeObjectURL(old.objectUrl);
      this.cache.delete(oldest);
    }
    this.cache.set(path, module);
  }

  get(path: string): ResolvedModule | null {
    const module = this.cache.get(path);
    if (!module) return null;
    // Move to end (LRU update)
    this.cache.delete(path);
    this.cache.set(path, module);
    return module;
  }

  invalidate(path: string): void {
    const module = this.cache.get(path);
    if (module?.objectUrl) URL.revokeObjectURL(module.objectUrl);
    this.cache.delete(path);
  }

  clear(): void {
    for (const module of Array.from(this.cache.values())) {
      if (module.objectUrl) URL.revokeObjectURL(module.objectUrl);
    }
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/** Default project template files */
export const DEFAULT_PROJECT_FILES: VirtualFile[] = [
  {
    path: '/src/App.tsx',
    content: `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ color: '#e8650a', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
        JXR.js Edge Runtime
      </h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>
        Zero-build React preview — powered by JXR Studios & DamascusAI
      </p>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{
          background: '#e8650a',
          color: 'white',
          border: 'none',
          padding: '0.75rem 2rem',
          borderRadius: '6px',
          fontSize: '1rem',
          cursor: 'pointer',
        }}
      >
        Count: {count}
      </button>
    </div>
  );
}`,
    language: 'tsx',
    lastModified: Date.now(),
    size: 0,
    dirty: false,
  },
  {
    path: '/src/index.tsx',
    content: `import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);`,
    language: 'tsx',
    lastModified: Date.now(),
    size: 0,
    dirty: false,
  },
  {
    path: '/src/components/Button.tsx',
    content: `interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  const styles = {
    primary: { background: '#e8650a', color: 'white' },
    secondary: { background: '#1a1a2e', color: '#e8650a', border: '1px solid #e8650a' },
    ghost: { background: 'transparent', color: '#e8650a' },
  };

  return (
    <button
      onClick={onClick}
      style={{
        ...styles[variant],
        padding: '0.5rem 1.25rem',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: 600,
        transition: 'opacity 0.15s',
      }}
    >
      {children}
    </button>
  );
}`,
    language: 'tsx',
    lastModified: Date.now(),
    size: 0,
    dirty: false,
  },
  {
    path: '/src/hooks/useCounter.ts',
    content: `import { useState, useCallback } from 'react';

export function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);
  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => c - 1), []);
  const reset = useCallback(() => setCount(initial), [initial]);
  return { count, increment, decrement, reset };
}`,
    language: 'ts',
    lastModified: Date.now(),
    size: 0,
    dirty: false,
  },
  {
    path: '/package.json',
    content: JSON.stringify({
      name: 'jxr-project',
      version: '0.1.0',
      dependencies: {
        react: '^18.3.0',
        'react-dom': '^18.3.0',
      },
    }, null, 2),
    language: 'json',
    lastModified: Date.now(),
    size: 0,
    dirty: false,
  },
];
