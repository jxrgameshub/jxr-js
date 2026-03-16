/**
 * JXR.js — Documentation Page
 * LavaFlow OS Design System
 * Powered by JXR Studios × DamascusAI
 */

import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import {
  Zap, Terminal, Package, GitBranch, Shield, Cpu,
  Activity, ChevronRight, Copy, Check,
  BookOpen, Code2, Layers, Globe, ArrowLeft,
} from 'lucide-react';

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="absolute top-3 right-3 p-1.5 rounded transition-all"
      style={{ color: '#4b5563', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      title="Copy"
    >
      {copied ? <Check size={13} style={{ color: '#22c55e' }} /> : <Copy size={13} />}
    </button>
  );
}

// ─── Syntax highlighter ──────────────────────────────────────────────────────

type Token = { text: string; color: string };

function tokenizeBash(code: string): Token[][] {
  return code.split('\n').map((line) => {
    const tokens: Token[] = [];
    // Comment lines
    if (/^\s*#/.test(line)) {
      tokens.push({ text: line, color: '#6b7280' });
      return tokens;
    }
    // Prompt line: $ command [args]
    const promptMatch = line.match(/^(\$\s*)(.+)$/);
    if (promptMatch) {
      tokens.push({ text: promptMatch[1], color: '#4b5563' });
      const rest = promptMatch[2];
      // Split into cmd + args
      const parts = rest.split(/(?<=^\S+)\s+/);
      const cmd = parts[0];
      const args = parts.slice(1).join(' ');
      // Highlight flags (--foo), strings, and scoped packages
      const cmdTokens: Token[] = [];
      cmdTokens.push({ text: cmd, color: '#f97316' });
      if (args) {
        const argParts = args.split(/((?:@[\w-]+\/[\w-]+)|(?:--[\w-]+)|(?:'[^']*')|(?:"[^"]*"))/g);
        argParts.forEach((p) => {
          if (!p) return;
          if (p.startsWith('--')) cmdTokens.push({ text: ' ' + p, color: '#22c55e' });
          else if (p.startsWith('@') || p.startsWith('\'') || p.startsWith('"')) cmdTokens.push({ text: ' ' + p, color: '#f97316' });
          else cmdTokens.push({ text: ' ' + p, color: '#d1d5db' });
        });
      }
      tokens.push(...cmdTokens);
      return tokens;
    }
    // Output / plain lines
    if (/^→|^✓|^✗/.test(line.trim())) {
      tokens.push({ text: line, color: '#22c55e' });
    } else if (/^#/.test(line.trim())) {
      tokens.push({ text: line, color: '#6b7280' });
    } else {
      // Flags inline
      const flagParts = line.split(/(--[\w-]+(?:\s+<[^>]+>)?)/g);
      flagParts.forEach((p) => {
        if (!p) return;
        if (p.startsWith('--')) tokens.push({ text: p, color: '#22c55e' });
        else tokens.push({ text: p, color: '#9ca3af' });
      });
    }
    return tokens;
  });
}

function tokenizeTS(code: string): Token[][] {
  const KEYWORDS = /\b(import|export|from|default|const|let|var|function|return|type|interface|extends|implements|class|new|if|else|for|while|async|await|true|false|null|undefined)\b/g;
  const STRINGS = /('[^']*'|"[^"]*"|`[^`]*`)/g;
  const COMMENTS = /(\/\/[^\n]*)/g;
  const NUMBERS = /\b(\d+(\.\d+)?)\b/g;
  const TYPES = /\b([A-Z][A-Za-z0-9_]*)\b/g;
  return code.split('\n').map((line) => {
    // Simple single-pass tokenizer
    const tokens: Token[] = [];
    let remaining = line;
    // Comment
    const commentIdx = remaining.indexOf('//');
    let commentSuffix = '';
    if (commentIdx !== -1) {
      commentSuffix = remaining.slice(commentIdx);
      remaining = remaining.slice(0, commentIdx);
    }
    // Tokenize remaining by strings first
    const parts = remaining.split(/((?:'[^']*')|(?:"[^"]*")|(?:`[^`]*`))/g);
    parts.forEach((p) => {
      if (!p) return;
      if ((p.startsWith("'") || p.startsWith('"') || p.startsWith('`')) && p.length > 1) {
        tokens.push({ text: p, color: '#22c55e' });
      } else {
        // Keywords, types, numbers in non-string segments
        const sub = p.split(/(\b(?:import|export|from|default|const|let|var|function|return|type|interface|extends|implements|class|new|if|else|for|while|async|await|true|false|null|undefined)\b)/g);
        sub.forEach((s) => {
          if (!s) return;
          if (/^(import|export|from|default|const|let|var|function|return|type|interface|extends|implements|class|new|if|else|for|while|async|await|true|false|null|undefined)$/.test(s)) {
            tokens.push({ text: s, color: '#ea580c' });
          } else if (/^[A-Z][A-Za-z0-9_]*$/.test(s.trim())) {
            tokens.push({ text: s, color: '#f97316' });
          } else if (/^\d+(\.\d+)?$/.test(s.trim())) {
            tokens.push({ text: s, color: '#22c55e' });
          } else {
            tokens.push({ text: s, color: '#d1d5db' });
          }
        });
      }
    });
    if (commentSuffix) tokens.push({ text: commentSuffix, color: '#6b7280' });
    return tokens;
  });
}

function tokenizeJSON(code: string): Token[][] {
  return code.split('\n').map((line) => {
    const tokens: Token[] = [];
    const parts = line.split(/("[^"]*")/g);
    parts.forEach((p, i) => {
      if (!p) return;
      if (p.startsWith('"')) {
        // Key vs value: keys are followed by ':'
        const after = parts[i + 1] || '';
        if (after.trimStart().startsWith(':')) {
          tokens.push({ text: p, color: '#9ca3af' });
        } else {
          tokens.push({ text: p, color: '#22c55e' });
        }
      } else {
        // Numbers, booleans, punctuation
        const sub = p.split(/(\b(?:true|false|null)\b|\b\d+\b)/g);
        sub.forEach((s) => {
          if (!s) return;
          if (/^(true|false|null)$/.test(s)) tokens.push({ text: s, color: '#f97316' });
          else if (/^\d+$/.test(s)) tokens.push({ text: s, color: '#22c55e' });
          else tokens.push({ text: s, color: '#4b5563' });
        });
      }
    });
    return tokens;
  });
}

function tokenizeTree(code: string): Token[][] {
  return code.split('\n').map((line) => {
    const tokens: Token[] = [];
    const commentMatch = line.match(/^(.+?)(#.+)$/);
    if (commentMatch) {
      tokens.push({ text: commentMatch[1], color: '#d1d5db' });
      tokens.push({ text: commentMatch[2], color: '#6b7280' });
    } else if (/\.ts$|\.tsx$|\.js$|\.jsx$|\.json$|\.css$|\.html$/.test(line)) {
      tokens.push({ text: line, color: '#f97316' });
    } else if (/\/\s*$/.test(line.trim()) || /^[\w-]+\/$/.test(line.trim().replace(/[├└─│ ]/g, ''))) {
      tokens.push({ text: line, color: '#22c55e' });
    } else {
      tokens.push({ text: line, color: '#d1d5db' });
    }
    return tokens;
  });
}

function SyntaxLine({ tokens }: { tokens: Token[] }) {
  return (
    <div style={{ minHeight: '1.4em' }}>
      {tokens.map((t, i) => (
        <span key={i} style={{ color: t.color }}>{t.text}</span>
      ))}
    </div>
  );
}

function CodeBlock({ children, lang = '' }: { children: string; lang?: string }) {
  const lines = useMemo(() => {
    if (lang === 'bash') return tokenizeBash(children);
    if (lang === 'typescript' || lang === 'ts') return tokenizeTS(children);
    if (lang === 'json') return tokenizeJSON(children);
    if (lang === 'tree') return tokenizeTree(children);
    // Plain fallback
    return children.split('\n').map((l) => [{ text: l, color: '#d1d5db' }] as Token[]);
  }, [children, lang]);

  const langLabels: Record<string, string> = {
    bash: 'bash', typescript: 'typescript', ts: 'typescript',
    json: 'json', tree: 'tree', '': 'plain',
  };

  return (
    <div className="terminal-chrome relative my-5">
      <div className="terminal-header">
        <div className="terminal-dot" style={{ background: '#ff5f57' }} />
        <div className="terminal-dot" style={{ background: '#febc2e' }} />
        <div className="terminal-dot" style={{ background: '#28c840' }} />
        {lang && (
          <span className="terminal-label" style={{ marginLeft: 'auto', color: '#4b5563', fontSize: '0.68rem', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em' }}>
            {langLabels[lang] ?? lang}
          </span>
        )}
      </div>
      <div className="terminal-body relative">
        <CopyBtn text={children} />
        <pre style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.85, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'JetBrains Mono' }}>
          {lines.map((lineTokens: Token[], i: number) => (
            <SyntaxLine key={i} tokens={lineTokens} />
          ))}
        </pre>
      </div>
    </div>
  );
}

// ─── Sidebar nav ─────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    title: 'Getting Started',
    items: [
      { id: 'introduction', label: 'Introduction', icon: BookOpen },
      { id: 'installation', label: 'Installation', icon: Package },
      { id: 'quick-start', label: 'Quick Start', icon: Zap },
    ],
  },
  {
    title: 'CLI',
    items: [
      { id: 'cli', label: 'CLI Reference', icon: Terminal },
      { id: 'init', label: 'jxr init', icon: Layers },
      { id: 'dev', label: 'jxr dev', icon: Activity },
      { id: 'build', label: 'jxr build', icon: Code2 },
      { id: 'migrate', label: 'jxr migrate', icon: GitBranch },
      { id: 'deploy', label: 'jxr deploy', icon: Globe },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { id: 'config', label: 'jxr.config.ts', icon: Code2 },
      { id: 'workers', label: 'Worker Pool', icon: Cpu },
      { id: 'moq', label: 'MoQ Transport', icon: Activity },
      { id: 'crypto', label: 'Web Crypto', icon: Shield },
    ],
  },
  {
    title: 'MCP Server',
    items: [
      { id: 'mcp', label: 'MCP Overview', icon: Package },
      { id: 'mcp-tools', label: 'Tool Reference', icon: Code2 },
    ],
  },
];

// ─── Doc content ──────────────────────────────────────────────────────────────

const DOC_CONTENT: Record<string, React.ReactNode> = {
  introduction: (
    <div>
      <h1 style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.1 }}>
        Introduction to <span style={{ color: '#f97316' }}>JXR.js</span>
      </h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1.5rem', fontSize: '1.05rem' }}>
        JXR.js is a next-generation build framework and edge runtime for React Native and React projects.
        It is designed to be used in any IDE — VSCode, Warp, Cursor, or any terminal — and provides
        a Model Context Protocol (MCP) server so AI agents can manage your entire project lifecycle.
      </p>
      <div className="grid md:grid-cols-3 gap-3 my-6">
        {[
          { icon: Cpu, color: '#ea580c', title: 'Worker Pools', desc: 'Pre-warmed worker_threads for parallel builds and transforms' },
          { icon: Activity, color: '#22c55e', title: 'MoQ Transport', desc: 'Media over QUIC for sub-RTT module streaming and HMR' },
          { icon: Shield, color: '#ea580c', title: 'Web Crypto', desc: 'AES-GCM-256 module caching and ECDSA manifest signing' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="jxr-card">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${item.color}18`, border: `1px solid ${item.color}30` }}>
                <Icon size={15} style={{ color: item.color }} />
              </div>
              <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '0.9rem', color: '#ffffff', marginBottom: '0.35rem' }}>{item.title}</h3>
              <p style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.55 }}>{item.desc}</p>
            </div>
          );
        })}
      </div>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', letterSpacing: '-0.01em', marginTop: '2rem', marginBottom: '0.75rem' }}>Why JXR?</h2>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1rem' }}>
        Existing frameworks like Next.js, Vite, and Bun are excellent tools, but they were not designed
        with edge-first, AI-native, or MoQ-based workflows in mind. JXR fills this gap by providing
        a framework that is simultaneously a CLI tool, a build engine, and an MCP server.
      </p>
      <p style={{ color: '#9ca3af', lineHeight: 1.7 }}>
        JXR is powered by <strong style={{ color: '#f97316' }}>JXR Studios</strong> and{' '}
        <strong style={{ color: '#22c55e' }}>DamascusAI</strong>.
        It is the future of edge cloud OS deployments for developers who want to take their game to the next level.
      </p>
    </div>
  ),

  installation: (
    <div>
      <h1 style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.1 }}>Installation</h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1rem' }}>
        Install the JXR CLI globally using your preferred package manager.
      </p>
      <CodeBlock lang="bash">{`# npm
npm install -g @jxrstudios/jxr

# pnpm
pnpm add -g @jxrstudios/jxr

# yarn
yarn global add @jxrstudios/jxr

# bun
bun add -g @jxrstudios/jxr`}</CodeBlock>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '0.75rem' }}>Verify the installation:</p>
      <CodeBlock lang="bash">{`jxr --version
# JXR.js v1.0.0-edge

jxr info
# Prints full environment and project info`}</CodeBlock>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>Requirements</h2>
      <div className="jxr-card">
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Node.js', '≥ 20.0.0'],
            ['npm / pnpm / yarn / bun', 'Any version'],
            ['TypeScript', '≥ 5.0 (optional)'],
            ['Platform', 'macOS, Linux, Windows'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{k}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#f97316' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),

  'quick-start': (
    <div>
      <h1 style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.1 }}>Quick Start</h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1rem' }}>Get a JXR project running in under 60 seconds.</p>
      <CodeBlock lang="bash">{`# 1. Create a new project
jxr init my-app

# 2. Enter the project directory
cd my-app

# 3. Start the dev server
jxr dev
# → Local: http://localhost:3000`}</CodeBlock>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '0.75rem' }}>
        The interactive <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85em', color: '#f97316', background: 'rgba(234,88,12,0.1)', padding: '1px 5px', borderRadius: '4px' }}>jxr init</code> prompt
        will ask for your project name, template, and package manager. You can also pass flags directly:
      </p>
      <CodeBlock lang="bash">{`jxr init my-app --template react-native --package-manager pnpm
jxr init my-worker --template cloudflare
jxr init my-expo-app --template expo`}</CodeBlock>
    </div>
  ),

  cli: (
    <div>
      <h1 style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.1 }}>CLI Reference</h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1.25rem' }}>
        The <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85em', color: '#f97316', background: 'rgba(234,88,12,0.1)', padding: '1px 5px', borderRadius: '4px' }}>jxr</code> CLI is the primary interface for JXR.js.
        It works in any terminal — VSCode integrated terminal, Warp, Cursor, iTerm, Windows Terminal, or any shell.
      </p>
      {[
        { cmd: 'jxr init [name]', desc: 'Scaffold a new JXR project', flags: ['--template react-web|react-native|expo|cloudflare', '--platform web|native|expo|cloudflare-worker|deno|node', '--package-manager npm|yarn|pnpm|bun', '--no-install', '--no-git'] },
        { cmd: 'jxr dev', desc: 'Start the development server', flags: ['--port <port>', '--host <host>', '--open', '--https', '--no-hmr', '--config <path>'] },
        { cmd: 'jxr build', desc: 'Production build', flags: ['--platform <platform>', '--out-dir <dir>', '--no-minify', '--no-sourcemap', '--analyze', '--config <path>'] },
        { cmd: 'jxr migrate', desc: 'Migrate from another framework', flags: ['--from nextjs|vite|bun|cra|expo|remix|nuxt|auto', '--dry-run', '--no-backup', '--config <path>'] },
        { cmd: 'jxr deploy', desc: 'Deploy to an edge platform', flags: ['--target cloudflare|deno|node|vercel', '--env production|preview|staging', '--no-build', '--config <path>'] },
        { cmd: 'jxr add <plugin>', desc: 'Add a JXR plugin', flags: ['--dev'] },
        { cmd: 'jxr info', desc: 'Print environment and project info', flags: [] },
      ].map((item) => (
        <div key={item.cmd} className="jxr-card mb-3">
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.88rem', color: '#f97316', fontWeight: 700, marginBottom: '0.35rem' }}>{item.cmd}</div>
          <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: item.flags.length ? '0.75rem' : 0 }}>{item.desc}</div>
          {item.flags.length > 0 && (
            <div className="space-y-1">
              {item.flags.map((f) => (
                <div key={f} style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', color: '#374151' }}>&nbsp;&nbsp;{f}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  ),

  config: (
    <div>
      <h1 style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.1 }}>jxr.config.ts</h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1rem' }}>
        The JXR configuration file is a TypeScript file at the root of your project.
        It is fully typed via <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85em', color: '#f97316', background: 'rgba(234,88,12,0.1)', padding: '1px 5px', borderRadius: '4px' }}>defineConfig</code> from <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85em', color: '#f97316', background: 'rgba(234,88,12,0.1)', padding: '1px 5px', borderRadius: '4px' }}>@jxrstudios/core</code>.
      </p>
      <CodeBlock lang="typescript">{`import { defineConfig } from '@jxrstudios/core';

export default defineConfig({
  name: 'my-app',
  platform: 'web',  // 'web' | 'native' | 'expo' | 'cloudflare-worker' | 'deno' | 'node'

  workers: {
    size: 4,              // Number of worker threads
    enablePriority: true, // Enable priority queue
    maxQueueSize: 1000,   // Max pending tasks
  },

  moq: {
    enabled: true,
    relayUrl: 'wss://relay.jxr.dev',  // Optional: MoQ relay server
  },

  crypto: {
    enabled: true,
    algorithm: 'AES-GCM',  // 'AES-GCM' | 'AES-CBC'
    signing: true,          // ECDSA P-256 manifest signing
    keyDerivation: 'HKDF',
  },

  build: {
    entry: 'src/main.tsx',
    outDir: 'dist',
    minify: true,
    sourcemap: true,
    splitting: 'auto',  // 'auto' | 'manual' | false
    target: ['es2022'],
    external: [],
  },

  devServer: {
    port: 3000,
    host: 'localhost',
    hmr: true,
    open: false,
    https: false,
  },

  plugins: [],  // JXR plugins
});`}</CodeBlock>
    </div>
  ),

  mcp: (
    <div>
      <h1 style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.1 }}>MCP Server</h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1.25rem' }}>
        The JXR MCP server (<code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85em', color: '#f97316', background: 'rgba(234,88,12,0.1)', padding: '1px 5px', borderRadius: '4px' }}>@jxrstudios/mcp</code>) implements the
        Model Context Protocol, allowing AI agents like Claude, Cursor, and GitHub Copilot to manage
        JXR projects autonomously — initializing, building, migrating, and deploying without leaving the chat.
      </p>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>Setup</h2>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '0.75rem' }}>Add to your MCP client configuration:</p>
      <CodeBlock lang="json">{`// Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json
// Cursor: .cursor/mcp.json
// Any MCP client: see client docs

{
  "mcpServers": {
    "jxrstudios": {
      "command": "npx",
      "args": ["-y", "@jxrstudios/mcp"]
    }
  }
}`}</CodeBlock>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>Example AI Prompts</h2>
      <div className="space-y-2">
        {[
          'Create a new JXR React Native project called "my-app" and start the dev server',
          'Migrate this Next.js project to JXR, then build it for Cloudflare Workers',
          'Add the Tailwind plugin to this JXR project and update the config',
          'Deploy this JXR project to Cloudflare Workers in production mode',
        ].map((prompt) => (
          <div key={prompt} className="jxr-card flex items-start gap-3 py-3">
            <ChevronRight size={14} style={{ color: '#ea580c', marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', fontStyle: 'italic' }}>"{prompt}"</p>
          </div>
        ))}
      </div>
    </div>
  ),

  migrate: (
    <div>
      <h1 style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.1 }}>Migration Guide</h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1rem' }}>
        JXR can migrate projects from Next.js, Vite, Bun, Create React App, Expo, Remix, and Nuxt.
        The migration engine performs AST-level transforms and creates a full backup before touching any files.
      </p>
      <CodeBlock lang="bash">{`# Auto-detect and migrate
jxr migrate

# Specify source framework
jxr migrate --from nextjs
jxr migrate --from vite
jxr migrate --from bun
jxr migrate --from cra
jxr migrate --from expo

# Preview changes without writing
jxr migrate --dry-run

# Skip backup (not recommended)
jxr migrate --no-backup`}</CodeBlock>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>What gets migrated</h2>
      <div className="grid md:grid-cols-2 gap-3">
        {[
          { from: 'next.config.js', to: 'jxr.config.ts' },
          { from: 'vite.config.ts', to: 'jxr.config.ts' },
          { from: 'next/image', to: '@jxrstudios/runtime/image' },
          { from: 'next/link', to: '@jxrstudios/runtime/link' },
          { from: 'next/router', to: '@jxrstudios/runtime/router' },
          { from: 'react-scripts', to: 'jxr (CLI)' },
          { from: 'REACT_APP_*', to: 'VITE_* (import.meta.env)' },
          { from: 'pages/api/*', to: 'JXR edge handlers' },
        ].map((item) => (
          <div key={item.from} className="flex items-center gap-3 p-2.5 rounded" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.05)' }}>
            <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#4b5563', textDecoration: 'line-through' }}>{item.from}</code>
            <ChevronRight size={11} style={{ color: '#ea580c', flexShrink: 0 }} />
            <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#f97316' }}>{item.to}</code>
          </div>
        ))}
      </div>
    </div>
  ),

  init: (
    <div>
      <h1 style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.1 }}>jxr init</h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1rem' }}>
        Scaffold a new JXR project interactively or via flags. Supports React (web), React Native, Expo, and Cloudflare Worker templates.
      </p>
      <CodeBlock lang="bash">{`# Interactive scaffold
jxr init my-app

# With flags
jxr init my-app --template react-native --package-manager pnpm
jxr init my-worker --template cloudflare
jxr init my-expo-app --template expo --no-git`}</CodeBlock>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>Flags</h2>
      <div className="space-y-2">
        {[
          ['--template', 'react-web | react-native | expo | cloudflare', 'Project template'],
          ['--platform', 'web | native | expo | cloudflare-worker | deno | node', 'Target platform'],
          ['--package-manager', 'npm | yarn | pnpm | bun', 'Package manager to use'],
          ['--no-install', '', 'Skip dependency installation'],
          ['--no-git', '', 'Skip git repository initialization'],
        ].map(([flag, values, desc]) => (
          <div key={flag} className="jxr-card py-3">
            <div className="flex items-start gap-3">
              <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#f97316', flexShrink: 0 }}>{flag}</code>
              {values && <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#4b5563' }}>{values}</code>}
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>{desc}</p>
          </div>
        ))}
      </div>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>Generated structure</h2>
      <CodeBlock lang="tree">{`my-app/
├── jxr.config.ts       # JXR configuration
├── src/
│   ├── main.tsx        # Entry point
│   ├── App.tsx         # Root component
│   └── components/
├── public/
├── package.json
└── tsconfig.json`}</CodeBlock>
    </div>
  ),

  dev: (
    <div>
      <h1 style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.1 }}>jxr dev</h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1rem' }}>
        Start the JXR development server with Hot Module Replacement (HMR), Worker pool pre-warming, and MoQ transport initialization.
        No build step is required — modules are served directly from the virtual file system.
      </p>
      <CodeBlock lang="bash">{`# Start on default port 3000
jxr dev

# Custom port and host
jxr dev --port 8080 --host 0.0.0.0

# Open browser automatically
jxr dev --open

# HTTPS with self-signed cert
jxr dev --https`}</CodeBlock>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>What happens on start</h2>
      <div className="space-y-2">
        {[
          { step: '1', label: 'Worker pool pre-warm', desc: 'Spawns worker_threads up to hardware concurrency. Subsequent builds use the warm pool with zero startup cost.' },
          { step: '2', label: 'MoQ transport init', desc: 'Initializes the Media over QUIC transport layer. If a relay URL is configured, connects and subscribes to the project track.' },
          { step: '3', label: 'Web Crypto engine', desc: 'Derives the session key via HKDF and initializes the AES-GCM module cache. All served modules are integrity-checked.' },
          { step: '4', label: 'File watcher', desc: 'Watches src/ for changes. On change, the module is transformed in a Worker and pushed to connected clients via HMR.' },
        ].map((item) => (
          <div key={item.step} className="jxr-card flex gap-4">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(234,88,12,0.12)', border: '1px solid rgba(234,88,12,0.25)' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: '#f97316', fontWeight: 700 }}>{item.step}</span>
            </div>
            <div>
              <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '0.88rem', color: '#ffffff', marginBottom: '0.25rem' }}>{item.label}</div>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.55 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>Flags</h2>
      <CodeBlock lang="bash">{`--port <port>     # Dev server port (default: 3000)
--host <host>     # Dev server host (default: localhost)
--open            # Open browser on start
--https           # Enable HTTPS
--no-hmr          # Disable Hot Module Replacement
--config <path>   # Path to jxr.config.ts`}</CodeBlock>
    </div>
  ),

  build: (
    <div>
      <h1 style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.1 }}>jxr build</h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1rem' }}>
        Produce a production-optimized build. The JXR build engine uses esbuild under the hood with Worker-parallel transforms,
        automatic code splitting, and a cryptographically signed build manifest.
      </p>
      <CodeBlock lang="bash">{`# Standard production build
jxr build

# Target a specific platform
jxr build --platform cloudflare-worker
jxr build --platform deno
jxr build --platform node

# Analyze bundle
jxr build --analyze

# Skip minification (for debugging)
jxr build --no-minify`}</CodeBlock>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>Build outputs</h2>
      <CodeBlock lang="tree">{`dist/
├── assets/
│   ├── index-[hash].js     # Main bundle
│   ├── vendor-[hash].js    # Vendor chunk
│   └── *.css
├── index.html
└── jxr-manifest.json       # Crypto-signed build manifest`}</CodeBlock>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>Build manifest</h2>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '0.75rem' }}>
        Every JXR build produces a <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85em', color: '#f97316', background: 'rgba(234,88,12,0.1)', padding: '1px 5px', borderRadius: '4px' }}>jxr-manifest.json</code> file
        signed with ECDSA P-256. The runtime verifies this signature before serving any module.
      </p>
      <CodeBlock lang="json">{`{
  "version": "1.0.0",
  "platform": "web",
  "buildTime": "2026-03-13T00:00:00Z",
  "entries": {
    "main": "assets/index-abc123.js",
    "vendor": "assets/vendor-def456.js"
  },
  "signature": "MEQCIBx...",
  "algorithm": "ECDSA-P256"
}`}</CodeBlock>
    </div>
  ),

  deploy: (
    <div>
      <h1 style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.1 }}>jxr deploy</h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1rem' }}>
        Deploy your JXR project to Cloudflare Workers, Deno Deploy, or a Node.js server. JXR automatically
        selects the correct adapter and builds for the target platform.
      </p>
      <CodeBlock lang="bash">{`# Deploy to Cloudflare Workers
jxr deploy --target cloudflare

# Deploy to Deno Deploy
jxr deploy --target deno

# Deploy to Node.js (Docker / VPS)
jxr deploy --target node

# Deploy to preview environment
jxr deploy --target cloudflare --env preview

# Skip build step (use existing dist/)
jxr deploy --target cloudflare --no-build`}</CodeBlock>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>Platform requirements</h2>
      <div className="space-y-2">
        {[
          { target: 'cloudflare', req: 'wrangler CLI installed and authenticated (npx wrangler login)', color: '#f97316' },
          { target: 'deno', req: 'Deno CLI installed and DENO_DEPLOY_TOKEN set in environment', color: '#22c55e' },
          { target: 'node', req: 'Node.js ≥ 20 on target server, SSH access or CI pipeline configured', color: '#9ca3af' },
        ].map((item) => (
          <div key={item.target} className="jxr-card flex items-start gap-3">
            <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: item.color, flexShrink: 0, minWidth: '90px' }}>{item.target}</code>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.55 }}>{item.req}</p>
          </div>
        ))}
      </div>
    </div>
  ),

  workers: (
    <div>
      <h1 style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.1 }}>Worker Pool</h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1rem' }}>
        The JXR Worker Pool engine manages a fleet of Node.js <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85em', color: '#f97316', background: 'rgba(234,88,12,0.1)', padding: '1px 5px', borderRadius: '4px' }}>worker_threads</code> that
        are pre-warmed at startup. All CPU-intensive operations — JSX transforms, crypto ops, module resolution — run off the main thread.
      </p>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>Configuration</h2>
      <CodeBlock lang="typescript">{`// jxr.config.ts
export default defineConfig({
  workers: {
    size: 8,               // Worker thread count (default: os.cpus().length)
    enablePriority: true,  // Priority queue for task scheduling
    maxQueueSize: 1000,    // Max pending tasks before backpressure
    taskTimeout: 30000,    // Task timeout in ms (default: 30s)
  },
});`}</CodeBlock>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>How it works</h2>
      <div className="space-y-2">
        {[
          { title: 'Pre-warming', desc: 'Workers are spawned at dev server start or build init. The first task has zero cold-start cost because the pool is already live.' },
          { title: 'Priority queue', desc: 'Tasks are enqueued with a priority level (high / normal / low). HMR updates are always high priority; background cache writes are low.' },
          { title: 'Backpressure', desc: 'When the queue exceeds maxQueueSize, new tasks are rejected with a JXRWorkerPoolError. The caller should retry with exponential backoff.' },
          { title: 'Auto-scaling', desc: 'The pool monitors queue depth and worker utilization. Under sustained load it will spawn additional workers up to 2× the configured size.' },
        ].map((item) => (
          <div key={item.title} className="jxr-card">
            <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '0.88rem', color: '#ea580c', marginBottom: '0.3rem' }}>{item.title}</div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.55 }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  ),

  moq: (
    <div>
      <h1 style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.1 }}>MoQ Transport</h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1rem' }}>
        JXR implements Media over QUIC (MoQ) transport semantics for sub-RTT module streaming and HMR delivery.
        The track/object/subscription model means module updates are pushed to the browser before the file is even saved to disk.
      </p>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>Configuration</h2>
      <CodeBlock lang="typescript">{`// jxr.config.ts
export default defineConfig({
  moq: {
    enabled: true,
    relayUrl: 'wss://relay.jxr.dev',  // Optional MoQ relay
    trackPriority: 'high',             // 'high' | 'normal' | 'low'
    maxSubscriptions: 100,
    reconnectDelay: 1000,              // ms before reconnect attempt
  },
});`}</CodeBlock>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>Core concepts</h2>
      <div className="space-y-2">
        {[
          { term: 'Track', desc: 'A named stream of related objects. JXR creates one track per project (e.g. jxr/my-app/modules). Subscribers receive all objects on the track.' },
          { term: 'Object', desc: 'A single versioned payload on a track — typically a transformed module. Objects are immutable and content-addressed by their crypto hash.' },
          { term: 'Subscription', desc: 'A client subscribes to a track and receives new objects in real time. The browser HMR client subscribes to the project track on connect.' },
          { term: 'Relay', desc: 'An optional server that fans out track objects to multiple subscribers. Without a relay, JXR falls back to WebSocket-based HMR.' },
        ].map((item) => (
          <div key={item.term} className="jxr-card">
            <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: '#22c55e', fontWeight: 700 }}>{item.term}</code>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.55, marginTop: '0.3rem' }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  ),

  crypto: (
    <div>
      <h1 style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.1 }}>Web Crypto</h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1rem' }}>
        The JXR crypto engine is built entirely on the W3C Web Crypto API (<code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85em', color: '#f97316', background: 'rgba(234,88,12,0.1)', padding: '1px 5px', borderRadius: '4px' }}>SubtleCrypto</code>).
        It has zero native dependencies and runs identically in Node.js, Deno, Cloudflare Workers, and the browser.
      </p>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>Configuration</h2>
      <CodeBlock lang="typescript">{`// jxr.config.ts
export default defineConfig({
  crypto: {
    enabled: true,
    algorithm: 'AES-GCM',   // 'AES-GCM' | 'AES-CBC'
    keySize: 256,            // Key size in bits
    signing: true,           // ECDSA P-256 manifest signing
    keyDerivation: 'HKDF',  // Key derivation function
  },
});`}</CodeBlock>
      <h2 style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginTop: '2rem', marginBottom: '0.75rem' }}>Primitives</h2>
      <div className="space-y-2">
        {[
          { name: 'AES-GCM-256', use: 'Module cache encryption', detail: 'Each cached module is encrypted with a unique IV. The key is derived from the project secret via HKDF.' },
          { name: 'ECDSA P-256', use: 'Build manifest signing', detail: 'The build manifest is signed with an ECDSA P-256 private key. The runtime verifies the signature before serving any module.' },
          { name: 'HKDF', use: 'Key derivation', detail: 'Session and cache keys are derived from a master secret using HKDF with SHA-256. Each project gets a unique derived key.' },
          { name: 'SHA-256', use: 'Content addressing', detail: 'Every module object is content-addressed by its SHA-256 hash. This enables deterministic caching and integrity verification.' },
        ].map((item) => (
          <div key={item.name} className="jxr-card">
            <div className="flex items-center justify-between mb-1">
              <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: '#f97316', fontWeight: 700 }}>{item.name}</code>
              <span style={{ fontSize: '0.72rem', color: '#22c55e', fontFamily: 'JetBrains Mono' }}>{item.use}</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.55 }}>{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  ),

  'mcp-tools': (
    <div>
      <h1 style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '1rem', lineHeight: 1.1 }}>MCP Tool Reference</h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.7, marginBottom: '1.25rem' }}>
        The JXR MCP server exposes 14 tools over the Model Context Protocol. Each tool accepts a JSON input object
        and returns a structured result. Tools can be called by any MCP-compatible AI agent.
      </p>
      <div className="space-y-3">
        {[
          { name: 'jxr_init', input: '{ name, template?, platform?, packageManager? }', output: 'Project scaffold path and generated files list', desc: 'Scaffold a new JXR project in the specified directory.' },
          { name: 'jxr_dev', input: '{ projectPath, port?, open? }', output: 'Dev server URL and PID', desc: 'Start the JXR dev server with HMR and MoQ transport.' },
          { name: 'jxr_build', input: '{ projectPath, platform?, analyze? }', output: 'Build stats, output files, and manifest path', desc: 'Run a production build and return the signed manifest.' },
          { name: 'jxr_migrate', input: '{ projectPath, from?, dryRun? }', output: 'Migration report with changed files and backup path', desc: 'Migrate a project from another framework to JXR.' },
          { name: 'jxr_deploy', input: '{ projectPath, target, env? }', output: 'Deployment URL and platform response', desc: 'Deploy to Cloudflare Workers, Deno Deploy, or Node.js.' },
          { name: 'jxr_detect_framework', input: '{ projectPath }', output: 'Detected framework name and confidence score', desc: 'Auto-detect the source framework of an existing project.' },
          { name: 'jxr_read_config', input: '{ projectPath }', output: 'Parsed jxr.config.ts as a JSON object', desc: 'Read and parse the JXR configuration file.' },
          { name: 'jxr_write_config', input: '{ projectPath, config }', output: 'Updated config file path', desc: 'Write or update the jxr.config.ts file.' },
          { name: 'jxr_list_files', input: '{ projectPath, pattern? }', output: 'File tree as a nested JSON object', desc: 'List all files in the project directory.' },
          { name: 'jxr_read_file', input: '{ projectPath, filePath }', output: 'File contents as a string', desc: 'Read the contents of any file in the project.' },
          { name: 'jxr_write_file', input: '{ projectPath, filePath, content }', output: 'Written file path', desc: 'Write or create a file in the project.' },
          { name: 'jxr_add_plugin', input: '{ projectPath, plugin }', output: 'Updated package.json and config', desc: 'Add a JXR plugin and update the config.' },
          { name: 'jxr_run_command', input: '{ projectPath, command }', output: 'stdout, stderr, and exit code', desc: 'Run an arbitrary shell command inside the project directory.' },
          { name: 'jxr_info', input: '{ projectPath? }', output: 'Full environment and project metadata', desc: 'Get JXR version, Node version, platform, and project info.' },
        ].map((tool) => (
          <div key={tool.name} className="jxr-card">
            <div className="flex items-center gap-2 mb-2">
              <Code2 size={13} style={{ color: '#22c55e', flexShrink: 0 }} />
              <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem', color: '#22c55e', fontWeight: 700 }}>{tool.name}</code>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#9ca3af', marginBottom: '0.75rem', lineHeight: 1.55 }}>{tool.desc}</p>
            <div className="grid grid-cols-1 gap-1.5">
              <div className="flex items-start gap-2">
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: '#4b5563', flexShrink: 0, marginTop: '1px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Input</span>
                <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', color: '#6b7280' }}>{tool.input}</code>
              </div>
              <div className="flex items-start gap-2">
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: '#4b5563', flexShrink: 0, marginTop: '1px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Output</span>
                <code style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', color: '#f97316' }}>{tool.output}</code>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('introduction');
  const content = DOC_CONTENT[activeSection] ?? DOC_CONTENT['introduction'];

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 no-underline" style={{ color: '#6b7280' }}>
              <ArrowLeft size={14} />
              <span style={{ fontSize: '0.85rem' }}>Back</span>
            </Link>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.08)' }} />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#ea580c' }}>
                <Zap size={11} color="#ffffff" strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: 'Inter', fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>JXR.js</span>
              <span style={{ color: '#374151', fontSize: '0.85rem' }}>/</span>
              <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>docs</span>
            </div>
          </div>
          <div className="badge-lava hidden sm:flex items-center gap-1.5">
            <span className="live-dot" style={{ width: '6px', height: '6px' }} />
            v1.0.0-edge
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden md:block flex-shrink-0" style={{ width: '220px', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem 0', position: 'sticky', top: '56px', height: 'calc(100vh - 56px)', overflowY: 'auto' }}>
          {NAV_SECTIONS.map((group) => (
            <div key={group.title} className="mb-5">
              <div style={{ padding: '0 1.25rem', marginBottom: '0.4rem', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#374151', fontFamily: 'JetBrains Mono' }}>
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 transition-all"
                    style={{
                      background: activeSection === item.id ? 'rgba(234,88,12,0.08)' : 'transparent',
                      color: activeSection === item.id ? '#f97316' : '#6b7280',
                      borderLeft: activeSection === item.id ? '2px solid #ea580c' : '2px solid transparent',
                      fontFamily: 'Inter',
                      fontSize: '0.84rem',
                    }}
                  >
                    <Icon size={13} style={{ flexShrink: 0 }} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 p-8 md:p-12" style={{ maxWidth: '760px' }}>
          {content}
          <div className="mt-12 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <a href="https://github.com/jxrstudios/jxr" target="_blank" rel="noopener noreferrer" className="btn-lava no-underline inline-flex">
              View source on GitHub <ChevronRight size={14} />
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
