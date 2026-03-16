/**
 * JXR.js — Marketing Homepage
 * Brand: LavaFlow Streams design language
 * Pure black · Saturated orange #ea580c · Neon green #22c55e · Inter font
 * Powered by JXR Studios × DamascusAI
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { motion, useInView } from 'framer-motion';
import {
  Zap, Terminal, Shield, Cpu, ArrowRight, GitBranch,
  Package, Globe, ChevronRight, Star, Code2,
  RefreshCw, Lock, Activity, ExternalLink, Copy, Check,
} from 'lucide-react';

// ─── Animated counter ─────────────────────────────────────────────────────────

function Counter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, value);
      setCount(Math.floor(current));
      if (current >= value) clearInterval(timer);
    }, 1200 / steps);
    return () => clearInterval(timer);
  }, [inView, value]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
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

// ─── Navigation ───────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-200"
      style={{
        background: scrolled ? 'rgba(10,10,10,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      }}
    >
      <div className="container flex items-center justify-between h-14">
        {/* Logo — matches LavaFlow orange square + wordmark */}
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#ea580c' }}
          >
            <Zap size={15} color="#ffffff" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-base text-white tracking-tight" style={{ fontFamily: 'Inter' }}>
            JXR.js
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6">
          {[
            { label: 'Docs', href: '/docs' },
            { label: 'GitHub', href: 'https://github.com/jxrstudios/jxr', ext: true },
            { label: 'Discord', href: 'https://discord.gg/jxr', ext: true },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.ext ? '_blank' : undefined}
              rel={l.ext ? 'noopener noreferrer' : undefined}
              className="flex items-center gap-1 text-sm font-medium no-underline transition-colors"
              style={{ color: '#9ca3af' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
            >
              {l.label}
              {l.ext && <ExternalLink size={11} />}
            </a>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <div className="badge-lava hidden sm:flex items-center gap-1.5">
            <span className="pulse-dot" style={{ width: '6px', height: '6px' }} />
            v1.0.0-edge
          </div>
          <a
            href="https://github.com/jxrstudios/jxr"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-sm py-1.5 px-3 no-underline"
          >
            <Star size={13} />
            Star
          </a>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ paddingTop: '80px', background: '#0a0a0a' }}
    >
      {/* Warm radial glow — exact LavaFlow pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 55% at 50% 40%, rgba(120,40,10,0.38) 0%, transparent 70%)',
        }}
      />

      <div className="container relative z-10">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
            style={{
              background: 'rgba(234,88,12,0.1)',
              border: '1px solid rgba(234,88,12,0.25)',
              color: '#f97316',
              fontFamily: 'JetBrains Mono',
              fontSize: '0.75rem',
            }}
          >
            <Zap size={12} />
            JXR Runtime — Powered by JXR Studios × DamascusAI
          </div>
        </motion.div>

        {/* Headline — exact LavaFlow pattern: white + orange */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mb-6"
          style={{
            fontFamily: 'Inter',
            fontWeight: 900,
            fontSize: 'clamp(2.8rem, 6vw, 5.5rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          <span style={{ color: '#ffffff' }}>The edge framework</span>
          <br />
          <span style={{ color: '#f97316' }}>that outperforms everything.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mb-10 max-w-xl"
          style={{ color: '#9ca3af', fontSize: '1.05rem', lineHeight: 1.65 }}
        >
          React Native + React build framework with MoQ transport, Web Crypto, and Worker pools.
          Use it in <strong style={{ color: '#d1d5db' }}>VSCode, Warp, Cursor</strong> — any IDE.
          AI agents migrate your project from Next.js, Vite, or Bun in seconds via MCP.
        </motion.p>

        {/* Stat pills — exact LavaFlow pattern */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="flex flex-wrap gap-2 mb-10"
        >
          {[
            { icon: <Zap size={13} />, label: 'cold start', value: '< 2ms' },
            { icon: <Globe size={13} />, label: 'edge nodes', value: '300+' },
            { icon: <Shield size={13} />, label: 'auth', value: 'Web Crypto' },
            { icon: <Activity size={13} />, label: 'transport', value: 'MoQ' },
            { icon: <Cpu size={13} />, label: 'workers', value: 'native' },
          ].map((s) => (
            <div key={s.label} className="stat-pill">
              <span className="pill-icon">{s.icon}</span>
              {s.label} <strong>{s.value}</strong>
            </div>
          ))}
        </motion.div>

        {/* CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap gap-3"
        >
          <Link href="/docs" className="btn-lava no-underline">
            Get started →
          </Link>
          <a
            href="https://github.com/jxrstudios/jxr"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost no-underline"
          >
            <GitBranch size={15} />
            View on GitHub
          </a>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #0a0a0a)' }}
      />
    </section>
  );
}

// ─── Architecture diagram — matches LavaFlow "LIVE ARCHITECTURE" card ─────────

function ArchDiagram() {
  const nodes = [
    { id: 'app', icon: <Code2 size={16} />, name: 'Your App', sub: 'React / RN', active: false },
    { id: 'sdk', icon: <Package size={16} />, name: 'JXR SDK', sub: 'MoQ + Crypto', active: false },
    { id: 'worker', icon: <Zap size={16} />, name: 'Worker Pool', sub: 'Edge runtime', active: true },
    { id: 'build', icon: <RefreshCw size={16} />, name: 'Build Engine', sub: 'esbuild + JXR', active: false },
    { id: 'edge', icon: <Globe size={16} />, name: 'Edge Deploy', sub: 'CF / Deno / Node', active: false },
  ];

  return (
    <div className="arch-card">
      <div className="arch-header">
        <div className="arch-live-label">
          <span className="live-dot" />
          LIVE ARCHITECTURE
        </div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: '#4b5563' }}>
          p99 &lt;2ms · workers ↑
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {nodes.map((node, i) => (
            <div key={node.id} className="flex items-center gap-2 flex-shrink-0">
              <div className={`arch-node ${node.active ? 'active' : ''}`}>
                <div className="arch-node-icon">{node.icon}</div>
                <div className="arch-node-name">{node.name}</div>
                <div className="arch-node-sub">{node.sub}</div>
              </div>
              {i < nodes.length - 1 && <div className="arch-connector" style={{ width: '40px' }} />}
            </div>
          ))}
        </div>
      </div>

      <div className="arch-progress">
        <div className="arch-progress-bar" />
      </div>
    </div>
  );
}

// ─── Install section ──────────────────────────────────────────────────────────

function InstallSection() {
  return (
    <section className="py-20" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Terminal: provision */}
          <div>
            <div className="section-label">PROVISION IN SECONDS</div>
            <div className="terminal-chrome">
              <div className="terminal-header">
                <div className="terminal-dot" style={{ background: '#ff5f57' }} />
                <div className="terminal-dot" style={{ background: '#febc2e' }} />
                <div className="terminal-dot" style={{ background: '#28c840' }} />
                <span className="terminal-label">terminal</span>
              </div>
              <div className="terminal-body">
                <div><span className="terminal-prompt">$ </span><span className="terminal-cmd">npm install -g @jxrstudios/jxr</span></div>
                <div><span className="terminal-out">Installing JXR.js...</span></div>
                <div><span className="terminal-out">Worker pool pre-warmed (8 threads)</span></div>
                <div><span className="terminal-out">MoQ transport initialized</span></div>
                <div><span className="terminal-out">Web Crypto engine ready</span></div>
                <div><span className="terminal-dim">Ready in 1.4s</span></div>
                <div className="mt-2">
                  <span className="terminal-prompt">$ </span>
                  <span className="terminal-cmd">jxr init my-app</span>
                </div>
                <div><span className="terminal-out">✓ Scaffolded react-web project</span></div>
                <div><span className="terminal-out">✓ Generated jxr.config.ts</span></div>
                <div><span className="terminal-dim">→ Run: </span><span className="terminal-orange">jxr dev</span><span className="cursor-blink" /></div>
              </div>
            </div>
          </div>

          {/* Code: connect instantly */}
          <div>
            <div className="section-label">CONNECT INSTANTLY</div>
            <div className="terminal-chrome">
              <div className="terminal-header">
                <div className="terminal-dot" style={{ background: '#ff5f57' }} />
                <div className="terminal-dot" style={{ background: '#febc2e' }} />
                <div className="terminal-dot" style={{ background: '#28c840' }} />
                <span className="terminal-label" style={{ marginLeft: 'auto' }}>jxr.config.ts</span>
              </div>
              <div className="terminal-body relative">
                <CopyButton text={`import { defineConfig } from '@jxrstudios/core'

export default defineConfig({
  name: 'my-app',
  platform: 'web',

  workers: { size: 8, enablePriority: true },
  moq: { enabled: true },
  crypto: { enabled: true, signing: true },

  devServer: { port: 3000, hmr: true },
})`} />
                <pre style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.75, color: '#d1d5db' }}>{`import { defineConfig } from `}<span style={{ color: '#f97316' }}>'@jxrstudios/core'</span>{`

export default defineConfig({
  name: `}<span style={{ color: '#f97316' }}>'my-app'</span>{`,
  platform: `}<span style={{ color: '#f97316' }}>'web'</span>{`,

  workers: { size: `}<span style={{ color: '#22c55e' }}>8</span>{`, enablePriority: `}<span style={{ color: '#22c55e' }}>true</span>{` },
  moq: { enabled: `}<span style={{ color: '#22c55e' }}>true</span>{` },
  crypto: { enabled: `}<span style={{ color: '#22c55e' }}>true</span>{`, signing: `}<span style={{ color: '#22c55e' }}>true</span>{` },

  devServer: { port: `}<span style={{ color: '#22c55e' }}>3000</span>{`, hmr: `}<span style={{ color: '#22c55e' }}>true</span>{` },
})`}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Arch diagram below */}
        <div className="mt-10">
          <ArchDiagram />
        </div>

        {/* Compatible with */}
        <div className="mt-8 flex flex-wrap items-center gap-3 justify-center">
          {['VSCode', 'Warp', 'Cursor', 'iTerm', 'Windows Terminal', 'Neovim'].map((ide) => (
            <div
              key={ide}
              className="px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', color: '#9ca3af' }}
            >
              {ide}
            </div>
          ))}
          <span style={{ color: '#4b5563', fontSize: '0.85rem' }}>+ any terminal</span>
        </div>
      </div>
    </section>
  );
}

