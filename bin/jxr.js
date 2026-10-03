#!/usr/bin/env node
import { JXRServerManager, JXRDeployer } from "../dist/index.js";

import { mkdir, writeFile, cp, readdir, readFile, stat } from "fs/promises";
import { existsSync, createReadStream } from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const command = args[0] || "dev";

/** Resolve the framework version from the nearest package.json (published install or repo). */
async function getFrameworkVersion() {
  for (const candidate of [
    path.join(__dirname, "..", "package.json"),
    path.join(__dirname, "..", "..", "package.json"),
  ]) {
    try {
      const pkg = JSON.parse(await readFile(candidate, "utf-8"));
      if (pkg?.version) return pkg.version;
    } catch {
      // keep looking
    }
  }
  return "0.0.0";
}

/**
 * The single source of truth for the browser import map.
 * Dev server and production build must agree, otherwise a project that runs
 * under `jxr dev` would fail under `jxr build`.
 */
const IMPORT_MAP = {
  react: "https://esm.sh/react@19.2.4",
  "react/jsx-runtime": "https://esm.sh/react@19.2.4/jsx-runtime",
  "react/jsx-dev-runtime": "https://esm.sh/react@19.2.4/jsx-dev-runtime",
  "react-dom": "https://esm.sh/react-dom@19.2.4?external=react",
  "react-dom/client": "https://esm.sh/react-dom@19.2.4/client?external=react",
  wouter: "https://esm.sh/wouter@3.6.0?external=react",
  "lucide-react": "https://esm.sh/lucide-react@0.483.0?external=react",
};

/** Bare specifier roots that should be left external (resolved by the browser import map). */
const IMPORT_MAP_KEYS = Object.keys(IMPORT_MAP).sort((a, b) => b.length - a.length);

function isBareSpecifier(spec) {
  return !spec.startsWith(".") && !spec.startsWith("/") && !spec.startsWith("@/") && !spec.startsWith("http");
}

function mapToImportMapKey(spec) {
  return IMPORT_MAP_KEYS.find((key) => spec === key || spec.startsWith(key + "/"));
}

/** Ordered entry-point candidates for a JXR project (build + dev agree on these). */
const ENTRY_CANDIDATES = ["src/main.tsx", "src/main.ts", "src/main.jsx", "src/App.tsx", "src/index.tsx"];

/** Return the first existing entry file, or null when neither exists. */
function findEntryFile() {
  return ENTRY_CANDIDATES.find((file) => existsSync(file)) || null;
}

/**
 * Fail fast with an actionable message when the CLI is run outside a JXR
 * project (e.g. a bare folder or a monorepo root). Returns the entry file.
 */
function assertJxrProject() {
  const entry = findEntryFile();
  if (entry) return entry;
  console.error(`❌ No JXR project found in ${process.cwd()}`);
  console.error("");
  console.error("   Expected an entry file such as src/main.tsx or src/App.tsx.");
  console.error("   If you are in the wrong folder, cd into your app first.");
  console.error("");
  console.error("   To create a new project:");
  console.error("");
  console.error("     jxr init my-app");
  console.error("     cd my-app");
  console.error("     jxr dev");
  process.exit(1);
}

function printUsage(version) {
  console.log(`JXR.js v${version} — Edge OS Runtime Framework

Usage:
  jxr init [project-name]          Create a new project (default: my-jxr-app)
  jxr dev [--port=3000]            Start dev server (zero-build, HMR)
  jxr build [--platform=web]       Production build
  jxr serve [--port=3000]          Serve the production build from ./dist
  jxr deploy [--target=auto]       Deploy to production
  jxr help                         Show this help
  jxr version                      Print the installed version

Dev options:
  --port=<number>                  Port for the dev server (default: 3000)
  --no-hmr                         Disable hot module replacement

Build options:
  --platform=<target>              web | node | cloudflare-worker (default: web)
  --out-dir=<path>                 Output directory (default: dist)
  --analyze                        Print a bundle-size analysis
  --no-minify                      Disable minification

Deploy targets:
  --target=cloudflare              Cloudflare Pages
  --target=deno                    Deno Deploy
  --target=node                    Node.js server
  --target=auto                    Auto-detect (default)

Cloudflare Pages:
  Auto-detected when CF_PAGES env var is set
  URL: https://<project>.app.jxrstudios.online`);
}

