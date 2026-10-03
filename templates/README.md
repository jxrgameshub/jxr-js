# JXR.js Official Templates

Production-ready starter templates for `@jxrstudios/jxr`.

## Templates

| Template | Kind | Preview | Description | Key APIs |
|----------|------|---------|-------------|----------|
| [default](./default) | web | Live | Full starter with command palette + dev Template Explorer | `JXRServerManager`, JSX transform |
| [minimal](./minimal) | web | Live | Counter app — fastest way to start | `jxr dev`, JSX transform |
| [dashboard](./dashboard) | web | Source | Runtime metrics dashboard | `WorkerPool`, `MoQTransport`, `JXRRuntime` |
| [crypto-notes](./crypto-notes) | web | Source | Encrypted notes with Web Crypto | `JXRCrypto`, `VirtualFS` |
| [multi-page](./multi-page) | web | Live | Multi-page app with routing | `wouter`, `JXRServerManager` |
| [cloudflare-worker](./cloudflare-worker) | worker | Live | Edge function deployment | `JXRDeployer`, `jxr build`, `jxr deploy` |
| [typescript](./typescript) | vanilla | Source | Bare TypeScript entry (console) | `jxr build` |
| [javascript](./javascript) | vanilla | Source | Bare JavaScript entry (console) | `jxr build` |
| [jsx](./jsx) | web | Source | JSX without TypeScript (uses MoQ) | JSX transform |
| [tsx](./tsx) | web | Source | TSX with React (uses jxrRuntime) | JSX transform |
| [react-native](./react-native) | native | Source | React Native target | `JXRDeployer` |

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

`jxr init` scaffolds a project immediately, then lets you **preview before committing** from the
dev-only **Template Explorer**:

```bash
cd my-app
jxr dev            # explorer + overlay are enabled by default in dev
```

- Click the **gear** (bottom-right) or press <kbd>⌘K</kbd> / <kbd>Ctrl</kbd>+<kbd>K</kbd> / <kbd>H</kbd>.
- The search sits **center-top**; directly below it is a **carousel of every template** with an
  accent dot, name, tags and a `Live`/`Source` badge. Filter chips: `All`, `Live preview`, `Web`,
  `Worker`, `Vanilla`, `Native`.
- The stage below previews the selection:
  - **Live preview** (default, minimal, multi-page, cloudflare-worker) — rendered in a sandboxed
    iframe from `GET /__jxr/preview/<id>`, isolated from your running app.
  - **Source preview** (dashboard, crypto-notes, typescript, javascript, jsx, tsx, react-native) —
    a file tree + source with a note explaining why it can't be live-rendered (Node-only runtime
    or native target).
- **Apply** from the stage button, or from the default template's command palette. Either path
  shows the permanent-choice confirmation and calls `POST /__jxr/apply-template`, which backs up
  the current `src/` to `.jxr/backup-<timestamp>/` and hot-swaps in the new template.
- `GET /__jxr/templates` returns the **full catalog** (all templates).
- The explorer is **framework-injected** (your app code needs zero changes) and is **never
  emitted in production builds** — `jxr build` output contains no explorer script.
- Disable it explicitly with `jxr dev --no-overlay`.

## Requirements

- Node.js 18+
- npm, pnpm, or yarn
- `@jxrstudios/jxr` installed globally or as a project dependency

## AI Agent Workflow

Every scaffold also drops an [`AGENTS.md`](../AGENTS.md) manual into the project root. It teaches
IDE-integrated and standalone AI coding tools the 3-pass QC / zero-hallucination workflow plus the
JXR.js data-flow architecture.
