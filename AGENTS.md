# AGENTS.md — Working on JXR.js

This document is the operating manual for **any** contributor — human or AI agent
(Cursor, Claude Code, Copilot, Codex, Windsurf, Roo, or a plain IDE) — working on
`@jxrstudios/jxr` or a project built with it.

It has one job: keep JXR work **precise, verifiable, and free of hallucination**.
Read it before you touch code. When a rule and a guess disagree, the rule wins.

> **Prime directive:** the repository is the single source of truth. Never assert
> how JXR behaves from memory or assumption. Open the file, read the code, run the
> command, observe the result. If you cannot verify it, say so — do not invent it.

---

## 1. The 3-Pass Quality Control protocol

Every non-trivial change (a feature, a fix, a template, a doc that ships) moves
through **three explicit passes**. Do not merge passes; each has a distinct output.
State which pass you are in before doing the work.

### Pass 1 — Recon (read, don't write)
Goal: build a *grounded* model of the current reality.
1. Locate every file involved and **read it** (use `read_file`, `search_files`,
   `list_files` — not memory).
2. Identify **all** consumers/producers of the code you will touch (e.g. both the
   CLI and the dev server consume the shared import map — find *both*).
3. Note constraints the code must respect (externally observable invariants, e.g.
   "the dev server inlines CSS in a JS template literal, so CSS must not contain
   backticks or `${`").
4. Output: a short, sourced summary — *file:line → fact*. No conclusions without a
   citation to the real file.

### Pass 2 — Design (decide, still don't write)
Goal: choose the **smallest viable change** that satisfies the intent.
1. Enumerate the real options and their blast radius.
2. Pick one; write down why, and what you are deliberately *not* doing.
3. Define the exact verification you will run in Pass 3 (commands + expected
   observable results). If you cannot describe a falsifiable check, the design is
   not done.

### Pass 3 — Execute & Verify (write, then prove)
Goal: land the change and **prove** it with observable evidence.
1. Make the change in the smallest coherent unit.
2. Run the verification you defined in Pass 2. Paste/observe the real output.
3. Report results as **facts with evidence**, never "should work".
4. If verification fails, return to Pass 1. Do not paper over it.

### Definition of done
- [ ] Recon facts are cited to files/lines.
- [ ] The change is the smallest that meets the intent.
- [ ] Dev **and** build paths are both verified when the change touches both.
- [ ] Any new invariant is written down (here or in the code comment).
- [ ] The version/docs reflect the change.

---

## 2. Zero-tolerance rules for hallucination

1. **No invented APIs.** Never call a function, flag, or export without confirming
   it exists (`search_files`). If it doesn't exist, say so.
2. **No assumed behavior.** "It probably returns X" is banned. Read the return or
   run it.
3. **No phantom files.** Reference only paths that exist. If you create one, the
   user's tool confirms it — do not claim success before confirmation.
4. **Quote, don't paraphrase, when precision matters.** Version numbers, URLs,
   import specifiers, and confirm strings must be copied exactly.
5. **Distinguish fact from inference.** Prefix unverified reasoning with
   *"Hypothesis:"* and mark what would confirm or falsify it. Then test it.
6. **Stop at the boundary of your knowledge.** "I could not verify X from the repo;
   here is what I checked" is a valid, expected answer. A confident guess is not.
7. **One source of truth per fact.** If two places define the same thing, that is a
   bug — unify them (see §4) rather than editing both and hoping.

---

## 3. JXR.js data-flow architecture (verified map)

Understand this before changing runtime behavior. Each arrow is a real hand-off.

### 3.1 Dev path — `jxr dev` (zero-build)
```
source files on disk (src/)
  └─ JXRServerManager.loadProjectFiles()      reads *.tsx/ts/jsx/js/css → VirtualFS
       └─ JXRRuntime + VirtualFS               in-memory file store
            └─ findOrCreateEntryPoint()        picks/creates src/main.tsx (etc.)
                 └─ generateHTML()             emits index.html + import map
                      └─ buildImportMap()      ← src/import-map.ts (shared)
            └─ HTTP server (JXRServerManager.start)
                 ├─ GET /                      index.html (import map + HMR + overlay)
                 ├─ GET /src/*.{tsx,ts,...}    EnhancedTranspiler (Babel) → ESM
                 │    └─ rewrites @/ → /src and bare → import-map URLs
                 ├─ GET /src/*.css             served as JS that injects <style>
                 ├─ GET /__hmr                 Server-Sent Events (reload)
                 ├─ GET /__health              status JSON
                 ├─ GET /__jxr/templates       catalog + inline template source (NEW)
                 └─ POST /__jxr/apply-template backup src/ → drop-in → reload (NEW)
```
Key facts:
- The browser resolves bare specifiers (`react`, `@radix-ui/*`, `wouter`, …) via
  the **import map** generated by `buildImportMap()`.
- CSS is inlined into a **JavaScript template literal** server-side. **CSS must not
  contain backticks or `${`** or it breaks the dev server. Verify after editing:
  `grep -c '`' file.css` and `grep -c '\${' file.css` must both be `0`.
- The **dev overlay** (gear button → template command palette) is injected by the
  dev server only. It is part of `generateHTML()` output and therefore can never
  appear in a production bundle.

### 3.2 Build path — `jxr build` (esbuild)
```
findEntryFile() / assertJxrProject()          fail fast outside a project
  └─ esbuild (bundle, ESM, split, hashed)
       └─ jxr-import-map plugin               bare imports → esm.sh URL + external
            └─ externalBare set                only *used* specifiers recorded
  └─ emits: index.html (import map for externals) + assets/* + jxr-manifest.json
       └─ manifest signed with ECDSA-P256 (crypto.sign)
```

### 3.3 The single-source-of-truth map
| Fact | Defined once in | Consumed by |
|------|-----------------|-------------|
| Module URLs (import map) | `src/import-map.ts` (`IMPORT_MAP`) | `bin/jxr.js` build plugin, `JXRServerManager` dev HTML |
| Template catalog | `src/template-registry.ts` (`JXR_TEMPLATES`) | CLI `jxr init`, dev `/__jxr/templates`, overlay + palette |
| Entry-point candidates | `bin/jxr.js` (`ENTRY_CANDIDATES`) | `jxr build`, `jxr dev` guard |

> If you need the same fact in a second place, **export it from the owning module**
> and import it — never copy it. Copied lists drift (this already happened once
> between dev and build import maps).

### 3.4 Runtime modules (used in generated apps)
- `JXRRuntime` — module resolution + metrics broadcasting.
- `VirtualFS` — in-memory file store (`write`/`read`/`list`/`clear`).
- `EnhancedTranspiler` — Babel-based TS/JSX → ESM.
- `JXRCrypto` / `jxrCrypto` — Web Crypto hashing, signing, verification.
- `WorkerPool`, `MoQTransport` — worker orchestration + streaming transport.
- `JXRDeployer` — Cloudflare/Deno/Node deploy (Node-only; imports `fs`/`child_process`).

**Node-only boundary:** anything that imports `fs`, `path`, `http`,
`child_process`, or the framework barrel (`@jxrstudios/jxr`) **cannot** run directly
in the browser import map without shims/Babel. Templates that do this are marked
`browserPreview: false` in the registry and are not offered for live in-app preview.

---

## 4. Change playbooks

### Add or change a template
1. Create `templates/<id>/` with `src/` + `package.json` (+ `tsconfig.json`,
   `styles.css` as needed). `src/main.tsx` or `src/App.tsx` must exist.
2. Add a `JXRTemplateMeta` entry in `src/template-registry.ts` (id, name,
   description, tags, accent, kind, **browserPreview**).
3. Set `browserPreview: true` **only if** the template renders in a browser with
   no Node-side imports (no `@jxrstudios/jxr`, no `fs`, no console-only entry).
4. `templates/` is published wholesale (`package.json` → `files: ["templates/"]`),
   so no other packaging change is needed.
5. Verify: `jxr init <name> --template=<id> --yes` then `jxr build` inside it.

### Change the import map
Edit `src/import-map.ts` only. Rebuild (`pnpm run build`). Verify **both**:
- dev: a file importing the specifier returns `200` with a `Transform error` count of `0`, and the HTML contains the URL;
- build: `grep <specifier> dist/index.html` (import map) and the specifier is `external` in the bundle.

### Touch dev-server HTML/CSS handling
Remember the template-literal constraint. After editing, run the template-literal
safety check on any CSS, and load `/` + a `.tsx` route to confirm `200`s.

---

## 5. Verification recipes (copy/paste)

```bash
# Framework typecheck + build
pnpm run build

# Scaffold a template and build it (repeat per template)
rm -rf /tmp/jxr-check && mkdir -p /tmp/jxr-check && cd /tmp/jxr-check
node /path/to/jxr-js/bin/jxr.js init app --template=default --yes
cd app && node /path/to/jxr-js/bin/jxr.js build

# Dev endpoints + overlay (run inside a scaffolded app)
node /path/to/jxr-js/bin/jxr.js dev --port=3111 &
curl -s localhost:3111/__health
curl -s localhost:3111/__jxr/templates | head -c 400
curl -s localhost:3111/ | grep -c "__JXR_OVERLAY__"        # expect >= 1
curl -s -X POST localhost:3111/__jxr/apply-template \
  -H 'Content-Type: application/json' -d '{"id":"minimal"}'   # expect ok:true

# Production build must NOT contain the overlay
grep -c "__JXR_OVERLAY__" dist/index.html                  # expect 0

# Template-literal safety for any stylesheet the dev server inlines
grep -c '`'   src/styles.css ; true                        # expect 0
grep -c '\${' src/styles.css ; true                        # expect 0
```

---

## 6. Reporting format

When you hand back work, use this shape so a reviewer can re-verify without trust:

```
Pass: 1 | 2 | 3
Changed: <files> (what + why, one line each)
Evidence: <exact command> → <observed output / expected value>
Invariants checked: <e.g. dev+build parity, template-literal safety>
Unverified / open: <anything you could not confirm, stated plainly>
```

Never write "done" next to something you did not observe. An honest gap is worth
more than a confident error.

---

## 7. For AI coding tools

If you are an agent operating in this repository:
- Treat this file as a **skill**: load it, then follow §1 for the current task.
- Prefer reading real files over recalling. The repo may be newer than your training.
- Keep the single-source-of-truth table (§3.3) true. If you add a second copy of a
  fact, you have created a bug — refactor to one source instead.
- When you finish, produce the §6 report. If asked to skip verification, state the
  risk explicitly and proceed only if the user confirms.
