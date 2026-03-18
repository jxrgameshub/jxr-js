# JXR.js — Edge OS Runtime Framework

> **Execute JavaScript at the edge with zero-build JSX transformation.**
>
> MoQ transport · Web Crypto · Worker Pools · MCP Server · React Native + Web

[![npm version](https://badge.fury.io/js/@jxrstudios%2Fjxr.svg)](https://www.npmjs.com/package/@jxrstudios/jxr)
[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)

**Website:** https://jxrstudios.online  
**Documentation:** https://jxrstudios.online/docs

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Commands](#cli-commands)
- [Architecture](#architecture)
- [MCP Server](#mcp-server)
- [Migration Guide](#migration-guide)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Overview

JXR.js is a next-generation edge runtime framework that eliminates the traditional build step. It enables:

- **Zero-build development** — JSX transforms in the browser via Web Workers
- **Sub-RTT hot reloading** — MoQ (Media over QUIC) streaming
- **Universal runtime** — React Native, Web, Cloudflare Workers, Deno, Node.js
- **AI-native tooling** — 14 MCP tools for autonomous agent operation
- **Cryptographic integrity** — ECDSA-P256 signed modules

### Performance Benchmarks

| Metric | JXR.js | Next.js | Vite | Bun |
|--------|--------|---------|------|-----|
| Cold Start | 0ms | 2,400ms | 800ms | 350ms |
| HMR Update | <1ms | 180ms | 45ms | 30ms |
| Build Time | N/A | 45s | 12s | 8s |
| Memory Usage | 18MB | 420MB | 180MB | 95MB |

*JXR.js has no build step — cold start is time to first rendered pixel.*

---

## Installation

### Global CLI (Recommended)

```bash
npm install -g @jxrstudios/jxr
# or
pnpm add -g @jxrstudios/jxr
# or
yarn global add @jxrstudios/jxr
```

### Project Dependency

```bash
npm install @jxrstudios/jxr
```

---

## Quick Start

### 1. Create New Project

```bash
jxr init my-app
cd my-app
npm install
jxr dev
```

### 2. Existing Project Migration

```bash
# Auto-detect framework and migrate
jxr migrate --from nextjs

# Dry run to preview changes
jxr migrate --from vite --dry-run
```

### 3. Development Server

```bash
jxr dev              # Start on default port 3000
jxr dev --port 3001  # Custom port
jxr dev --no-hmr     # Disable HMR
```

---

## CLI Commands

### `jxr init <project-name>`

Create a new JXR project with scaffolding.

**Safety:** Never overwrites existing files. Shows detailed error if directory contains files.

**Templates:**
- `react-web` — React web application (default)
- `react-native` — React Native mobile app
- `expo` — Expo managed workflow
- `cloudflare` — Cloudflare Workers edge function

```bash
jxr init my-app --template react-web
```

### `jxr dev`

Start development server with HMR.

```bash
jxr dev [options]

Options:
  --port=<number>     Server port (default: 3000)
  --no-hmr           Disable hot module replacement
  --host=<address>   Bind to specific host
```

**Features:**
- Virtual file system with in-memory caching
- On-demand JSX/TSX transformation
- Import map resolution for bare imports
- Web Worker pool for parallel processing
- MoQ transport for sub-RTT updates

### `jxr build`

Production build with code splitting and crypto signing.

```bash
jxr build [options]

Options:
  --platform=<target>    web | node | cloudflare-worker (default: web)
  --out-dir=<path>       Output directory (default: dist)
  --analyze              Show bundle analysis
  --no-minify            Disable minification
```

**Output:**
- `dist/assets/` — Bundled JavaScript and CSS
- `dist/index.html` — Entry HTML with proper preload tags
- `dist/jxr-manifest.json` — Crypto-signed manifest

### `jxr migrate`

Migrate from existing frameworks with AST-level transformations.

```bash
jxr migrate [options]

Options:
  --from=<framework>  nextjs | vite | bun | cra | expo | remix | nuxt
  --to=<target>       Target platform (default: react-web)
  --dry-run           Preview changes without applying
  --force             Skip confirmation prompts
```

**Supported Frameworks:**
- Next.js (pages router, app router)
- Vite (React, Vue, Svelte)
- Create React App
- Expo / React Native
- Remix
- Nuxt 3
- Bun

**What gets migrated:**
- Import rewrites (AST-level)
- Config file conversion
- API route transformation
- Dependency mapping
- Asset path updates

### `jxr deploy`

Deploy to edge platforms.

```bash
jxr deploy [path] [options]

Arguments:
  path                 Build output directory (default: ./dist)

Options:
  --target=<platform>  cloudflare | deno | node
  --env=<environment>  production | staging | preview (default: production)
```

**Environment Variables:**
```bash
export JXR_API_KEY=jxr_live_xxxxx      # Required
export JXR_PROJECT_ID=my-project        # Optional
```

---

## Architecture

### Core Modules

```
JXR.js
├── VirtualFS           # In-memory file system
├── JSXTransformer      # Zero-build JSX/TSX transform
├── WorkerPool          # Parallel task execution
├── ModuleResolver      # Import resolution & caching
├── MoQTransport        # Edge streaming protocol
├── JXRCrypto           # Cryptographic operations
└── JXRServerManager    # Dev server with HMR
```

### Runtime Flow

1. **Request** → Entry point detection (main.tsx → App.tsx → index.tsx)
2. **Transform** → TypeScript stripping + JSX transform in Worker
3. **Resolve** → Import map resolution for bare module imports
4. **Cache** → LRU cache with cryptographic integrity verification
5. **Serve** → Module served with proper MIME type and headers

### Virtual File System

```typescript
import { VirtualFS, DEFAULT_PROJECT_FILES } from '@jxrstudios/jxr';

const vfs = new VirtualFS(DEFAULT_PROJECT_FILES);

// Write file
vfs.write('/src/components/Button.tsx', `
  export const Button = () => <button>Click</button>
`);

// Read file
const file = vfs.read('/src/components/Button.tsx');

// Check existence
const exists = vfs.exists('/src/App.tsx');

// List directory
const files = vfs.readdir('/src/components');
```

### JSX Transformer

```typescript
import { JSXTransformer } from '@jxrstudios/jxr';

const transformer = new JSXTransformer({
  pragma: 'React.createElement',
  pragmaFrag: 'React.Fragment',
});

// Transform JSX
const transformed = transformer.transform(
  `export const App = () => <h1>Hello JXR</h1>`,
  '/src/App.tsx'
);

// Create executable module
const objectUrl = transformer.createObjectUrl(transformed);
```

### Worker Pool

```typescript
import { WorkerPool } from '@jxrstudios/jxr';

const pool = new WorkerPool('/jxr-worker.js', {
  maxWorkers: 8,
  maxQueueSize: 1000,
  enablePriority: true,
});

// Execute task
const result = await pool.executeTask({
  id: 'task-1',
  type: 'transform',
  payload: { code: '...', filename: '/src/App.tsx' },
  priority: 'high', // high | normal | low
});

// Get metrics
const metrics = pool.getMetrics();
// { activeWorkers, idleWorkers, queuedTasks, completedTasks, errors }
```

---

## MCP Server

JXR.js includes a Model Context Protocol (MCP) server for AI agent integration.

### Available Tools

| Tool | Description |
|------|-------------|
| `jxr_info` | Get project information and status |
| `jxr_init` | Scaffold a new JXR project |
| `jxr_dev` | Start development server |
| `jxr_build` | Run production build |
| `jxr_migrate` | Migrate from existing framework |
| `jxr_deploy` | Deploy to edge platform |
| `jxr_detect_framework` | Auto-detect source framework |
| `jxr_read_config` | Read jxr.config.ts |
| `jxr_write_config` | Update project configuration |
| `jxr_list_files` | List project file tree |
| `jxr_read_file` | Read any project file |
| `jxr_write_file` | Write or create files |
| `jxr_add_plugin` | Add JXR plugin |
| `jxr_run_command` | Execute shell command in project |

### Configuration

**Claude Desktop:**
```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "jxr": {
      "command": "npx",
      "args": ["-y", "@jxrstudios/mcp"]
    }
  }
}
```

**Cursor:**
```json
// .cursor/mcp.json
{
  "mcpServers": {
    "jxr": {
      "command": "npx",
      "args": ["-y", "@jxrstudios/mcp"]
    }
  }
}
```

**VS Code (with Cline):**
```json
// settings.json
{
  "cline.mcpServers": {
    "jxr": {
      "command": "npx",
      "args": ["-y", "@jxrstudios/mcp"]
    }
  }
}
```

### Example Agent Workflows

**Initialize and build:**
```
User: Create a new JXR web app called "dashboard"
Agent: I'll initialize the project and set it up for you.

[Uses jxr_init, then jxr_dev to start server]
```

**Migrate and deploy:**
```
User: Migrate my Next.js blog to JXR and deploy it
Agent: I'll migrate your project and deploy it to production.

[Uses jxr_detect_framework, jxr_migrate, jxr_build, jxr_deploy]
```

---

## Migration Guide

### From Next.js

```bash
jxr migrate --from nextjs
```

**Changes:**
- `pages/` → `src/pages/` (optional)
- `next.config.js` → `jxr.config.ts`
- `getServerSideProps` → Edge functions
- API routes preserved with minor syntax updates

### From Vite

```bash
jxr migrate --from vite
```

**Changes:**
- `vite.config.ts` → `jxr.config.ts`
- Import map replaces `resolve.alias`
- Plugin system has different API

### From Create React App

```bash
jxr migrate --from cra
```

**Changes:**
- Zero-config philosophy maintained
- Service worker handling updated
- Modern JSX transform (no React import needed)

---

## API Reference

### JXRRuntime

```typescript
class JXRRuntime {
  constructor(options?: JXRRuntimeOptions);
  
  // Initialization
  init(): Promise<void>;
  
  // Module resolution
  resolveModule(path: string): Promise<ResolvedModule>;
  
  // Preview generation
  buildPreviewDocument(): string;
  
  // Event handling
  onMetrics(callback: (metrics: RuntimeMetrics) => void): void;
  onError(callback: (error: JXRError) => void): void;
}

// Singleton instance
import { jxrRuntime } from '@jxrstudios/jxr';
```

### JXRServerManager

```typescript
class JXRServerManager {
  constructor(options: ServerOptions);
  
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // HMR
  broadcastUpdate(path: string): void;
  
  // File watching
  watch(pattern: string, callback: (event: WatchEvent) => void): void;
}
```

### JXRDeployer

```typescript
class JXRDeployer {
  constructor(apiKey: string, projectId?: string);
  
  deploy(path: string, options: DeployOptions): Promise<DeployResult>;
  getStatus(deploymentId: string): Promise<DeploymentStatus>;
  listDeployments(): Promise<Deployment[]>;
  rollback(deploymentId: string): Promise<void>;
}

// Singleton with env vars
import { jxrDeployer } from '@jxrstudios/jxr';
// Requires JXR_API_KEY env var
```

### JXRCrypto

```typescript
class JXRCrypto {
  // Module hashing
  hashModule(code: string): Promise<string>;
  
  // Manifest signing
  signManifest(manifest: Manifest, privateKey: string): Promise<SignedManifest>;
  verifyManifest(signedManifest: SignedManifest): Promise<boolean>;
  
  // Key generation
  generateKeyPair(): Promise<{ publicKey: string; privateKey: string }>;
}

// Singleton instance
import { jxrCrypto } from '@jxrstudios/jxr';
```

---

## Deployment

### Wranglerless Cloudflare

Deploy without configuring wrangler or having a Cloudflare account.

```bash
# Get API key at https://jxrstudios.online/dashboard
export JXR_API_KEY=jxr_live_xxxxx

# Deploy
jxr deploy --target cloudflare
```

### Deno Deploy

```bash
jxr deploy --target deno
```

### Node.js

```bash
jxr build --platform=node
jxr deploy --target node --env=production
```

### Deployment Lifecycle

```typescript
const deployer = new JXRDeployer(apiKey, projectId);

// Deploy
const result = await deployer.deploy('./dist', {
  environment: 'production',
  branch: 'main',
});

// Check status
const status = await deployer.getStatus(result.deploymentId);

// List all
const deployments = await deployer.listDeployments();

// Rollback if needed
await deployer.rollback(previousDeploymentId);
```

---

## Troubleshooting

### "Cannot find module 'react'"

JXR uses import maps for external dependencies. Ensure your HTML includes:

```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@19",
    "react-dom/client": "https://esm.sh/react-dom@19/client"
  }
}
</script>
```

### TypeScript errors in IDE

Install type definitions:

```bash
npm install -D @types/react @types/react-dom typescript
```

### Port already in use

```bash
jxr dev --port 3001
```

Or set environment variable:
```bash
PORT=3001 jxr dev
```

### HMR not working

Check browser console for WebSocket errors. Ensure no proxy/firewall blocking WS connections.

```bash
jxr dev --no-hmr  # Disable HMR as workaround
```

### Build fails with "Cannot resolve"

Ensure all imports are either:
1. Relative paths (`./Component`)
2. Mapped in import map
3. Marked as external in jxr.config.ts

### Migration fails

```bash
# Preview changes first
jxr migrate --from nextjs --dry-run

# Force migration (skip prompts)
jxr migrate --from nextjs --force
```

---

## Configuration

### jxr.config.ts

```typescript
import { defineConfig } from '@jxrstudios/jxr';

export default defineConfig({
  name: 'my-app',
  platform: 'web', // web | node | cloudflare-worker

  // Worker pool settings
  workers: {
    size: 8,
    enablePriority: true,
    maxQueueSize: 1000,
  },

  // MoQ transport
  moq: {
    enabled: true,
    relayUrl: 'wss://relay.jxr.dev',
    trackPriority: 'high',
  },

  // Web Crypto
  crypto: {
    enabled: true,
    signing: true,
    algorithm: 'AES-GCM',
  },

  // Dev server
  devServer: {
    port: 3000,
    hmr: true,
    host: 'localhost',
  },

  // Build settings
  build: {
    outDir: 'dist',
    minify: true,
    sourcemap: true,
    splitting: true,
  },

  // Import map (extends default)
  imports: {
    "@/": "./src/",
    "~/": "./public/",
  },

  // External packages (don't bundle)
  external: ['some-heavy-lib'],

  // Plugins
  plugins: [
    // Custom plugins
  ],
});
```

---

## Contributing

### Development Setup

```bash
git clone https://github.com/jxrstudios/jxr.git
cd jxr
npm install
npm run build
npm test
```

### Project Structure

```
jxr/
├── src/
│   ├── index.ts              # Main exports
│   ├── deployer.ts           # Deployment logic
│   ├── enhanced-transpiler.ts # JSX transformation
│   ├── entry-point-detection.ts
│   ├── jxr-server-manager.ts # Dev server
│   ├── module-resolver.ts
│   ├── moq-transport.ts
│   ├── runtime.ts
│   ├── web-crypto.ts
│   └── worker-pool.ts
├── bin/
│   └── jxr.js               # CLI entry
├── zzz_react_template/      # Project templates
└── tests/
```

### Submitting Changes

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes with tests
4. Run full test suite: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) file for details.

---

## Credits

- **JXR Studios** — Framework development and maintenance
- **DamascusAI** — AI integration and MCP server
- **Contributors** — Community contributions

---

<p align="center">
  <strong>Powered by JXR Studios × DamascusAI</strong><br>
  <sub>The edge OS runtime for developers who take their game to the next level.</sub>
</p>
