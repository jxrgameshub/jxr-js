import { readFile, readdir, watch, mkdir, rm, cp, stat } from "fs/promises";
import type { Dirent } from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import {
  JXRRuntime,
  findOrCreateEntryPoint,
  EnhancedTranspiler,
  buildImportMap,
} from "./index.ts";
import type { ProjectFile } from "./index.ts";
import {
  JXR_TEMPLATES,
  getTemplate,
  isValidTemplateId,
} from "./template-registry.ts";
import type { JXRTemplateMeta } from "./template-registry.ts";
import { buildExplorerScript } from "./template-explorer.ts";

export interface JXRServerConfig {
  port?: number;
  host?: string;
  srcDir?: string;
  enableHMR?: boolean;
  debounceMs?: number;
  /**
   * Inject the dev-only JXR overlay (floating gear → template command palette).
   * Only ever rendered by `jxr dev`; `jxr build` never runs this server, so the
   * overlay can never reach a production bundle.
   */
  overlay?: boolean;
}

/** Regex for the text files we mirror into the VirtualFS / serve as modules. */
const TEMPLATE_FILE_RE = /\.(tsx?|jsx?|css)$/;

/** Absolute path to the framework's bundled `templates/` directory. */
function resolveTemplatesDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, "..", "templates");
}

/** One file inside a template bundle (path is relative to `src/`). */
interface TemplateFile {
  path: string;
  content: string;
}

/** A catalog entry returned by `GET /__jxr/templates`. `files` is only
 * included when the template can be live-previewed (keeps payloads small). */
interface TemplateCatalogEntry {
  id: string;
  name: string;
  description: string;
  tags: string[];
  accent: string;
  kind: JXRTemplateMeta["kind"];
  livePreview: boolean;
  previewNote?: string;
  entry: string;
  files: TemplateFile[];
}

