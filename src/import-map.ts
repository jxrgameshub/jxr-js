/**
 * JXR.js — shared browser import map.
 *
 * This is the SINGLE SOURCE OF TRUTH for bare-specifier resolution. Both the
 * zero-build dev server (JXRServerManager) and the production bundler
 * (bin/jxr.js) consume it, so a project that runs under `jxr dev` resolves
 * exactly the same modules under `jxr build`.
 *
 * Every entry is an esm.sh URL. `?external=react,react-dom` keeps React
 * external so those packages share the single React instance pinned below;
 * otherwise esm.sh would bundle a second copy and hooks would break.
 */
export const IMPORT_MAP: Record<string, string> = {
  react: "https://esm.sh/react@19.2.4",
  "react/jsx-runtime": "https://esm.sh/react@19.2.4/jsx-runtime",
  "react/jsx-dev-runtime": "https://esm.sh/react@19.2.4/jsx-dev-runtime",
  "react-dom": "https://esm.sh/react-dom@19.2.4?external=react",
  "react-dom/client": "https://esm.sh/react-dom@19.2.4/client?external=react",

  wouter: "https://esm.sh/wouter@3.6.0?external=react",
  "lucide-react": "https://esm.sh/lucide-react@0.483.0?external=react",
  sonner: "https://esm.sh/sonner@2.0.1?external=react,react-dom",
  "next-themes": "https://esm.sh/next-themes@0.4.6?external=react",

  "framer-motion": "https://esm.sh/framer-motion@12.5.0?external=react,react-dom",
  "motion-dom": "https://esm.sh/motion-dom@12.5.0",

  clsx: "https://esm.sh/clsx@2.1.1",
  "tailwind-merge": "https://esm.sh/tailwind-merge@3.0.2",
  "class-variance-authority": "https://esm.sh/class-variance-authority@0.7.1",

  "@radix-ui/react-dialog": "https://esm.sh/@radix-ui/react-dialog@1.1.6?external=react,react-dom",
  "@radix-ui/react-dropdown-menu":
    "https://esm.sh/@radix-ui/react-dropdown-menu@2.1.6?external=react,react-dom",
  "@radix-ui/react-tooltip": "https://esm.sh/@radix-ui/react-tooltip@1.1.8?external=react,react-dom",
  "@radix-ui/react-slot": "https://esm.sh/@radix-ui/react-slot@1.1.2?external=react,react-dom",
  "@radix-ui/react-label": "https://esm.sh/@radix-ui/react-label@2.1.2?external=react,react-dom",
  "@radix-ui/react-popover": "https://esm.sh/@radix-ui/react-popover@1.1.6?external=react,react-dom",
  "@radix-ui/react-separator":
    "https://esm.sh/@radix-ui/react-separator@1.1.2?external=react,react-dom",
  "@radix-ui/react-switch": "https://esm.sh/@radix-ui/react-switch@1.1.3?external=react,react-dom",
  "@radix-ui/react-tabs": "https://esm.sh/@radix-ui/react-tabs@1.1.3?external=react,react-dom",
  "@radix-ui/react-scroll-area":
    "https://esm.sh/@radix-ui/react-scroll-area@1.2.3?external=react,react-dom",
  "@radix-ui/react-visually-hidden":
    "https://esm.sh/@radix-ui/react-visually-hidden@1.1.2?external=react,react-dom",
};

/** Bare specifier roots that the browser import map can resolve. */
export const IMPORT_MAP_KEYS: string[] = Object.keys(IMPORT_MAP).sort((a, b) => b.length - a.length);

/** True when a specifier is a bare package name (not relative, aliased or a URL). */
export function isBareSpecifier(spec: string): boolean {
  return (
    !spec.startsWith(".") &&
    !spec.startsWith("/") &&
    !spec.startsWith("@/") &&
    !spec.startsWith("http")
  );
}

/** Map a bare specifier (optionally with a subpath) to its import-map root key. */
export function mapToImportMapKey(spec: string): string | undefined {
  return IMPORT_MAP_KEYS.find((key) => spec === key || spec.startsWith(key + "/"));
}

/** The `{ imports: ... }` payload injected into a `<script type="importmap">`. */
export function buildImportMap(only?: Iterable<string>): { imports: Record<string, string> } {
  if (!only) return { imports: { ...IMPORT_MAP } };
  const imports: Record<string, string> = {};
  for (const key of only) {
    if (IMPORT_MAP[key]) imports[key] = IMPORT_MAP[key];
  }
  return { imports };
}