if (command === "help" || command === "--help" || command === "-h") {
  printUsage(await getFrameworkVersion());
  process.exit(0);
} else if (command === "version" || command === "--version" || command === "-v") {
  console.log(await getFrameworkVersion());
  process.exit(0);
} else if (command === "init") {
  // Init command - create new project
  const projectName = args[1] || "my-jxr-app";
  const projectDir = path.resolve(process.cwd(), projectName);

  // Safety check: never overwrite existing files
  if (existsSync(projectDir)) {
    const fs = await import("fs");
    const existingFiles = fs.readdirSync(projectDir);

    if (existingFiles.length > 0) {
      console.error(`❌ Directory "${projectName}" already exists and contains files:`);
      existingFiles.slice(0, 10).forEach(f => console.error(`   - ${f}`));
      if (existingFiles.length > 10) {
        console.error(`   ... and ${existingFiles.length - 10} more files`);
      }
      console.error("");
      console.error("To protect your existing project, jxr init cannot proceed.");
      console.error("Options:");
      console.error(`  1. Use a different name: jxr init my-new-project`);
      console.error(`  2. Create in a subdirectory: mkdir ${projectName}/jxr-app && cd ${projectName}/jxr-app && jxr init .`);
      console.error(`  3. Manually backup and clear the directory first`);
      process.exit(1);
    }

    // Directory exists but is empty - safe to proceed
    console.log(`📁 Using existing empty directory: ${projectName}`);
  }

  console.log(`🚀 Creating new JXR project: ${projectName}`);

  try {
    // Create directories
    await mkdir(projectDir, { recursive: true });

    // Copy the default template (self-contained: App/main, styles, tsconfig, index.html)
    const templateDir = path.join(__dirname, "..", "templates", "default");
    await cp(templateDir, projectDir, { recursive: true });

    // Rewrite the template package.json with the project's real name + current version
    const version = await getFrameworkVersion();
    const packageJson = {
      name: projectName,
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: {
        dev: "jxr dev",
        build: "jxr build",
        deploy: "jxr deploy",
      },
      dependencies: {
        "@jxrstudios/jxr": `^${version}`,
        react: "^19.2.4",
        "react-dom": "^19.2.4",
      },
      devDependencies: {
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        typescript: "^5.6.0",
      },
    };
    await writeFile(
      path.join(projectDir, "package.json"),
      JSON.stringify(packageJson, null, 2) + "\n"
    );

    console.log(`✅ Project created: ${projectDir}`);
    console.log("");
    console.log("Next steps:");
    console.log(`  cd ${projectName}`);
    console.log("  pnpm install   # or: npm install");
    console.log("  jxr dev");

  } catch (err) {
    console.error("❌ Failed to create project:", err.message);
    process.exit(1);
  }

} else if (command === "build") {
  // Build command - production-optimized build
  const platform = args.find((a) => a.startsWith("--platform="))?.split("=")[1] || "web";
  const analyze = args.includes("--analyze");
  const noMinify = args.includes("--no-minify");
  const outDir = args.find((a) => a.startsWith("--out-dir="))?.split("=")[1] || "dist";

  console.log(`🔨 Building for ${platform}...`);

  try {
    const esbuild = await import("esbuild");
    const fs = await import("fs");
    const path = await import("path");
    const crypto = await import("crypto");

    // Find entry point — fail fast with a clear message when run outside a
    // JXR project (e.g. a bare folder or monorepo root). This runs BEFORE any
    // output directory is created so a mis-invocation leaves no stray dist/.
    const entryFile = args.includes("--allow-empty")
      ? findEntryFile() || "src/index.tsx"
      : assertJxrProject();

    // Ensure output directory exists
    await mkdir(outDir, { recursive: true });
    await mkdir(path.join(outDir, "assets"), { recursive: true });

    // Bare imports that the JXR runtime resolves at runtime through the browser
    // import map (e.g. "react" -> https://esm.sh/react@19). These must be left
    // external so the production HTML can serve them the same way `jxr dev` does.
    const externalBare = new Set();

    // Build configuration
    const buildConfig = {
      entryPoints: [entryFile],
      bundle: true,
      platform: platform === "node" ? "node" : "browser",
      target: platform === "cloudflare-worker" ? "es2022" : "es2020",
      format: "esm",
      minify: !noMinify,
      sourcemap: !noMinify,
      splitting: platform !== "node",
      outdir: path.join(outDir, "assets"),
      entryNames: "[name]-[hash]",
      chunkNames: "[name]-[hash]",
      assetNames: "[name]-[hash]",
      metafile: true,
      absWorkingDir: process.cwd(),
      define: {
        "process.env.NODE_ENV": '"production"',
        ...(platform === "cloudflare-worker" && {
          "process": "{}",
          "process.env": "{}",
        }),
      },
      external: [
        ...(platform === "cloudflare-worker" ? ["__STATIC_CONTENT_MANIFEST"] : []),
      ],
      alias: {
        "@": "./src",
      },
      loader: {
        ".tsx": "tsx",
        ".ts": "ts",
        ".css": "css",
        ".png": "file",
        ".jpg": "file",
        ".svg": "file",
      },
    };

    // Rewrite bare imports that are covered by the import map to their CDN URL
    // and mark them external (browser resolves them, same as dev).
    const importMapToCdn = {
      name: "jxr-import-map",
      setup(build) {
        build.onResolve({ filter: /.*/ }, (a) => {
          if (a.kind === "entry-point") return null;
          const spec = a.path;
          if (!isBareSpecifier(spec)) return null;
          const key = mapToImportMapKey(spec);
          if (!key) return null;
          externalBare.add(key);
          const suffix = spec.slice(key.length);
          return { path: IMPORT_MAP[key] + suffix, external: true };
        });
      },
    };

    const result = await esbuild.build({ ...buildConfig, plugins: [importMapToCdn] });

    console.log(`✅ Build complete: ${outDir}/`);

    // Analyze bundle if requested
    if (analyze && result.metafile) {
      console.log("\n📊 Bundle Analysis:");
      const outputs = Object.entries(result.metafile.outputs);
      outputs.sort((a, b) => b[1].bytes - a[1].bytes);
      outputs.slice(0, 10).forEach(([file, info]) => {
        const sizeKB = (info.bytes / 1024).toFixed(2);
        console.log(`   ${file}: ${sizeKB} KB`);
      });
    }

    // Find main entry output (exclude source maps)
    const mainOutput = Object.keys(result.metafile?.outputs || {}).find(k =>
      (k.includes("main-") || k.includes("index-")) && k.endsWith(".js")
    );
    const vendorOutput = Object.keys(result.metafile?.outputs || {}).find(k =>
      k.includes("chunk-") && k.endsWith(".js")
    );

    // Copy compiled CSS if available
    if (fs.existsSync("src/index.compiled.css")) {
      fs.copyFileSync("src/index.compiled.css", path.join(outDir, "assets", "index-[hash].css"));
      console.log(`  📄 Copied compiled CSS`);
    }

    // Find CSS output
    const cssOutput = Object.keys(result.metafile?.outputs || {}).find(k => k.endsWith(".css"));

    // Emit the import map so external react/etc. resolve in the production build
    const usedImports = {};
    for (const key of externalBare) usedImports[key] = IMPORT_MAP[key];
    const importMapTag = Object.keys(usedImports).length
      ? `<script type="importmap">\n  ${JSON.stringify({ imports: usedImports })}\n  </script>`
      : "";

    // Generate index.html with proper CSS and JS references
    const indexHtml = `<!DOCTYPE html>
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

  ${cssOutput ? `<link rel="stylesheet" href="${cssOutput.replace(outDir, "").replace(/^\//, "")}">` : ""}
  ${importMapTag}
</head>
<body>
  <div id="root"></div>
  ${vendorOutput ? `<script type="module" src="${vendorOutput.replace(outDir, "").replace(/^\//, "")}"></script>` : ""}
  <script type="module" src="${mainOutput ? mainOutput.replace(outDir, "").replace(/^\//, "") : "assets/index.js"}"></script>
</body>
</html>`;

    await writeFile(path.join(outDir, "index.html"), indexHtml);

    // Generate crypto-signed manifest
    const manifest = {
      version: "1.0.0",
      platform,
      buildTime: new Date().toISOString(),
      entries: {
        main: mainOutput ? path.basename(mainOutput) : "index.js",
        ...(vendorOutput && { vendor: path.basename(vendorOutput) }),
      },
      files: Object.keys(result.metafile?.outputs || {}).map(k => path.basename(k)),
    };

    // Sign manifest with ECDSA P-256
    const manifestJson = JSON.stringify(manifest, null, 2);
    const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
    });
    const signature = crypto.sign("sha256", Buffer.from(manifestJson), privateKey);

    const signedManifest = {
      ...manifest,
      signature: signature.toString("base64"),
      algorithm: "ECDSA-P256",
      publicKey: publicKey.export({ type: "spki", format: "pem" }),
    };

    await writeFile(
      path.join(outDir, "jxr-manifest.json"),
      JSON.stringify(signedManifest, null, 2)
    );

    console.log(`✅ Manifest: ${outDir}/jxr-manifest.json`);
    console.log(`   Signed with ECDSA-P256`);

    // Show output files
    console.log("\n📁 Build outputs:");
    const files = await readdir(outDir, { recursive: true });
    files.forEach(f => console.log(`   ${f}`));

  } catch (err) {
    console.error("❌ Build failed:", err.message);
    process.exit(1);
  }

} else if (command === "serve") {
  // Serve command - static file server for the production build
  const port = parseInt(process.env.PORT || args.find((a) => a.startsWith("--port="))?.split("=")[1] || "3000", 10);
  const dir = args.find((a) => a.startsWith("--dir="))?.split("=")[1] || "dist";
  const root = path.resolve(process.cwd(), dir);

  if (!existsSync(root) || !existsSync(path.join(root, "index.html"))) {
    console.error(`❌ No production build found in "${dir}".`);
    console.error("   Run 'jxr build' first, or pass --dir=<path>.");
    process.exit(1);
  }

  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
  };

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://localhost:${port}`);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === "/") pathname = "/index.html";

      // Prevent path traversal
      const target = path.normalize(path.join(root, pathname));
      if (!target.startsWith(root)) {
        res.writeHead(403).end("Forbidden");
        return;
      }

      let filePath = target;
      let info = null;
      try {
        info = await stat(filePath);
      } catch {
        info = null;
      }

      // SPA fallback: unknown non-asset paths serve index.html
      if (!info || info.isDirectory()) {
        if (!path.extname(pathname)) {
          filePath = path.join(root, "index.html");
        } else {
          res.writeHead(404).end("Not found");
          return;
        }
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": types[ext] || "application/octet-stream",
        "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
      });
      createReadStream(filePath).pipe(res);
    } catch (err) {
      res.writeHead(500).end(String(err?.message || err));
    }
  });

  server.listen(port, () => {
    console.log(`🚀 Serving ${dir}/ on http://localhost:${port}/`);
    console.log("   Press Ctrl+C to stop");
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

} else if (command === "deploy") {
  // Deploy command with Cloudflare Pages auto-detection
  const target = args.find((a) => a.startsWith("--target="))?.split("=")[1] || "auto";
  const env = args.find((a) => a.startsWith("--env="))?.split("=")[1] || "production";
  const projectPath = args.find((a) => !a.startsWith("--")) || ".";

  console.log(`🚀 Deploying to ${target === "auto" ? "auto-detected platform" : target}...`);

  try {
    // Use JXRDeployer for Cloudflare Pages deployment
    if (target === "cloudflare" || target === "auto") {
      const deployer = new JXRDeployer(process.env.JXR_API_KEY || '', process.env.JXR_PROJECT_ID);
      const result = await deployer.deployToCloudflarePages(projectPath, { environment: env });

      if (result.success) {
        console.log("✅ Deployed successfully!");
        console.log(`   URL: ${result.url}`);
        result.logs.forEach(log => console.log(`   ${log}`));
      } else {
        console.error("❌ Deploy failed");
        result.logs.forEach(log => console.error(`   ${log}`));
        process.exit(1);
      }

    } else if (target === "deno") {
      console.log("🦕 Deploying to Deno Deploy...");
      console.log("   Run 'deployctl deploy' to deploy to Deno Deploy");

    } else if (target === "node") {
      console.log("🟢 Deploying to Node.js server...");
      console.log("   Copy the dist/ folder to your Node.js server");

    } else {
      console.error(`❌ Unknown target: ${target}`);
      console.error("   Supported: cloudflare, deno, node, auto");
      process.exit(1);
    }

  } catch (err) {
    console.error("❌ Deploy failed:", err.message);
    process.exit(1);
  }

} else if (command === "dev" || !command) {
  // Dev server (default)
  const port = parseInt(process.env.PORT || args.find((a, i) => args[i - 1] === "--port" || a.startsWith("--port="))?.split("=")[1] || "3000");
  const hmr = !args.includes("--no-hmr");

  // Refuse to start when there is no JXR project in the current directory.
  if (!args.includes("--allow-empty")) assertJxrProject();

  const server = new JXRServerManager({ port, enableHMR: hmr });

  await server.initialize();
  await server.start();

  // Graceful shutdown - only register once
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\n⚠️ Shutting down...");
    await server.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

} else {
  console.error(`Unknown command: ${command}\n`);
  printUsage(await getFrameworkVersion());
  process.exit(1);
}
