# jxr init / dev / build / serve — robustness pass

Date: 2026-10-02
Scope: `@jxrstudios/jxr` (repo `jxr-js`), CLI entry `bin/jxr.js`, default template.
Method: 3 passes against the real repo state (no assumptions). Every claim below was
verified by executing the command and inspecting real output.

## Verified user sequence (before fixes)

| Step | Command | Result |
|------|---------|--------|
| install CLI | `pnpm install -g @jxrstudios/jxr` | ok (1.2.29 already present) |
| help | `jxr help` | prints usage, but exits **1** |
| init | `jxr init sample-app` | exit 0 |
| install deps | `pnpm install` (in app) | **installed to `$HOME`, not the project** (home `pnpm-workspace.yaml` adopted) |
| dev | `jxr dev` | server starts; **`/src/components/ErrorBoundary` → HTTP 404**, app broken |
| build | `jxr build` | **FAILS** — 13 unresolved errors in scaffold; also fails on `templates/minimal` |
| serve | `jxr serve` | **not implemented** (prints usage, exit 1) though advertised in help |

## Root causes

1. **Broken `jxr init` scaffold.** `bin/jxr.js` copied 3 files (`App.tsx`, `main.tsx`,
   `index.css`) from `zzz_react_template/`, but that template's `App.tsx` imports
   `@/components/ui/sonner`, `wouter`, `./components/ErrorBoundary`,
   `./contexts/ThemeContext`, `./pages/*` — none of which were copied or depended on.
   Dev served a 404; build could not resolve the imports.
2. **`jxr build` had no import map.** Bare imports (`react`, `react-dom/client`,
   `react/jsx-runtime`) were bundled with esbuild, which failed when not installed
   locally — while `jxr dev` resolves them via a browser import map. Dev and build
   were not parity.
3. **`serve` advertised but missing.** `help` listed `jxr serve`; no handler existed.
4. **`help` was not a command.** `jxr help` fell through to the usage branch (`exit 1`).
5. **pnpm workspace hijack (environmental).** A `pnpm-workspace.yaml` in `$HOME`
   caused `pnpm install` to treat `$HOME` as the workspace root.
6. **`templates/default` was not shippable / registered.** `package.json` `files`
   omitted it; `templates/package.json` workspaces omitted most template dirs.

## Fixes applied

- **`templates/default/`** (new): self-contained zero-build starter
  (`src/App.tsx`, `src/main.tsx`, `src/styles.css`, `index.html`, `tsconfig.json`,
  `package.json`, `pnpm-workspace.yaml`, `README.md`).
- **`bin/jxr.js`**:
  - `init` now copies `templates/default/` and writes the real project name +
    current framework version.
  - `help`/`version` commands added; usage text updated.
  - `serve` implemented (static server for `./dist`, correct MIME types, SPA
    fallback, cache headers).
  - `build` now defines a single source-of-truth import map and an esbuild plugin
    that marks bare imports (`react`, `react-dom/client`, `react/jsx-runtime`,
    `wouter`, `lucide-react`, …) as external CDN URLs, then emits the matching
    `<script type="importmap">` into the production `index.html`. Build no longer
    requires local React.
  - entry resolution extended to `.jsx`/`main.jsx`.
- **`package.json`**: `files` now includes `templates/default/`.
- **`templates/package.json`**: workspace list corrected (adds default, minimal,
  dashboard, crypto-notes, multi-page, cloudflare-worker).
- **`pnpm-workspace.yaml`** (repo root + `templates/default/`): pins the pnpm
  workspace root so `pnpm install` cannot walk up into an unrelated `$HOME`
  workspace.

## Verified AFTER fixes (canonical run)

```
jxr init demo            -> exit 0, 7 clean files
pnpm install             -> local ./node_modules (home node_modules NOT created)
jxr build                -> exit 0; dist/{index.html, jxr-manifest.json, assets/*}
jxr dev   (port 3291)    -> / 200, /src/App.tsx 200
jxr serve (port 3292)    -> / 200  (JS/CSS/manifest 200, correct MIME types)
jxr help                 -> exit 0
jxr version              -> 1.2.29
node --check bin/jxr.js  -> ok
pnpm run check (tsc)     -> exit 0
```

The production `dist/index.html` contains the generated import map, e.g.:

```json
{"imports":{"react":"https://esm.sh/react@19.2.4",
"react/jsx-runtime":"https://esm.sh/react@19.2.4/jsx-runtime",
"react-dom/client":"https://esm.sh/react-dom@19.2.4/client?external=react"}}
```

and the bundle references those same URLs, so dev and production resolve React
identically.

## Notes / follow-ups (not changed)

- The published `@jxrstudios/jxr@1.2.29` on the npm registry still contains the old
  `bin/jxr.js`. These fixes only reach `pnpm install -g @jxrstudios/jxr` users after
  a **version bump + `npm publish`**.
- `src/jxr-server-manager.ts` carries its own hardcoded import map for `dev`. It is a
  superset of the build map. Keeping dev/build maps generated from one module would
  remove the duplication.
- `dev` hardcodes `/src/main.tsx` when a main file is present; rename handling is a
  candidate follow-up.
- README documents `migrate`/`preview` commands that are not implemented; out of scope
  for this pass.
