import { readFile, readdir, watch } from "fs/promises";
import path from "path";
import http from "http";
import { JXRRuntime, findOrCreateEntryPoint, EnhancedTranspiler } from "./index.ts";
import type { ProjectFile } from "./index.ts";

export interface JXRServerConfig {
  port?: number;
  host?: string;
  srcDir?: string;
  enableHMR?: boolean;
  debounceMs?: number;
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

  constructor(config: JXRServerConfig = {}) {
    this.config = {
      port: config.port || 3000,
      host: config.host || "localhost",
      srcDir: config.srcDir || "src",
      enableHMR: config.enableHMR !== false,
      debounceMs: config.debounceMs || 300,
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

    // Import map with react/jsx-runtime for Babel's automatic runtime
    // Includes common dependencies used by JXR projects
    const importMap = {
      "imports": {
        "react": "https://esm.sh/react@19.2.4",
        "react/jsx-runtime": "https://esm.sh/react@19.2.4/jsx-runtime",
        "react/jsx-dev-runtime": "https://esm.sh/react@19.2.4/jsx-dev-runtime",
        "react-dom/client": "https://esm.sh/react-dom@19.2.4/client",
        "wouter": "https://esm.sh/wouter@3.6.0?external=react",
        "lucide-react": "https://esm.sh/lucide-react@0.483.0?external=react",
        "sonner": "https://esm.sh/sonner@2.0.1?external=react",
        "next-themes": "https://esm.sh/next-themes@0.4.6?external=react",
        "@radix-ui/react-dialog": "https://esm.sh/@radix-ui/react-dialog@1.1.6?external=react",
        "@radix-ui/react-tooltip": "https://esm.sh/@radix-ui/react-tooltip@1.1.8?external=react",
        "@radix-ui/react-slot": "https://esm.sh/@radix-ui/react-slot@1.1.2?external=react",
        "@radix-ui/react-primitive": "https://esm.sh/@radix-ui/react-primitive@2.0.2?external=react",
        "@radix-ui/react-compose-refs": "https://esm.sh/@radix-ui/react-compose-refs@1.1.1?external=react",
        "@radix-ui/react-context": "https://esm.sh/@radix-ui/react-context@1.1.1?external=react",
        "@radix-ui/react-use-controllable-state": "https://esm.sh/@radix-ui/react-use-controllable-state@1.1.0?external=react",
        "@radix-ui/react-use-escape-keydown": "https://esm.sh/@radix-ui/react-use-escape-keydown@1.1.0?external=react",
        "@radix-ui/react-use-layout-effect": "https://esm.sh/@radix-ui/react-use-layout-effect@1.1.0?external=react",
        "@radix-ui/react-dismissable-layer": "https://esm.sh/@radix-ui/react-dismissable-layer@1.1.5?external=react",
        "@radix-ui/react-focus-guards": "https://esm.sh/@radix-ui/react-focus-guards@1.1.1?external=react",
        "@radix-ui/react-focus-scope": "https://esm.sh/@radix-ui/react-focus-scope@1.1.2?external=react",
        "@radix-ui/react-portal": "https://esm.sh/@radix-ui/react-portal@1.1.4?external=react",
        "@radix-ui/react-presence": "https://esm.sh/@radix-ui/react-presence@1.1.2?external=react",
        "@radix-ui/react-id": "https://esm.sh/@radix-ui/react-id@1.1.0?external=react",
        "@radix-ui/primitive": "https://esm.sh/@radix-ui/primitive@1.1.1",
        "aria-hidden": "https://esm.sh/aria-hidden@1.2.4",
        "react-remove-scroll": "https://esm.sh/react-remove-scroll@2.6.3?external=react",
        "tslib": "https://esm.sh/tslib@2.8.1",
        "get-nonce": "https://esm.sh/get-nonce@1.0.1",
        "use-callback-ref": "https://esm.sh/use-callback-ref@1.3.3?external=react",
        "use-sidecar": "https://esm.sh/use-sidecar@1.1.3?external=react",
        "detect-node-es": "https://esm.sh/detect-node-es@1.1.0",
        "copy-to-clipboard": "https://esm.sh/copy-to-clipboard@3.3.3",
        "toggle-selection": "https://esm.sh/toggle-selection@1.0.6",
        "clsx": "https://esm.sh/clsx@2.1.1",
        "tailwind-merge": "https://esm.sh/tailwind-merge@3.0.2",
        "class-variance-authority": "https://esm.sh/class-variance-authority@0.7.1",
        "framer-motion": "https://esm.sh/framer-motion@12.5.0?external=react,motion-dom",
        "motion-dom": "https://esm.sh/motion-dom@12.5.0"
      }
    };

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
</body>
</html>`;
  }
}
