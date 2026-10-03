/**
 * JXR template registry — the single source of truth for the official starter
 * templates shipped inside the package (`templates/<id>/`).
 *
 * Both consumers read from here so they can never drift:
 *   • the CLI (`jxr init --template=<id>`, `jxr init --list`, interactive picker)
 *   • the dev server / Template Explorer (`GET /__jxr/templates`,
 *     `GET /__jxr/preview/<id>`, `POST /__jxr/apply-template`)
 *
 * Keeping the catalog data-only (no imports, no side effects) means it can be
 * imported from Node ESM (bin/jxr.js via dist) without pulling in the runtime.
 */

export type TemplateKind = "web" | "worker" | "native" | "vanilla";

export interface JXRTemplateMeta {
  /** Folder name inside `templates/` and the value passed to `--template`. */
  id: string;
  /** Human-friendly label shown in the CLI + command palette. */
  name: string;
  /** One-line summary of what the template demonstrates. */
  description: string;
  /** Search keywords (also surfaced to the command palette). */
  tags: string[];
  /** Accent color used by the dev overlay / palette swatch. */
  accent: string;
  /** Broad category; `native`/`vanilla` templates are not web-drop-in safe. */
  kind: TemplateKind;
  /**
   * Whether the Template Explorer can render this template live in an isolated
   * sandboxed iframe (`GET /__jxr/preview/<id>`). False for templates that
   * import the Node-side framework runtime (served from esm.sh with Babel +
   * Node shims) or that target a non-browser platform — those still get a
   * source preview and remain available via `jxr init --template=<id>`.
   */
  livePreview: boolean;
  /**
   * Why a template cannot be live-previewed (surfaced in the source preview so
   * the developer can still make an informed choice). Omitted when
   * `livePreview` is true.
   */
  previewNote?: string;
  /** Entry file inside `src/` used to render the live preview. */
  entry: string;
}

/**
 * The official catalog. Order here is the order shown everywhere (CLI list,
 * interactive picker, Template Explorer, command palette).
 */
export const JXR_TEMPLATES: JXRTemplateMeta[] = [
  {
    id: "default",
    name: "Styled Starter",
    description:
      "Themed starter with Lotus/Ember/Aurora metal presets, a Radix command palette (⌘K) and zero-install UI primitives.",
    tags: ["styled", "command-palette", "radix", "shader", "metal", "aurora", "starter"],
    accent: "#a855f7",
    kind: "web",
    livePreview: true,
    entry: "src/main.tsx",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Bare counter app — the fastest possible starting point.",
    tags: ["minimal", "counter", "small", "hello-world"],
    accent: "#ea580c",
    kind: "web",
    livePreview: true,
    entry: "src/main.tsx",
  },
  {
    id: "dashboard",
    name: "Runtime Dashboard",
    description:
      "Live runtime metrics, worker-pool stats and MoQ transport status in tabs.",
    tags: ["dashboard", "metrics", "worker-pool", "moq", "runtime"],
    accent: "#f97316",
    kind: "web",
    livePreview: false,
    previewNote:
      "Imports the JXR runtime (jxrRuntime) — a Node-side module that esm.sh cannot serve browser-safe. Scaffold with `jxr init --template=dashboard` to run it.",
    entry: "src/main.tsx",
  },
  {
    id: "crypto-notes",
    name: "Crypto Notes",
    description:
      "Encrypted notes persisted through the VirtualFS using Web Crypto (JXRCrypto).",
    tags: ["crypto", "encryption", "notes", "virtualfs", "web-crypto"],
    accent: "#22c55e",
    kind: "web",
    livePreview: false,
    previewNote:
      "Uses jxrCrypto from the JXR runtime — a Node-side module that esm.sh cannot serve browser-safe. Scaffold with `jxr init --template=crypto-notes`.",
    entry: "src/main.tsx",
  },
  {
    id: "multi-page",
    name: "Multi-Page",
    description: "Client-side routing with wouter — Home / About / 404.",
    tags: ["routing", "wouter", "multi-page", "spa"],
    accent: "#06b6d4",
    kind: "web",
    livePreview: true,
    entry: "src/main.tsx",
  },
  {
    id: "cloudflare-worker",
    name: "Cloudflare Worker",
    description:
      "Edge function starter targeted at Cloudflare Workers (jxr build/deploy).",
    tags: ["cloudflare", "edge", "worker", "deploy", "wranglerless"],
    accent: "#f59e0b",
    kind: "worker",
    livePreview: true,
    entry: "src/main.tsx",
  },
  {
    id: "typescript",
    name: "TypeScript",
    description: "Plain TypeScript (no JSX) entry point with strict typing.",
    tags: ["typescript", "ts", "strict"],
    accent: "#3b82f6",
    kind: "vanilla",
    livePreview: false,
    previewNote:
      "Console-only entry (no DOM output) that prints to stdout under Node — run it with `jxr build` + `node`, not in a browser.",
    entry: "src/main.ts",
  },
  {
    id: "javascript",
    name: "JavaScript",
    description: "Plain JavaScript (no JSX) entry point for the smallest bundle.",
    tags: ["javascript", "js", "plain"],
    accent: "#eab308",
    kind: "vanilla",
    livePreview: false,
    previewNote:
      "Console-only entry (no DOM output) that prints to stdout under Node — run it with `jxr build` + `node`, not in a browser.",
    entry: "src/main.js",
  },
  {
    id: "jsx",
    name: "JSX",
    description: "Plain JSX (no TypeScript) — React components as .jsx files.",
    tags: ["jsx", "react", "javascript"],
    accent: "#8b5cf6",
    kind: "web",
    livePreview: false,
    previewNote:
      "The demo component imports MoQTransport from the JXR runtime — a Node-side module esm.sh cannot serve browser-safe.",
    entry: "src/main.jsx",
  },
  {
    id: "tsx",
    name: "TSX",
    description: "TypeScript + JSX (React) entry point as .tsx files.",
    tags: ["tsx", "react", "typescript"],
    accent: "#6366f1",
    kind: "web",
    livePreview: false,
    previewNote:
      "The demo component imports jxrRuntime from the JXR runtime — a Node-side module esm.sh cannot serve browser-safe.",
    entry: "src/main.tsx",
  },
  {
    id: "react-native",
    name: "React Native",
    description:
      "React Native starter (jxr build --platform=native); not web drop-in.",
    tags: ["react-native", "native", "mobile"],
    accent: "#0ea5e9",
    kind: "native",
    livePreview: false,
    previewNote:
      "Targets React Native via AppRegistry — there is no DOM/HTML output to preview in a browser.",
    entry: "src/main.tsx",
  },
];

/** Look up a template by id; returns undefined when unknown. */
export function getTemplate(id: string): JXRTemplateMeta | undefined {
  return JXR_TEMPLATES.find((template) => template.id === id);
}

/** All template ids, in catalog order. */
export function listTemplateIds(): string[] {
  return JXR_TEMPLATES.map((template) => template.id);
}

/**
 * Templates the Template Explorer can render live in an isolated iframe.
 * Excludes native/non-web targets and templates that import the Node-side
 * framework runtime (which esm.sh serves with Babel + Node shims). Everything
 * remains available via `jxr init --template=<id>` and the source preview.
 */
export function listPreviewableTemplates(): JXRTemplateMeta[] {
  return JXR_TEMPLATES.filter((template) => template.livePreview);
}

/** Whether an arbitrary string is a known, safe-to-use template id. */
export function isValidTemplateId(id: string): boolean {
  return JXR_TEMPLATES.some((template) => template.id === id);
}