// ─── Features grid ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Cpu,
    color: '#ea580c',
    title: 'Worker Pool Engine',
    description: 'Pre-warmed worker_threads fleet scales to hardware concurrency. Priority queue with backpressure. Parallel JSX transforms, crypto ops, and module resolution — all off the main thread.',
    snippet: `workers: {
  size: 8,
  enablePriority: true,
  maxQueueSize: 1000,
}`,
  },
  {
    icon: Activity,
    color: '#22c55e',
    title: 'MoQ Transport Layer',
    description: 'Full Media over QUIC protocol semantics for sub-RTT module streaming. Track/object/subscription model. Hot module updates stream to the browser before the file is even saved.',
    snippet: `moq: {
  enabled: true,
  relayUrl: 'wss://relay.jxr.dev',
  trackPriority: 'high',
}`,
  },
  {
    icon: Lock,
    color: '#ea580c',
    title: 'Web Crypto Engine',
    description: 'AES-GCM-256 module caching, ECDSA P-256 manifest signing, HKDF key derivation. Pure SubtleCrypto — zero native dependencies. Every build output is cryptographically signed.',
    snippet: `crypto: {
  enabled: true,
  algorithm: 'AES-GCM',
  signing: true,
  keyDerivation: 'HKDF',
}`,
  },
  {
    icon: RefreshCw,
    color: '#22c55e',
    title: 'Zero-Build Dev Mode',
    description: 'TypeScript stripping + JSX transform happen in a Worker — no esbuild daemon, no Babel config. The dev server serves modules directly from the virtual FS with cryptographic integrity.',
    snippet: `devServer: {
  port: 3000,
  hmr: true,
  // No build step needed
  // Modules served from VFS
}`,
  },
  {
    icon: GitBranch,
    color: '#ea580c',
    title: 'Migration Engine',
    description: 'One command migrates from Next.js, Vite, Bun, CRA, Expo, Remix, or Nuxt. AST-level import rewrites, config translation, and a detailed migration notes file — with full backup.',
    snippet: `# Migrate from Next.js
$ jxr migrate --from nextjs

# Auto-detect source
$ jxr migrate --dry-run`,
  },
  {
    icon: Package,
    color: '#22c55e',
    title: 'MCP Server',
    description: '14 AI-callable tools via the Model Context Protocol. Claude, Cursor, Copilot, and any MCP-compatible agent can init, build, migrate, deploy, and introspect JXR projects autonomously.',
    snippet: `// .cursor/mcp.json
{
  "mcpServers": {
    "jxrstudios": {
      "command": "npx",
      "args": ["-y", "@jxrstudios/mcp"]
    }
  }
}`,
  },
];

