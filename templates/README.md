# JXR.js Official Templates

Production-ready starter templates for `@jxrstudios/jxr`.

## Templates

| Template | Description | Key APIs |
|----------|-------------|----------|
| [minimal](./minimal) | Counter app — fastest way to start | `jxr dev`, JSX transform |
| [dashboard](./dashboard) | Runtime metrics dashboard | `WorkerPool`, `MoQTransport`, `JXRRuntime` |
| [crypto-notes](./crypto-notes) | Encrypted notes with Web Crypto | `JXRCrypto`, `VirtualFS` |
| [multi-page](./multi-page) | Multi-page app with routing | `wouter`, `JXRServerManager` |
| [cloudflare-worker](./cloudflare-worker) | Edge function deployment | `JXRDeployer`, `jxr build`, `jxr deploy` |

## Quick Start

```bash
# Option 1: Clone a template directly
cp -r templates/minimal my-app
cd my-app
npm install
jxr dev

# Option 2: Use jxr init (scaffolds the default template)
jxr init my-app
cd my-app
npm install
jxr dev
```

## Requirements

- Node.js 18+
- npm, pnpm, or yarn
- `@jxrstudios/jxr` installed globally or as a project dependency
