/**
 * JXR template registry — the single source of truth for the official starter
 * templates shipped inside the package (`templates/<id>/`).
 *
 * Both consumers read from here so they can never drift:
 *   • the CLI (`jxr init --template=<id>`, `jxr init --list`, interactive picker)
 *   • the dev server (`GET /__jxr/templates`, `POST /__jxr/apply-template`)
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
   * Whether this template can be live-previewed / dropped into a running web
   * app by the dev overlay. False for templates that import the Node-side
   * framework runtime (served from esm.sh with Babel + Node shims) or that
   * target a non-browser platform — those are still available via
   * `jxr init --template=<id>`.
   */
  browserPreview: boolean;
}

/**
 * The official catalog. Order here is the order shown everywhere (CLI list,
 * interactive picker, dev overlay, command palette).
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
    browserPreview: true,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Bare counter app — the fastest possible starting point.",
    tags: ["minimal", "counter", "small", "hello-world"],
    accent: "#ea580c",
    kind: "web",
    browserPreview: true,
  },
  {
    id: "dashboard",
    name: "Runtime Dashboard",
    description:
      "Live runtime metrics, worker-pool stats and MoQ transport status in tabs.",
    tags: ["dashboard", "metrics", "worker-pool", "moq", "runtime"],
    accent: "#f97316",
    kind: "web",
    browserPreview: false,
  },
  {
    id: "crypto-notes",
    name: "Crypto Notes",
    description:
      "Encrypted notes persisted through the VirtualFS using Web Crypto (JXRCrypto).",
    tags: ["crypto", "encryption", "notes", "virtualfs", "web-crypto"],
    accent: "#22c55e",
    kind: "web",
    browserPreview: false,
  },
  {
    id: "multi-page",
    name: "Multi-Page",
    description: "Client-side routing with wouter — Home / About / 404.",
    tags: ["routing", "wouter", "multi-page", "spa"],
    accent: "#06b6d4",
    kind: "web",
    browserPreview: true,
  },
  {
    id: "cloudflare-worker",
    name: "Cloudflare Worker",
    description:
      "Edge function starter targeted at Cloudflare Workers (jxr build/deploy).",
    tags: ["cloudflare", "edge", "worker", "deploy", "wranglerless"],
    accent: "#f59e0b",
    kind: "worker",
    browserPreview: true,
  },
  {
    id: "typescript",
    name: "TypeScript",
    description: "Plain TypeScript (no JSX) entry point with strict typing.",
    tags: ["typescript", "ts", "strict"],
    accent: "#3b82f6",
    kind: "web",
    browserPreview: false,
  },
  {
    id: "javascript",
    name: "JavaScript",
    description: "Plain JavaScript (no JSX) entry point for the smallest bundle.",
    tags: ["javascript", "js", "plain"],
    accent: "#eab308",
    kind: "web",
    browserPreview: false,
  },
  {
    id: "jsx",
    name: "JSX",
    description: "Plain JSX (no TypeScript) — React components as .jsx files.",
    tags: ["jsx", "react", "javascript"],
    accent: "#8b5cf6",
    kind: "web",
    browserPreview: false,
  },
  {
    id: "tsx",
    name: "TSX",
    description: "TypeScript + JSX (React) entry point as .tsx files.",
    tags: ["tsx", "react", "typescript"],
    accent: "#6366f1",
    kind: "web",
    browserPreview: false,
  },
  {
    id: "react-native",
    name: "React Native",
    description:
      "React Native starter (jxr build --platform=native); not web drop-in.",
    tags: ["react-native", "native", "mobile"],
    accent: "#0ea5e9",
    kind: "native",
    browserPreview: false,
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
 * Templates that can be live-previewed / dropped into a running web project by
 * the dev overlay. Excludes native/non-web targets and templates that import
 * the Node-side framework runtime (which esm.sh serves with Babel + Node shims).
 * Everything remains available via `jxr init --template=<id>`.
 */
export function listPreviewableTemplates(): JXRTemplateMeta[] {
  return JXR_TEMPLATES.filter((template) => template.browserPreview);
}

/** Whether an arbitrary string is a known, safe-to-use template id. */
export function isValidTemplateId(id: string): boolean {
  return JXR_TEMPLATES.some((template) => template.id === id);
}