function Features() {
  return (
    <section className="py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="container">
        <div className="mb-14">
          <div className="section-label">CORE ARCHITECTURE</div>
          <h2
            style={{
              fontFamily: 'Inter',
              fontWeight: 900,
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              marginBottom: '0.75rem',
            }}
          >
            Engineered in layers.<br />
            <span style={{ color: '#f97316' }}>Precision at every level.</span>
          </h2>
          <p style={{ color: '#6b7280', maxWidth: '520px', lineHeight: 1.65 }}>
            JXR is not a wrapper. It is a ground-up reimagining of how React projects are built, served, and deployed at the edge.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="jxr-card flex flex-col gap-4"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${feat.color}18`,
                    border: `1px solid ${feat.color}30`,
                  }}
                >
                  <Icon size={17} style={{ color: feat.color }} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.5rem' }}>
                    {feat.title}
                  </h3>
                  <p style={{ fontSize: '0.83rem', color: '#6b7280', lineHeight: 1.65, marginBottom: '1rem' }}>
                    {feat.description}
                  </p>
                </div>
                <div className="code-block text-xs mt-auto whitespace-pre" style={{ fontSize: '0.75rem' }}>
                  {feat.snippet}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar() {
  const stats = [
    { value: 12, suffix: 'x', label: 'faster cold start vs Next.js' },
    { value: 8, suffix: '', label: 'worker threads pre-warmed' },
    { value: 7, suffix: '', label: 'frameworks supported for migration' },
    { value: 14, suffix: '', label: 'MCP tools for AI agents' },
  ];

  return (
    <section className="py-14" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="text-center"
            >
              <div
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 900,
                  fontSize: '2.8rem',
                  lineHeight: 1,
                  color: '#f97316',
                  marginBottom: '0.4rem',
                  letterSpacing: '-0.02em',
                }}
              >
                <Counter value={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: '0.78rem', color: '#4b5563', lineHeight: 1.4 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Migration section ────────────────────────────────────────────────────────

const FRAMEWORKS = [
  { name: 'Next.js', icon: '▲' },
  { name: 'Vite', icon: '⚡' },
  { name: 'Bun', icon: '🥟' },
  { name: 'CRA', icon: '⚛' },
  { name: 'Expo', icon: '📱' },
  { name: 'Remix', icon: '💿' },
  { name: 'Nuxt', icon: '🟢' },
];

function MigrationSection() {
  return (
    <section className="py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-14 items-start">
          {/* Left */}
          <div>
            <div className="section-label">MIGRATION ENGINE</div>
            <h2
              style={{
                fontFamily: 'Inter',
                fontWeight: 900,
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                marginBottom: '1rem',
              }}
            >
              Migrate from any framework.<br />
              <span style={{ color: '#f97316' }}>In one command.</span>
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: 1.65 }}>
              The JXR migration engine performs AST-level import rewrites, config translation,
              and dependency updates. It creates a full backup before touching anything.
              AI agents can trigger migrations autonomously via the MCP server.
            </p>
            <div className="flex flex-wrap gap-2 mb-8">
              {FRAMEWORKS.map((fw) => (
                <div
                  key={fw.name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
                >
                  <span>{fw.icon}</span>
                  {fw.name}
                </div>
              ))}
            </div>
            <Link href="/docs" className="btn-lava no-underline inline-flex">
              Migration guide <ChevronRight size={15} />
            </Link>
          </div>

          {/* Right — terminal */}
          <div className="terminal-chrome">
            <div className="terminal-header">
              <div className="terminal-dot" style={{ background: '#ff5f57' }} />
              <div className="terminal-dot" style={{ background: '#febc2e' }} />
              <div className="terminal-dot" style={{ background: '#28c840' }} />
              <span className="terminal-label">jxr migrate</span>
            </div>
            <div className="terminal-body">
              <div><span className="terminal-prompt">$ </span><span className="terminal-cmd">jxr migrate</span></div>
              <div className="mt-1" style={{ color: '#374151' }}>╔══════════════════════════════╗</div>
              <div style={{ color: '#374151' }}>║  JXR Migration Engine v1.0   ║</div>
              <div style={{ color: '#374151' }}>╚══════════════════════════════╝</div>
              <div className="mt-1">
                <span style={{ color: '#9ca3af' }}>→ Detected framework: </span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>nextjs</span>
              </div>
              <div>
                <span style={{ color: '#9ca3af' }}>→ Creating backup...</span>
                <span className="terminal-out"> ✓</span>
              </div>
              {[
                'Installing JXR deps',
                'Generating jxr.config.ts',
                'Rewriting imports (AST)',
                'Converting API routes',
                'Updating package.json',
              ].map((step, i) => (
                <div key={step}>
                  <span style={{ color: '#374151' }}>[{i + 1}/5] </span>
                  <span style={{ color: '#9ca3af' }}>{step}</span>
                  <span className="terminal-out"> ✓</span>
                </div>
              ))}
              <div className="mt-2">
                <span className="terminal-out">✓ </span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>Migration complete!</span>
              </div>
              <div>
                <span style={{ color: '#9ca3af' }}>→ Run: </span>
                <span className="terminal-orange">jxr dev</span>
                <span className="cursor-blink" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── MCP section ──────────────────────────────────────────────────────────────

const MCP_TOOLS = [
  { name: 'jxr_init', desc: 'Scaffold a new JXR project' },
  { name: 'jxr_dev', desc: 'Start dev server with HMR' },
  { name: 'jxr_build', desc: 'Production build with manifest' },
  { name: 'jxr_migrate', desc: 'Migrate from any framework' },
  { name: 'jxr_deploy', desc: 'Deploy to Cloudflare/Deno/Node' },
  { name: 'jxr_detect_framework', desc: 'Auto-detect source framework' },
  { name: 'jxr_read_config', desc: 'Read jxr.config.ts' },
  { name: 'jxr_write_config', desc: 'Update project config' },
  { name: 'jxr_list_files', desc: 'List project file tree' },
  { name: 'jxr_read_file', desc: 'Read any project file' },
  { name: 'jxr_write_file', desc: 'Write or create files' },
  { name: 'jxr_add_plugin', desc: 'Add JXR plugin' },
  { name: 'jxr_run_command', desc: 'Run shell command in project' },
  { name: 'jxr_info', desc: 'Get full project info' },
];

function MCPSection() {
  return (
    <section className="py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-14 items-start">
          {/* Left */}
          <div>
            <div className="section-label">MCP SERVER</div>
            <h2
              style={{
                fontFamily: 'Inter',
                fontWeight: 900,
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                marginBottom: '1rem',
              }}
            >
              AI agents run your<br />
              <span style={{ color: '#f97316' }}>entire workflow.</span>
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: 1.65 }}>
              The JXR MCP server exposes 14 tools over the Model Context Protocol.
              Claude, Cursor, Copilot, and any MCP-compatible agent can initialize projects,
              run builds, migrate codebases, and deploy to the edge — without leaving the chat.
            </p>

            <div className="space-y-1">
              {MCP_TOOLS.map((tool, i) => (
                <motion.div
                  key={tool.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.025 }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <Code2 size={11} style={{ color: '#22c55e', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#22c55e' }}>{tool.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#4b5563', marginLeft: 'auto' }}>{tool.desc}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right */}
          <div className="flex flex-col gap-5">
            <div>
              <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.75rem', fontFamily: 'JetBrains Mono' }}>
                Add to Claude Desktop / Cursor / any MCP client:
              </p>
              <div className="terminal-chrome">
                <div className="terminal-header">
                  <div className="terminal-dot" style={{ background: '#ff5f57' }} />
                  <div className="terminal-dot" style={{ background: '#febc2e' }} />
                  <div className="terminal-dot" style={{ background: '#28c840' }} />
                  <span className="terminal-label">mcp.json</span>
                </div>
                <div className="terminal-body relative">
                  <CopyButton text={`{
  "mcpServers": {
    "jxrstudios": {
      "command": "npx",
      "args": ["-y", "@jxrstudios/mcp"]
    }
  }
}`} />
                  <pre style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.75, color: '#d1d5db' }}>{`{
  `}<span style={{ color: '#9ca3af' }}>"mcpServers"</span>{`: {
    `}<span style={{ color: '#9ca3af' }}>"jxr"</span>{`: {
      `}<span style={{ color: '#9ca3af' }}>"command"</span>{`: `}<span style={{ color: '#f97316' }}>"npx"</span>{`,
      `}<span style={{ color: '#9ca3af' }}>"args"</span>{`: [`}<span style={{ color: '#f97316' }}>"-y"</span>{`, `}<span style={{ color: '#f97316' }}>"@jxrstudios/mcp"</span>{`]
    }
  }
}`}</pre>
                </div>
              </div>
            </div>

            {/* Compatible agents */}
            <div className="jxr-card">
              <p style={{ fontSize: '0.78rem', color: '#4b5563', fontFamily: 'JetBrains Mono', marginBottom: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Compatible agents
              </p>
              <div className="flex flex-wrap gap-2">
                {['Claude Desktop', 'Cursor', 'GitHub Copilot', 'Cline', 'Continue.dev', 'Zed AI', 'Any MCP client'].map((a) => (
                  <div
                    key={a}
                    className="px-2.5 py-1 rounded text-xs font-medium"
                    style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', color: '#9ca3af' }}
                  >
                    {a}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CLI section ──────────────────────────────────────────────────────────────

const CLI_COMMANDS = [
  { cmd: 'jxr init my-app', desc: 'Scaffold a new project (react-web, react-native, expo, cloudflare)' },
  { cmd: 'jxr dev', desc: 'Start dev server with HMR + MoQ streaming' },
  { cmd: 'jxr build', desc: 'Production build with crypto-signed manifest' },
  { cmd: 'jxr migrate --from nextjs', desc: 'Migrate from Next.js, Vite, Bun, CRA, Expo, Remix, Nuxt' },
  { cmd: 'jxr deploy --target cloudflare', desc: 'Deploy to Cloudflare Workers, Deno Deploy, or Node.js' },
  { cmd: 'jxr add tailwind', desc: 'Add a JXR plugin or integration' },
  { cmd: 'jxr info', desc: 'Print environment and project information' },
];

function CLISection() {
  const [active, setActive] = useState(0);

  return (
    <section className="py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="container">
        <div className="mb-12">
          <div className="section-label">CLI REFERENCE</div>
          <h2
            style={{
              fontFamily: 'Inter',
              fontWeight: 900,
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              marginBottom: '0.75rem',
            }}
          >
            One CLI. <span style={{ color: '#f97316' }}>Every IDE.</span>
          </h2>
          <p style={{ color: '#6b7280', maxWidth: '480px', lineHeight: 1.65 }}>
            Install JXR globally and use it in VSCode, Warp, Cursor, iTerm, Windows Terminal — wherever you work.
          </p>
        </div>

        <div className="max-w-2xl">
          {/* Install */}
          <div className="terminal-chrome mb-5">
            <div className="terminal-header">
              <div className="terminal-dot" style={{ background: '#ff5f57' }} />
              <div className="terminal-dot" style={{ background: '#febc2e' }} />
              <div className="terminal-dot" style={{ background: '#28c840' }} />
              <span className="terminal-label">install</span>
            </div>
            <div className="terminal-body relative">
              <CopyButton text="npm install -g @jxrstudios/jxr" />
              <div><span className="terminal-dim"># Install JXR globally</span></div>
              <div><span className="terminal-prompt">$ </span><span className="terminal-cmd">npm install -g @jxrstudios/jxr</span></div>
              <div className="mt-1"><span className="terminal-dim"># Or with pnpm / yarn / bun</span></div>
              <div><span className="terminal-prompt">$ </span><span className="terminal-cmd">pnpm add -g @jxrstudios/jxr</span></div>
            </div>
          </div>

          {/* Commands */}
          <div className="space-y-1.5">
            {CLI_COMMANDS.map((item, i) => (
              <motion.div
                key={item.cmd}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 p-3.5 rounded-lg cursor-pointer transition-all"
                style={{
                  background: active === i ? 'rgba(234,88,12,0.07)' : '#111111',
                  border: `1px solid ${active === i ? 'rgba(234,88,12,0.25)' : 'rgba(255,255,255,0.05)'}`,
                }}
                onClick={() => setActive(i)}
              >
                <Terminal size={13} style={{ color: '#ea580c', marginTop: '2px', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: '#e5e7eb', marginBottom: '2px' }}>{item.cmd}</div>
                  <div style={{ fontSize: '0.78rem', color: '#4b5563' }}>{item.desc}</div>
                </div>
                <ChevronRight size={13} style={{ color: '#374151', flexShrink: 0 }} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section
      className="py-28 relative overflow-hidden"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Warm glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(120,40,10,0.25) 0%, transparent 70%)' }}
      />

      <div className="container relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="section-label justify-center" style={{ justifyContent: 'center' }}>GET STARTED</div>
          <h2
            style={{
              fontFamily: 'Inter',
              fontWeight: 900,
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              marginBottom: '1rem',
            }}
          >
            Start building<br />
            <span style={{ color: '#f97316' }}>at the edge.</span>
          </h2>
          <p style={{ color: '#6b7280', maxWidth: '460px', margin: '0 auto 2.5rem', lineHeight: 1.65 }}>
            Powered by <strong style={{ color: '#f97316' }}>JXR Studios</strong> × <strong style={{ color: '#22c55e' }}>DamascusAI</strong>.
            The edge OS runtime for developers who take their game to the next level.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/docs" className="btn-lava no-underline" style={{ fontSize: '1rem', padding: '0.85rem 2rem' }}>
              Get started →
            </Link>
            <a
              href="https://github.com/jxrstudios/jxr"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost no-underline"
              style={{ fontSize: '1rem', padding: '0.85rem 2rem' }}
            >
              <Star size={15} />
              Star on GitHub
            </a>
          </div>

          <p style={{ color: '#374151', fontSize: '0.82rem', marginTop: '1.25rem' }}>
            Free tier available. No credit card required.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0d0d0d' }}>
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#ea580c' }}>
                <Zap size={13} color="#ffffff" strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: 'Inter', fontWeight: 700, color: '#ffffff' }}>JXR.js</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.6 }}>
              Edge OS Runtime Framework.<br />
              JXR Studios × DamascusAI
            </p>
          </div>

          {[
            {
              title: 'Framework',
              links: [
                { label: 'Documentation', href: '/docs' },
                { label: 'CLI Reference', href: '/docs' },
                { label: 'MCP Server', href: '/docs' },
                { label: 'Migration Guide', href: '/docs' },
              ],
            },
            {
              title: 'Packages',
              links: [
                { label: 'jxr (CLI)', href: '#' },
                { label: '@jxrstudios/core', href: '#' },
                { label: '@jxrstudios/runtime', href: '#' },
                { label: '@jxrstudios/mcp', href: '#' },
              ],
            },
            {
              title: 'Community',
              links: [
                { label: 'GitHub', href: 'https://github.com/jxrstudios/jxr' },
                { label: 'Discord', href: 'https://discord.gg/jxr' },
                { label: 'Twitter / X', href: 'https://twitter.com/jxrstudios' },
                { label: 'DamascusAI', href: 'https://damascusai.com' },
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
                {col.title}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      style={{ fontSize: '0.85rem', color: '#4b5563', textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ea580c')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="lava-divider mb-6" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p style={{ fontSize: '0.78rem', color: '#374151' }}>
            © 2026 JXR Studios · Powered by Cloudflare Edge
          </p>
          <div className="flex items-center gap-2">
            <div className="badge-lava">JXR Studios</div>
            <span style={{ color: '#374151', fontSize: '0.75rem' }}>×</span>
            <div className="badge-green">DamascusAI</div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>
      <Nav />
      <Hero />
      <InstallSection />
      <StatsBar />
      <Features />
      <MigrationSection />
      <MCPSection />
      <CLISection />
      <CTA />
      <Footer />
    </div>
  );
}