/** Escape a string for safe embedding inside a `"…"` JS string literal. */
function escapeForDoubleQuoted(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export class JXRServerManager {
  private runtime: JXRRuntime;
  private transpiler: EnhancedTranspiler;
  private server: http.Server | null = null;
  private config: Required<JXRServerConfig>;
  private projectFiles: ProjectFile[] = [];
  private entryPoint: string = "src/App.tsx";
  private watchers: Map<string, ReturnType<typeof watch>> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingChanges: Map<string, ProjectFile> = new Map();
  private clients: Set<http.ServerResponse> = new Set();
  private templateCache: TemplateCatalogEntry[] | null = null;

  constructor(config: JXRServerConfig = {}) {
    this.config = {
      port: config.port || 3000,
      host: config.host || "localhost",
      srcDir: config.srcDir || "src",
      enableHMR: config.enableHMR !== false,
      debounceMs: config.debounceMs || 300,
      overlay: config.overlay !== false,
    };
    this.runtime = new JXRRuntime();
    this.transpiler = new EnhancedTranspiler();
  }

  async initialize(): Promise<void> {
    await this.runtime.init();
    await this.loadProjectFiles();
    this.setupEntryPoint();
    if (this.config.enableHMR) {
      this.startFileWatching();
    }
  }

  private async loadProjectFiles(): Promise<void> {
    const srcPath = path.resolve(process.cwd(), this.config.srcDir);
    this.projectFiles = [];

    async function readDirRecursive(dir: string, base: string, files: ProjectFile[], runtime: JXRRuntime) {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(base, entry.name);
        
        if (entry.isDirectory()) {
          await readDirRecursive(fullPath, relativePath, files, runtime);
        } else if (/\.(tsx?|jsx?|css)$/.test(entry.name)) {
          const content = await readFile(fullPath, "utf-8");
          const vfsPath = "/" + relativePath.replace(/\\/g, "/");
          runtime.vfs.write(vfsPath, content);
          
          files.push({
            id: Math.random().toString(36).slice(2),
            path: relativePath.replace(/\\/g, "/"),
            content,
            language: entry.name.endsWith(".tsx") || entry.name.endsWith(".ts") ? "typescript" : "javascript",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    }

    try {
      await readDirRecursive(srcPath, this.config.srcDir, this.projectFiles, this.runtime);
      console.log(`📁 Loaded ${this.projectFiles.length} files into VirtualFS`);
    } catch (err) {
      console.error("Error loading files:", err);
    }
  }

  private setupEntryPoint(): void {
    const result = findOrCreateEntryPoint(this.projectFiles);
    this.entryPoint = result.entryPoint;
    
    // If a new entry was created, add it to VFS
    if (result.createdEntry) {
      const entryFile = result.files.find(f => f.path === this.entryPoint);
      if (entryFile) {
        this.runtime.vfs.write("/" + entryFile.path, entryFile.content);
      }
    }
    
    console.log(`🎯 Entry point: ${this.entryPoint}`);
  }

  /**
   * Drop every cached file for the project so we can re-load a fresh template
   * from disk without restarting the dev server.
   */
  private resetProjectState(): void {
    this.runtime.vfs.clear();
    this.transpiler.clearCache();
    this.projectFiles = [];
    this.entryPoint = "src/App.tsx";
    this.pendingChanges.clear();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Recursively read every text file we care about (`tsx/ts/jsx/js/css`) from a
   * directory, returning paths relative to `root` in POSIX form.
   */
  private async readDirectoryFiles(
    dir: string,
    root: string
  ): Promise<Array<{ path: string; content: string }>> {
    const out: Array<{ path: string; content: string }> = [];
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return out;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        out.push(...(await this.readDirectoryFiles(full, root)));
      } else if (TEMPLATE_FILE_RE.test(entry.name)) {
        out.push({
          path: path.relative(root, full).replace(/\\/g, "/"),
          content: await readFile(full, "utf-8"),
        });
      }
    }
    return out;
  }

  /**
   * Build the FULL template catalog (all templates, not just previewable ones)
   * so the Template Explorer can list every option. Source files are bundled
   * inline only for live-previewable templates (keeps the payload small). Runs
   * once, lazily, on first hit of the template endpoint, then caches.
   */
  private async buildTemplateCatalog(): Promise<TemplateCatalogEntry[]> {
    if (this.templateCache) return this.templateCache;
    const templatesDir = resolveTemplatesDir();
    const catalog: TemplateCatalogEntry[] = [];
    for (const meta of JXR_TEMPLATES) {
      // Always bundle source: live previews need it to transpile, and every
      // other template uses it for the source (file tree + code) preview.
      const srcDir = path.join(templatesDir, meta.id, "src");
      const files = await this.readDirectoryFiles(srcDir, srcDir);
      catalog.push({
        id: meta.id,
        name: meta.name,
        description: meta.description,
        tags: meta.tags,
        accent: meta.accent,
        kind: meta.kind,
        livePreview: meta.livePreview,
        previewNote: meta.previewNote,
        entry: meta.entry,
        files,
      });
    }
    this.templateCache = catalog;
    return catalog;
  }

  /**
   * Rewrite a transpiled template module's imports/exports so it can be served
   * from the isolated `/__jxr/preview/` namespace. The bundled transpiler
   * rewrites relative + `@/` imports to project-root-absolute paths (`/src/…`,
   * without extension); here we (1) prefix every `/src/` reference with the
   * preview base and (2) append the extension the preview resolver expects.
   * Bare specifiers (react, wouter, …) are left untouched for the import map.
   */
  private rewritePreviewCode(code: string, base: string): string {
    return code.replace(
      /(["'])\/src\/([^"']+)\1/g,
      (match: string, quote: string, rest: string) => {
        const hasExt = /\.(tsx?|jsx?|css)$/.test(rest);
        return `${quote}${base}/src/${rest}${hasExt ? "" : ".tsx"}${quote}`;
      }
    );
  }

  /**
   * Resolve a requested preview module path to its actual extension within a
   * template bundle. Order mirrors how the explorer lists files so that
   * extensionless imports resolve deterministically.
   */
  private resolvePreviewModule(
    files: TemplateFile[],
    modulePath: string
  ): TemplateFile | undefined {
    const exact = files.find((f) => f.path === modulePath);
    if (exact) return exact;
    const extOrder = [".tsx", ".ts", ".jsx", ".js", ".css"];
    // The transpiler strips the original extension and rewritePreviewCode
    // re-adds ".tsx", so the requested path may carry a wrong extension
    // (e.g. lib/utils.tsx when the file is lib/utils.ts). Try both the raw
    // path and its extension-stripped base against every known extension.
    const base = modulePath.replace(/\.(tsx?|jsx?|css)$/, "");
    for (const ext of extOrder) {
      const candidate =
        files.find((f) => f.path === base + ext) ??
        files.find((f) => f.path === modulePath + ext);
      if (candidate) return candidate;
    }
    return undefined;
  }

  /**
   * Self-contained HTML document for a live template preview. Rendered inside a
   * sandboxed iframe by the Template Explorer — never part of the running app.
   */
  private generatePreviewHTML(
    meta: JXRTemplateMeta,
    files: TemplateFile[],
    previewBase: string
  ): string {
    const importMap = buildImportMap();
    // `entry` is stored relative to src/ (e.g. "src/main.tsx"); strip the src/
    // prefix so it can be appended to the preview base.
    const entryPath = meta.entry.replace(/^src\//, "");
    const stylesheet = files.some((f) => f.path === "src/styles.css")
      ? `\n  <link rel="stylesheet" href="${previewBase}/src/styles.css">`
      : "";
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JXR preview — ${meta.name}</title>
  <style>html,body{margin:0;min-height:100%}#root{min-height:100vh}</style>${stylesheet}
  <script type="importmap">
    ${JSON.stringify(importMap)}
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${previewBase}/src/${entryPath}"></script>
</body>
</html>`;
  }

  /**
   * Swap the running project to another template: backup the current `src/`
   * (so the choice is reversible on disk), clear the backup dir, write the new
   * template files, refresh the VirtualFS and signal the browser to reload.
   */
  private async applyTemplate(
    id: string
  ): Promise<{ ok: boolean; error?: string; backupDir?: string; fileCount?: number }> {
    if (!isValidTemplateId(id)) {
      return { ok: false, error: `Unknown template "${id}".` };
    }
    const templatesDir = resolveTemplatesDir();
    const templateSrc = path.join(templatesDir, id, "src");
    let templateStat: Awaited<ReturnType<typeof stat>>;
    try {
      templateStat = await stat(templateSrc);
    } catch {
      return { ok: false, error: `Template "${id}" has no src/ directory.` };
    }
    if (!templateStat.isDirectory()) {
      return { ok: false, error: `Template "${id}" has no src/ directory.` };
    }

    const projectSrc = path.resolve(process.cwd(), this.config.srcDir);
    const timestamp = Date.now();
    const backupDir = path.resolve(
      process.cwd(),
      ".jxr",
      `backup-${timestamp}`
    );

    try {
      const projectSrcStat = await stat(projectSrc).catch(() => null);
      if (projectSrcStat?.isDirectory()) {
        await mkdir(path.dirname(backupDir), { recursive: true });
        await cp(projectSrc, backupDir, { recursive: true });
      }

      // Clean any previous backups so only the most recent one is retained.
      const jxrDir = path.resolve(process.cwd(), ".jxr");
      const backups = (await readdir(jxrDir, { withFileTypes: true }).catch(() => []))
        .filter((entry) => entry.isDirectory() && entry.name.startsWith("backup-"))
        .filter((entry) => path.join(jxrDir, entry.name) !== backupDir);
      for (const stale of backups) {
        await rm(path.join(jxrDir, stale.name), { recursive: true, force: true });
      }

      await rm(projectSrc, { recursive: true, force: true });
      await cp(templateSrc, projectSrc, { recursive: true });
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }

    this.resetProjectState();
    await this.loadProjectFiles();
    this.setupEntryPoint();
    this.templateCache = null;
    this.broadcastReload();

    return { ok: true, backupDir, fileCount: this.projectFiles.length };
  }

  private startFileWatching(): void {
    const srcPath = path.resolve(process.cwd(), this.config.srcDir);
    
    const watchDir = async (dir: string) => {
      try {
        const watcher = watch(dir, { recursive: true });
        this.watchers.set(dir, watcher);
        
        for await (const event of watcher) {
          if (event.filename && /\.(tsx?|jsx?|css)$/.test(event.filename)) {
            this.handleFileChange(event.filename);
          }
        }
      } catch (err) {
        console.error(`Watch error for ${dir}:`, err);
      }
    };
    
    watchDir(srcPath);
    console.log(`👀 Watching ${this.config.srcDir} for changes...`);
  }

  private handleFileChange(filename: string): void {
    const fullPath = path.resolve(process.cwd(), this.config.srcDir, filename);
    const relativePath = path.join(this.config.srcDir, filename).replace(/\\/g, "/");
    
    readFile(fullPath, "utf-8")
      .then(content => {
        const file: ProjectFile = {
          id: Math.random().toString(36).slice(2),
          path: relativePath,
          content,
          language: filename.endsWith(".tsx") || filename.endsWith(".ts") ? "typescript" : "javascript",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        this.pendingChanges.set(relativePath, file);
        this.scheduleReload();
      })
      .catch(err => console.error(`Error reading ${filename}:`, err));
  }

  private scheduleReload(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.processPendingChanges();
    }, this.config.debounceMs);
  }

  private async processPendingChanges(): Promise<void> {
    if (this.pendingChanges.size === 0) return;

    console.log(`🔄 Processing ${this.pendingChanges.size} file change(s)...`);

    for (const [path, file] of this.pendingChanges) {
      this.runtime.vfs.write("/" + path, file.content);

      // Update project files array
      const existingIndex = this.projectFiles.findIndex(f => f.path === path);
      if (existingIndex >= 0) {
        this.projectFiles[existingIndex] = file;
      }

      // Invalidate transpiler cache for this file
      this.transpiler.invalidateFile("/" + path);

      console.log(`  ✓ Updated: ${path}`);
    }

    this.pendingChanges.clear();

    // Notify connected clients
    this.broadcastReload();
    console.log("🔥 HMR update sent to browser");
  }

  private broadcastReload(): void {
    const message = JSON.stringify({ type: "reload", timestamp: Date.now() });
    this.clients.forEach(client => {
      client.write(`data: ${message}\n\n`);
    });
  }

  /** Read and JSON-parse a request body (bounded to avoid unbounded buffering). */
  private readJsonBody(req: http.IncomingMessage, limit = 1_000_000): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
        if (data.length > limit) {
          reject(new Error("Request body too large"));
          req.destroy();
        }
      });
      req.on("end", () => {
        if (!data) return resolve({});
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error("Invalid JSON body"));
        }
      });
      req.on("error", reject);
    });
  }

  async start(): Promise<void> {
    this.server = http.createServer(async (req, res) => {
      const url = new URL(req.url || "/", `http://${this.config.host}:${this.config.port}`);
      
      // SSE endpoint for HMR
      if (url.pathname === "/__hmr" && this.config.enableHMR) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
        });
        
        this.clients.add(res);
        
        req.on("close", () => {
          this.clients.delete(res);
        });
        
        // Send initial connection message
        res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
        return;
      }
      
      // Health check
      if (url.pathname === "/__health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", runtime: "JXR", version: this.runtime.version }));
        return;
      }

      // Full template catalog for the Template Explorer / command palette.
      // Every template is listed; live-previewable ones also carry their source
      // files inline so the explorer can serve a sandboxed preview.
      if (url.pathname === "/__jxr/templates" && req.method === "GET") {
        try {
          const templates = await this.buildTemplateCatalog();
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          });
          res.end(JSON.stringify({ templates }));
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err?.message || String(err) }));
        }
        return;
      }

      // Sandboxed live preview of a single template. The HTML/doc lives at
      // /__jxr/preview/<id>; its modules at /__jxr/preview/<id>/src/<file>.
      if (url.pathname.startsWith("/__jxr/preview/") && req.method === "GET") {
        const rest = url.pathname.slice("/__jxr/preview/".length);
        const segments = rest.split("/").filter(Boolean);
        const id = segments[0] ? decodeURIComponent(segments[0]) : "";
        const moduleParts = segments.slice(1).map(decodeURIComponent);

        const meta = id ? getTemplate(id) : undefined;
        if (!meta) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end(`// Unknown template: ${id}`);
          return;
        }
        if (!meta.livePreview) {
          res.writeHead(409, { "Content-Type": "text/plain" });
          res.end(
            `// "${meta.id}" cannot be live-previewed: ${
              meta.previewNote ?? "not a web drop-in template."
            }`
          );
          return;
        }

        const catalog = await this.buildTemplateCatalog();
        const entry = catalog.find((t) => t.id === meta.id);
        const files = entry?.files ?? [];
        const previewBase = `/__jxr/preview/${meta.id}`;

        // Document root → the preview HTML.
        if (moduleParts.length === 0) {
          res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-cache" });
          res.end(this.generatePreviewHTML(meta, files, previewBase));
          return;
        }

        // URLs are /__jxr/preview/<id>/src/<file>; bundle paths are relative to
        // the template's src/, so drop the leading "src/" before resolving.
        const modulePath = moduleParts.join("/").replace(/^src\//, "");
        const file = this.resolvePreviewModule(files, modulePath);
        if (!file) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end(`// Preview module not found: ${modulePath}`);
          return;
        }

        // CSS → a JS module that injects a <style> tag (mirrors the app server).
        if (file.path.endsWith(".css")) {
          const escaped = file.content
            .replace(/\\/g, "\\\\")
            .replace(/`/g, "\\`")
            .replace(/\$/g, "\\$");
          res.writeHead(200, { "Content-Type": "application/javascript", "Cache-Control": "no-cache" });
          res.end(
            `const s=document.createElement('style');s.textContent=\`${escaped}\`;document.head.appendChild(s);export default \`${escaped}\`;`
          );
          return;
        }

        // TS/JS/JSX/TSX → transpile then rewrite into the preview namespace.
        // Pass a src/-prefixed filename so the transpiler's import rewriter
        // (which mirrors the app server) emits project-root-absolute "/src/…"
        // specifiers that rewritePreviewCode can then re-base.
        const result = this.transpiler.transpileTypeScript(file.content, "src/" + file.path);
        if (result.error) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end(`// Preview transform error: ${result.error.message}`);
          return;
        }
        res.writeHead(200, { "Content-Type": "application/javascript", "Cache-Control": "no-cache" });
        res.end(this.rewritePreviewCode(result.code, previewBase));
        return;
      }

      // Apply a template to the running project (dev-only). Backs up src/, then
      // swaps in the chosen template and signals the browser to reload.
      if (url.pathname === "/__jxr/apply-template" && req.method === "POST") {
        try {
          const body = await this.readJsonBody(req);
          const id = String(body?.id || "");
          const result = await this.applyTemplate(id);
          res.writeHead(result.ok ? 200 : 400, {
            "Content-Type": "application/json",
          });
          if (result.ok) {
            console.log(
              `🧩 Applied template "${id}" (${result.fileCount} files) — backup: ${result.backupDir}`
            );
            res.end(JSON.stringify(result));
          } else {
            res.end(JSON.stringify(result));
          }
        } catch (err: any) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err?.message || String(err) }));
        }
        return;
      }
      
      // Serve index.html
      if (url.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(this.generateHTML());
        return;
      }
      
      // Serve transformed TSX/TS files (with or without extension)
      if (url.pathname.match(/\.(tsx?|jsx?|ts|js)$/) || url.pathname.startsWith('/src/')) {
        try {
          let vfsPath = url.pathname;
          
          // Try to resolve the file with various extensions
          let file = this.runtime.vfs.read(vfsPath);
          
          // If not found and no extension, try adding extensions
          if (!file && !vfsPath.match(/\.(tsx?|jsx?|ts|js|css)$/)) {
            const extensions = ['.tsx', '.ts', '.jsx', '.js', '.css'];
            for (const ext of extensions) {
              file = this.runtime.vfs.read(vfsPath + ext);
              if (file) {
                vfsPath = vfsPath + ext;
                break;
              }
            }
          }
          
          if (!file) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end(`// Module not found: ${url.pathname}`);
            return;
          }
          
          // Serve CSS files as JavaScript that injects the CSS
          if (vfsPath.endsWith('.css')) {
            let cssContent = file.content;
            
            // Check for pre-compiled Tailwind CSS first
            if (vfsPath === '/src/index.css') {
              try {
                const fs = await import('fs');
                const compiledPath = path.join(process.cwd(), 'src', 'index.compiled.css');
                if (fs.existsSync(compiledPath)) {
                  cssContent = fs.readFileSync(compiledPath, 'utf-8');
                  console.log(`[JXR] Using pre-compiled Tailwind CSS from index.compiled.css`);
                } else {
                  // Try to compile on-the-fly
                  const { execSync } = await import('child_process');
                  const os = await import('os');
                  
                  const tmpDir = os.tmpdir();
                  const inputFile = path.join(tmpDir, `jxr-tailwind-${Date.now()}.css`);
                  const outputFile = path.join(tmpDir, `jxr-tailwind-${Date.now()}.compiled.css`);
                  
                  fs.writeFileSync(inputFile, cssContent);
                  
                  try {
                    execSync(`npx @tailwindcss/cli -i "${inputFile}" -o "${outputFile}" --minify`, {
                      timeout: 30000,
                      stdio: 'pipe'
                    });
                    cssContent = fs.readFileSync(outputFile, 'utf-8');
                    fs.unlinkSync(inputFile);
                    fs.unlinkSync(outputFile);
                    console.log(`[JXR] Compiled Tailwind CSS for ${vfsPath}`);
                  } catch {
                    // CDN fallback
                    const js = `
const tailwindScript = document.createElement('script');
tailwindScript.src = 'https://cdn.tailwindcss.com';
tailwindScript.onload = function() {
  const style = document.createElement('style');
  style.textContent = \`${file.content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
  document.head.appendChild(style);
};
document.head.appendChild(tailwindScript);
export default \`${file.content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
`;
                    res.writeHead(200, { 
                      "Content-Type": "application/javascript",
                      "Cache-Control": "no-cache"
                    });
                    res.end(js);
                    return;
                  }
                }
              } catch (error: any) {
                console.warn(`[JXR] Tailwind handling error: ${error?.message || error}`);
              }
            }
            
            const escapedCSS = cssContent
              .replace(/\\/g, '\\\\')
              .replace(/`/g, '\\`')
              .replace(/\$/g, '\\$');
            const js = `
const style = document.createElement('style');
style.textContent = \`${escapedCSS}\`;
document.head.appendChild(style);
export default \`${escapedCSS}\`;
`;
            res.writeHead(200, { 
              "Content-Type": "application/javascript",
              "Cache-Control": "no-cache"
            });
            res.end(js);
            return;
          }
          
          // Use EnhancedTranspiler (Babel) for proper JSX transformation
          const result = this.transpiler.transpileTypeScript(file.content, vfsPath);
          if (result.error) {
            console.error(`Transform error for ${url.pathname}:`, result.error);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end(`// Transform error: ${result.error.message}`);
            return;
          }
          
          res.writeHead(200, { 
            "Content-Type": "application/javascript",
            "Cache-Control": "no-cache"
          });
          res.end(result.code);
        } catch (err: any) {
          console.error(`Error serving ${url.pathname}:`, err);
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end(`// Error: ${err?.message || String(err)}`);
        }
        return;
      }
      
      res.writeHead(404);
      res.end("Not found");
    });

    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, this.config.host, () => {
        console.log(`🚀 JXR server running on http://${this.config.host}:${this.config.port}/`);
        if (this.config.enableHMR) {
          console.log(`🔥 HMR enabled (debounce: ${this.config.debounceMs}ms)`);
        }
        resolve();
      });
      
      this.server!.on("error", reject);
    });
  }

  async stop(): Promise<void> {
    // Stop watchers - we can't easily abort async iterators, but we can clear the map
    // The watch() iterator will naturally stop when the process exits
    this.watchers.clear();
    
    // Clear any pending timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    // Close all SSE connections
    this.clients.forEach(client => {
      try { client.end(); } catch {}
    });
    this.clients.clear();
    
    // Close server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }
    
    // Dispose runtime
    this.runtime.dispose();
    
    console.log("👋 JXR server stopped");
  }

  private generateHTML(): string {
    const hmrScript = this.config.enableHMR ? `
    <script>
      // HMR Client
      const evtSource = new EventSource('/__hmr');
      evtSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'reload') {
          console.log('[JXR] Reloading...');
          location.reload();
        }
      };
      evtSource.onerror = () => console.log('[JXR] HMR connection lost');
    </script>` : '';

    // Import map — shared with `jxr build` via the framework's single source
    // of truth so dev and production resolve identical module URLs.
    const importMap = buildImportMap();

    // Dev-only overlay (never present in a production build).
    const overlayScript = this.config.overlay ? buildExplorerScript() : "";

    // Check if we have a main.tsx/bootstrap file - if so, use it directly
    // Otherwise use the component entry point pattern
    const hasMainFile = this.projectFiles.some(f => 
      f.path === 'src/main.tsx' || f.path === 'src/main.ts' || 
      f.path === 'src/index.tsx' || f.path === 'src/index.ts'
    );
    
    if (hasMainFile) {
      // Use the bootstrap file pattern (like the react template)
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JXR.js — Edge OS Runtime Framework</title>
  <meta name="description" content="JXR.js is the next-generation edge runtime framework for React Native and React. MoQ transport, Web Crypto, Worker pools.">
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <script type="importmap">
    ${JSON.stringify(importMap)}
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
  ${hmrScript}
  ${overlayScript}
</body>
</html>`;
    }
    
    // Fallback: use component entry point directly
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JXR App</title>
  <script type="importmap">
    ${JSON.stringify(importMap)}
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import { createRoot } from 'react-dom/client';
    import App from '/${this.entryPoint}';
    
    const root = createRoot(document.getElementById('root'));
    root.render(App());
  </script>
  ${hmrScript}
  ${overlayScript}
</body>
</html>`;
  }
}
