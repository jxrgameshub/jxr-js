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
  listPreviewableTemplates,
  isValidTemplateId,
} from "./template-registry.ts";

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
  private templateCache:
    | Array<{ meta: unknown; files: Array<{ path: string; content: string }> }>
    | null = null;

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
   * Read every previewable template's `src/` from the bundled `templates/`
   * directory into an in-memory `{ path: content }` bundle. Only runs when the
   * template endpoint is first hit (the dev overlay opens), so it stays off the
   * hot path.
   */
  private async buildTemplateBundles(): Promise<
    Array<{ meta: unknown; files: Array<{ path: string; content: string }> }>
  > {
    if (this.templateCache) return this.templateCache;
    const templatesDir = resolveTemplatesDir();
    const bundles: Array<{ meta: unknown; files: Array<{ path: string; content: string }> }> = [];
    for (const meta of listPreviewableTemplates()) {
      const srcDir = path.join(templatesDir, meta.id, "src");
      const files = await this.readDirectoryFiles(srcDir, srcDir);
      if (files.length > 0) {
        bundles.push({ meta, files });
      }
    }
    this.templateCache = bundles;
    return bundles;
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

      // Template catalog for the dev overlay / command palette. Returns only
      // previewable (web-renderable) templates with their source bundled inline
      // so the client can drop them in without extra requests.
      if (url.pathname === "/__jxr/templates" && req.method === "GET") {
        try {
          const bundles = await this.buildTemplateBundles();
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          });
          res.end(JSON.stringify({ templates: bundles }));
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err?.message || String(err) }));
        }
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

  /**
   * Dev-only overlay: a floating gear button that opens a template command
   * palette (search → confirm → apply) plus a couple of tools. Injected only by
   * the dev server, so it never appears in a `jxr build` production bundle.
   *
   * The markup is rendered inside a Shadow DOM so it is fully isolated from the
   * host app's CSS. Written without backticks or ${ so it survives the server's
   * template-literal inlining untouched.
   */
  private buildOverlayScript(): string {
    return `
<script>
(function () {
  if (window.__JXR_OVERLAY__) return;
  window.__JXR_OVERLAY__ = true;

  var CONFIRM =
    'Are you sure you want to choose this template? This action is permanent and you will need to run jxr init to start a fresh project if you decide to change templates later.';

  var host = document.createElement('div');
  host.setAttribute('data-jxr-overlay', '');
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent =
    ':host{all:initial}' +
    '.wrap{font-family:Inter,system-ui,-apple-system,sans-serif}' +
    '.gear{position:fixed;right:20px;bottom:20px;width:46px;height:46px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:linear-gradient(145deg,#1b1b22,#0c0c11);color:#f5f3ff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px rgba(0,0,0,.45);transition:transform .18s ease,box-shadow .18s ease}' +
    '.gear:hover{transform:translateY(-1px) rotate(28deg);box-shadow:0 16px 38px rgba(0,0,0,.55)}' +
    '.gear svg{width:22px;height:22px}' +
    '.scrim{position:fixed;inset:0;background:rgba(6,6,10,.62);backdrop-filter:blur(6px);display:none;align-items:flex-start;justify-content:center;padding-top:12vh;z-index:2147483000}' +
    '.scrim.open{display:flex}' +
    '.panel{width:min(560px,92vw);border-radius:18px;border:1px solid rgba(255,255,255,.12);background:#101015;color:#e7e7ee;box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden}' +
    '.head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08)}' +
    '.head input{flex:1;background:transparent;border:0;outline:0;color:#fff;font-size:15px}' +
    '.kbd{font:11px/1.4 ui-monospace,JetBrains Mono,monospace;color:#9ca3af;border:1px solid rgba(255,255,255,.16);border-radius:6px;padding:2px 6px}' +
    '.list{max-height:46vh;overflow:auto;padding:8px}' +
    '.grp{font:600 11px/1.4 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;padding:10px 10px 6px}' +
    '.item{width:100%;text-align:left;display:flex;gap:12px;align-items:flex-start;padding:11px 12px;border-radius:12px;background:transparent;border:1px solid transparent;color:inherit;cursor:pointer}' +
    '.item:hover,.item.active{background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.1)}' +
    '.dot{width:10px;height:10px;border-radius:999px;margin-top:5px;flex:none;box-shadow:0 0 0 3px rgba(255,255,255,.06)}' +
    '.body{flex:1;min-width:0}' +
    '.title{display:block;font-weight:600;font-size:14px}' +
    '.desc{display:block;color:#9ca3af;font-size:12.5px;line-height:1.5;margin-top:2px}' +
    '.tags{display:block;color:#6b7280;font-size:11px;margin-top:4px;font-family:ui-monospace,monospace}' +
    '.foot{display:flex;justify-content:space-between;padding:10px 16px;border-top:1px solid rgba(255,255,255,.08);color:#9ca3af;font-size:12px}' +
    '.confirm{padding:20px}' +
    '.confirm h3{margin:0 0 8px;font-size:16px;color:#fff}' +
    '.confirm p{margin:0 0 14px;color:#c7c7d1;font-size:13.5px;line-height:1.6}' +
    '.warn{color:#fbbf24}' +
    '.row{display:flex;gap:10px;justify-content:flex-end}' +
    '.btn{border-radius:10px;padding:9px 14px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,.14);background:transparent;color:#e7e7ee}' +
    '.btn.primary{background:linear-gradient(145deg,#7c3aed,#a855f7);border-color:transparent;color:#fff}' +
    '.status{padding:18px;color:#c7c7d1;font-size:13px}';
  root.appendChild(style);

  var wrap = document.createElement('div');
  wrap.className = 'wrap';
  wrap.innerHTML =
    '<button class="gear" title="JXR dev overlay (press H)">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.11a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.49 1z"/></svg>' +
    '</button>' +
    '<div class="scrim"><div class="panel" role="dialog" aria-label="JXR command palette"></div></div>';
  root.appendChild(wrap);

  var gear = wrap.querySelector('.gear');
  var scrim = wrap.querySelector('.scrim');
  var panel = wrap.querySelector('.panel');
  var input;
  var list;
  var loading = false;
  var active = 0;
  var items = [];

  var tools = [
    { id: 'tool-docs', name: 'Open JXR documentation', description: 'jxrstudios.online', tags: ['docs', 'help'], accent: '#38bdf8', kind: 'tool', action: function () { window.open('https://jxrstudios.online', '_blank'); } },
    { id: 'tool-install', name: 'Copy global install command', description: 'pnpm add -g @jxrstudios/jxr', tags: ['install', 'cli'], accent: '#22c55e', kind: 'tool', action: function () { try { navigator.clipboard.writeText('pnpm add -g @jxrstudios/jxr'); } catch (e) {} } },
    { id: 'tool-hide', name: 'Hide JXR overlay (this session)', description: 'Returns on the next reload', tags: ['overlay', 'hide'], accent: '#f59e0b', kind: 'tool', action: function () { host.remove(); } }
  ];

  function shell() {
    panel.innerHTML =
      '<div class="head"><span class="kbd">JXR</span><input placeholder="Search templates, tools and features\u2026" aria-label="Search" /><span class="kbd">esc</span></div>' +
      '<div class="list"></div>' +
      '<div class="foot"><span>\u2191 \u2193 navigate</span><span>\u21B5 select \u00b7 H toggle</span></div>';
    input = panel.querySelector('input');
    list = panel.querySelector('.list');
    input.addEventListener('input', render);
    input.addEventListener('keydown', onInputKey);
  }

  function matches(t, q) {
    var hay = (t.name + ' ' + (t.description || '') + ' ' + (t.tags || []).join(' ')).toLowerCase();
    return !q || hay.indexOf(q) !== -1;
  }

  function currentRows() {
    var q = input.value.trim().toLowerCase();
    var rows = [];
    tools.filter(function (t) { return matches(t, q); }).forEach(function (t) { rows.push(t); });
    items.filter(function (t) { return matches(t, q); }).forEach(function (t) { rows.push(t); });
    return rows;
  }

  function render() {
    var rows = currentRows();
    if (active >= rows.length) active = Math.max(0, rows.length - 1);
    list.innerHTML = '';
    if (!rows.length) {
      list.innerHTML = '<div class="status">' + (loading ? 'Loading templates\u2026' : 'No matches.') + '</div>';
      return;
    }
    var lastGroup = null;
    rows.forEach(function (t, i) {
      var group = t.kind === 'tool' ? 'Tools' : 'Templates';
      if (group !== lastGroup) {
        var l = document.createElement('div');
        l.className = 'grp';
        l.textContent = group;
        list.appendChild(l);
        lastGroup = group;
      }
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'item' + (i === active ? ' active' : '');
      el.innerHTML =
        '<span class="dot" style="background:' + (t.accent || '#a855f7') + '"></span>' +
        '<span class="body"><span class="title"></span><span class="desc"></span><span class="tags"></span></span>';
      el.querySelector('.title').textContent = t.name;
      el.querySelector('.desc').textContent = t.description || '';
      el.querySelector('.tags').textContent = (t.tags || []).join(' \u00b7 ');
      el.addEventListener('mouseenter', function () { active = i; render(); });
      el.addEventListener('click', function () { choose(t); });
      list.appendChild(el);
    });
    var activeEl = list.querySelector('.item.active');
    if (activeEl && activeEl.scrollIntoView) activeEl.scrollIntoView({ block: 'nearest' });
  }

  function choose(t) {
    if (t.kind === 'tool') {
      try { t.action && t.action(); } catch (e) {}
      if (t.id !== 'tool-hide') close();
      return;
    }
    confirmTemplate(t);
  }

  function onInputKey(e) {
    var rows = currentRows();
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % Math.max(1, rows.length); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + Math.max(1, rows.length)) % Math.max(1, rows.length); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (rows[active]) choose(rows[active]); }
  }

  function confirmTemplate(t) {
    panel.innerHTML =
      '<div class="confirm">' +
        '<h3>Choose \u201c' + (t.name || t.id) + '\u201d?</h3>' +
        '<p>' + CONFIRM + '</p>' +
        '<p class="warn">Your current src/ is backed up to .jxr/backup-&lt;timestamp&gt;/ first.</p>' +
        '<div class="row"><button class="btn" data-cancel>Cancel</button><button class="btn primary" data-apply>Choose this template</button></div>' +
      '</div>';
    panel.querySelector('[data-cancel]').addEventListener('click', function () { shell(); render(); input.focus(); });
    panel.querySelector('[data-apply]').addEventListener('click', function () { apply(t); });
  }

  function apply(t) {
    panel.innerHTML = '<div class="status">Applying \u201c' + (t.name || t.id) + '\u201d\u2026</div>';
    fetch('/__jxr/apply-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok) {
          panel.innerHTML = '<div class="status">Failed: ' + ((res && res.error) || 'unknown error') + '</div>';
          return;
        }
        panel.innerHTML = '<div class="status">Applied \u201c' + (t.name || t.id) + '\u201d. Reloading\u2026</div>';
        setTimeout(function () { location.reload(); }, 500);
      })
      .catch(function (err) {
        panel.innerHTML = '<div class="status">Failed: ' + err + '</div>';
      });
  }

  function load() {
    loading = true;
    fetch('/__jxr/templates')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        items = (res && res.templates ? res.templates : []).map(function (b) {
          return Object.assign({ kind: 'template' }, b.meta);
        });
        loading = false;
        render();
      })
      .catch(function () { loading = false; render(); });
  }

  function open() { scrim.classList.add('open'); shell(); load(); input.focus(); }
  function close() { scrim.classList.remove('open'); }
  function toggle() { scrim.classList.contains('open') ? close() : open(); }

  gear.addEventListener('click', toggle);
  scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
  document.addEventListener('keydown', function (e) {
    var typing = /input|textarea/i.test((document.activeElement && document.activeElement.tagName) || '');
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); toggle(); }
    else if (e.key === 'Escape') close();
    else if (!typing && (e.key === 'h' || e.key === 'H') && !scrim.classList.contains('open')) { toggle(); }
  });
})();
</script>`;
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
    const overlayScript = this.config.overlay ? this.buildOverlayScript() : "";

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
