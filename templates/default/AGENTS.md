# AGENTS.md — Working in this JXR.js project

This project is built on `@jxrstudios/jxr` (the JXR.js Edge OS Runtime Framework).
This file is the operating manual for any contributor — human or AI coding tool
(Cursor, Claude Code, Copilot, Codex, Windsurf, Roo, or a plain IDE).

Its single purpose: keep work **precise, verifiable, and free of hallucination**.

> **Prime directive:** the files on disk are the single source of truth. Never
> assert how the runtime behaves from memory. Read the file, run the command,
> observe the result. If you cannot verify it, say so — do not invent it.

---

## 1. The 3-Pass Quality Control protocol

Every non-trivial change goes through three explicit passes. Announce the pass you
are in. Do not skip Pass 1.

- **Pass 1 — Recon (read only).** Read every involved file. Find all consumers of
  what you will change. Record constraints (see §3). Output: sourced facts,
  `file:line → fact`.
- **Pass 2 — Design (decide only).** Choose the smallest viable change. Define the
  exact verification commands and their expected observable results.
- **Pass 3 — Execute & Verify.** Make the change, run the checks, report results as
  facts with evidence — never "should work".

### Done means
- [ ] Facts cited to files.
- [ ] Smallest change that meets intent.
- [ ] Dev **and** production paths both verified if both are affected.
- [ ] No unverified claim left in the report.

---

## 2. Zero-tolerance rules

1. No invented APIs, flags, or exports — confirm they exist first.
2. No assumed behavior — run it or read the return.
3. No phantom files — reference only what exists.
4. Copy exact strings for versions, URLs, import specifiers.
5. Mark any unverified reasoning as *"Hypothesis:"* and then test it.
6. "I could not verify X; here is what I checked" is a valid answer.
7. One source of truth per fact — never duplicate a list/config.

---

## 3. How this project runs (verified data flow)

### Development — `jxr dev`
- Source files in `src/` are loaded into an in-memory VirtualFS, transformed
  on demand (Babel), and served as ES modules. **No build step.**
- Bare imports (`react`, `react-dom/client`, `@radix-ui/*`, `lucide-react`,
  `wouter`, …) resolve through a **browser import map** injected into the HTML.
  You do **not** need to install them locally for the dev server to work, but do
  list anything you use in `package.json` for production builds.
- CSS is served as JavaScript that injects a `<style>` tag. **CSS files must not
  contain backticks or `${`** — they are inlined into a JS template literal
  server-side. Verify after editing CSS:
  `grep -c '`' src/styles.css` and `grep -c '\${' src/styles.css` → both `0`.
- The `@/` path alias maps to `src/` (e.g. `@/components/ui/Button`).
- A **dev-only overlay** floats in the corner: a gear button (or press `H`) opens a
  command palette that lists the official JXR templates. Choosing one asks for
  permanent-choice confirmation, then drops it into `src/` (your current `src/` is
  backed up to `.jxr/backup-<timestamp>/`). This overlay is injected by the dev
  server only — it never appears in a production build.

### Production — `jxr build`
- esbuild bundles `src/main.tsx` (or the first entry in `src/`) to `dist/` with
  hashed assets and a crypto-signed `jxr-manifest.json`.
- Imports covered by the shared import map are rewritten to their CDN URL and left
  **external**; the emitted `index.html` carries an import map with only the
  specifiers you actually used. Everything else is bundled.
- Served with `jxr serve` (from `dist/`).

### File map
```
src/main.tsx        entry — mounts <App/> and imports styles
src/App.tsx         root component
src/styles.css      global styles (template-literal-safe: no ` or ${)
src/components/     UI + feature components
src/lib/            helpers (e.g. cn())
package.json        scripts: dev / build / deploy
```

---

## 4. Working rules for this project

- **Add a dependency?** Put it in `package.json` *and* (if used at runtime in the
  browser) confirm it is in the framework import map, otherwise it will fail to
  resolve under `jxr dev`. Imports under `@/…` are local files, not packages.
- **Radix / UI primitives** resolve through the import map — no install required.
- **Edit `src/App.tsx` and save** → HMR reloads instantly.
- **Preview another template** with the dev overlay gear (press `H`), or scaffold a
  fresh project with `jxr init my-app --template=<id>` (`jxr init --list` to see
  the catalog). Template choice at `jxr init` is permanent — switch only via the
  dev overlay (which backs up `src/`) or by starting a fresh project.

---

## 5. Verification recipes

```bash
jxr dev --port=3111        # then, in another shell:
curl -s localhost:3111/__health
curl -s localhost:3111/ | grep -c "__JXR_OVERLAY__"   # expect >= 1
curl -s -X POST localhost:3111/__jxr/apply-template \
  -H 'Content-Type: application/json' -d '{"id":"minimal"}'   # expect ok:true

jxr build                  # production
grep -c "__JXR_OVERLAY__" dist/index.html             # expect 0

grep -c '`'   src/styles.css ; true                   # expect 0
grep -c '\${' src/styles.css ; true                   # expect 0
```

---

## 6. Report format

```
Pass: 1 | 2 | 3
Changed: <files> (what + why)
Evidence: <command> → <observed result>
Invariants checked: <dev/build parity, CSS literal safety, import-map coverage>
Unverified / open: <anything you could not confirm>
```

An honest gap beats a confident error.
