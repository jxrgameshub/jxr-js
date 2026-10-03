# JXR.js Official Templates

Production-ready starter templates for `@jxrstudios/jxr`.

## Templates

| Template | Kind | Description | Key APIs |
|----------|------|-------------|----------|
| [default](./default) | web | Full starter with command palette + dev template overlay | `JXRServerManager`, JSX transform |
| [minimal](./minimal) | web | Counter app — fastest way to start | `jxr dev`, JSX transform |
| [dashboard](./dashboard) | web | Runtime metrics dashboard | `WorkerPool`, `MoQTransport`, `JXRRuntime` |
| [crypto-notes](./crypto-notes) | web | Encrypted notes with Web Crypto | `JXRCrypto`, `VirtualFS` |
| [multi-page](./multi-page) | web | Multi-page app with routing | `wouter`, `JXRServerManager` |
| [cloudflare-worker](./cloudflare-worker) | worker | Edge function deployment | `JXRDeployer`, `jxr build`, `jxr deploy` |
| [typescript](./typescript) | vanilla | Bare TypeScript entry | `jxr build` |
| [javascript](./javascript) | vanilla | Bare JavaScript entry | `jxr build` |
| [jsx](./jsx) | vanilla | JSX without TypeScript | JSX transform |
| [tsx](./tsx) | vanilla | TSX with React | JSX transform |
| [react-native](./react-native) | native | React Native target | `JXRDeployer` |

The canonical catalog lives in [`src/template-registry.ts`](../src/template-registry.ts) and is
consumed by both the CLI (`jxr init --list`) and the dev server (`GET /__jxr/templates`).

## Quick Start

```bash
# Option 1: Pick a template interactively during scaffolding
jxr init my-app

# Option 2: Choose a template non-interactively
jxr init my-app --template=dashboard
jxr init my-app --template=minimal --yes

# Option 3: Browse the full catalog
jxr init --list

# Option 4: Clone a template directly (no framework CLI)
cp -r templates/minimal my-app
cd my-app
npm install
jxr dev
```

## Previewing Templates Before You Commit

`jxr init` scaffolds a project immediately, then lets you preview the other templates from the
**dev server's command palette** before switching:

```bash
cd my-app
jxr dev            # overlay + palette are enabled by default in dev
```

- Click the **gear overlay** (or press <kbd>⌘K</kbd> / <kbd>Ctrl</kbd>+<kbd>K</kbd>) to open the palette.
- Selecting a template shows a confirmation dialog: *"Are you sure you want to choose this
  template? This action is permanent…"*.
- Confirming calls `POST /__jxr/apply-template`, which backs up the current `src/` to
  `.jxr/backup-<timestamp>/` and hot-swaps in the new template.
- The overlay is **framework-injected** (your app code needs zero changes) and is **never
  emitted in production builds** — `jxr build` output contains no overlay script.
- Disable the overlay explicitly with `jxr dev --no-overlay`.

## Requirements

- Node.js 18+
- npm, pnpm, or yarn
- `@jxrstudios/jxr` installed globally or as a project dependency

## AI Agent Workflow

Every scaffold also drops an [`AGENTS.md`](../AGENTS.md) manual into the project root. It teaches
IDE-integrated and standalone AI coding tools the 3-pass QC / zero-hallucination workflow plus the
JXR.js data-flow architecture.
