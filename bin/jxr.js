#!/usr/bin/env node
import { JXRServerManager, JXRDeployer } from "../src/index.ts";

import { mkdir, writeFile, cp, readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const command = args[0] || "dev";

if (command === "init") {
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
    await mkdir(path.join(projectDir, "src"), { recursive: true });
    
    // Create package.json
    const packageJson = {
      name: projectName,
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "jxr dev",
        deploy: "jxr deploy"
      },
      dependencies: {
        "@jxrstudios/jxr": "^1.0.5"
      },
      devDependencies: {
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "typescript": "^5.5.0"
      }
    };
    await writeFile(
      path.join(projectDir, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Copy template from zzz_react_template
    const templateDir = path.join(__dirname, "..", "zzz_react_template");
    const files = ["App.tsx", "index.css", "main.tsx"];
    for (const file of files) {
      await cp(
        path.join(templateDir, file),
        path.join(projectDir, "src", file)
      );
    }
    
    // Copy tsconfig.json
    await cp(
      path.join(templateDir, "tsconfig.json"),
      path.join(projectDir, "tsconfig.json")
    );
    
    console.log(`✅ Project created: ${projectDir}`);
    console.log("");
    console.log("Next steps:");
    console.log(`  cd ${projectName}`);
    console.log("  npm install");
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
    
    // Ensure output directory exists
    await mkdir(outDir, { recursive: true });
    await mkdir(path.join(outDir, "assets"), { recursive: true });
    
    // Find entry point
    const entryFile = fs.existsSync("src/main.tsx") ? "src/main.tsx" : 
                      fs.existsSync("src/main.ts") ? "src/main.ts" : 
                      fs.existsSync("src/App.tsx") ? "src/App.tsx" : "src/index.tsx";
    
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
      define: {
        "process.env.NODE_ENV": '"production"',
        ...(platform === "cloudflare-worker" && {
          "process": "{}",
          "process.env": "{}",
        }),
      },
      external: [
        "react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-dom/client",
        "wouter", "lucide-react", "sonner", "next-themes", "framer-motion", "motion-dom",
        "@radix-ui/react-dialog", "@radix-ui/react-tooltip", "@radix-ui/react-slot",
        "clsx", "tailwind-merge", "class-variance-authority",
        "tailwindcss", "tw-animate-css",
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
    
    // Run build
    const result = await esbuild.build(buildConfig);
    
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
  
} else if (command === "deploy") {
  // Deploy command with Cloudflare Pages auto-detection
  const target = args.find((a) => a.startsWith("--target="))?.split("=")[1] || "auto";
  const env = args.find((a) => a.startsWith("--env="))?.split("=")[1] || "production";
  const projectPath = args.find((a) => !a.startsWith("--")) || ".";
  
  console.log(`🚀 Deploying to ${target === "auto" ? "auto-detected platform" : target}...`);
  
  try {
    const fs = await import("fs");
    const path = await import("path");
    
    // Auto-detect build output directory
    let buildDir = path.join(projectPath, "dist");
    if (!fs.existsSync(buildDir)) {
      buildDir = path.join(projectPath, "build");
    }
    if (!fs.existsSync(buildDir)) {
      buildDir = path.join(projectPath, "out");
    }
    if (!fs.existsSync(buildDir)) {
      // Look for any directory with index.html
      const dirs = fs.readdirSync(projectPath, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith(".") && !d.name === "node_modules")
        .map(d => path.join(projectPath, d.name));
      
      for (const dir of dirs) {
        if (fs.existsSync(path.join(dir, "index.html"))) {
          buildDir = dir;
          break;
        }
      }
    }
    
    if (!fs.existsSync(buildDir)) {
      console.error("❌ No build output found. Run 'jxr build' first.");
      process.exit(1);
    }
    
    // Check for jxr-manifest.json for verification
    const manifestPath = path.join(buildDir, "jxr-manifest.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      console.log(`📋 Build manifest: ${manifest.platform} platform`);
      console.log(`   Files: ${manifest.files.length}`);
      console.log(`   Signed: ${manifest.algorithm}`);
    }
    
    // Detect if running on Cloudflare Pages
    const isCloudflarePages = process.env.CF_PAGES === "1" || process.env.CF_PAGES_URL !== undefined;
    
    if (target === "cloudflare" || target === "auto" && isCloudflarePages) {
      console.log("☁️ Deploying to Cloudflare Pages...");
      
      // Get project name from package.json or directory
      let projectName = process.env.CF_PAGES_PROJECT_NAME;
      if (!projectName) {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, "package.json"), "utf-8"));
          projectName = pkg.name;
        } catch {
          projectName = path.basename(path.resolve(projectPath));
        }
      }
      
      // On Cloudflare Pages, the build output is automatically deployed
      // We just need to ensure it's in the right location
      console.log(`   Project: ${projectName}`);
      console.log(`   Environment: ${env}`);
      
      if (isCloudflarePages) {
        console.log(`   URL: https://${projectName}.app.jxrstudios.online`);
        console.log("✅ Deployment ready for Cloudflare Pages");
        console.log("   The build output will be deployed automatically.");
      } else {
        // Manual Cloudflare Pages deployment
        console.log("   Run 'wrangler pages deploy' to deploy manually");
        console.log("   Or connect your GitHub repo to Cloudflare Pages for auto-deployment");
      }
      
    } else if (target === "deno") {
      console.log("🦕 Deploying to Deno Deploy...");
      console.log("   Run 'deployctl deploy' to deploy to Deno Deploy");
      
    } else if (target === "node") {
      console.log("🟢 Deploying to Node.js server...");
      console.log("   Copy the dist/ folder to your Node.js server");
      
    } else {
      // Use JXRDeployer for other platforms
      if (!process.env.JXR_API_KEY) {
        console.error("❌ JXR_API_KEY environment variable required");
        console.error("   Get your key at: https://jxrstudios.online/dashboard");
        process.exit(1);
      }
      
      const deployer = new JXRDeployer(process.env.JXR_API_KEY, process.env.JXR_PROJECT_ID);
      const result = await deployer.deploy(buildDir, { environment: env });
      
      if (result.success) {
        console.log("✅ Deployed successfully!");
        console.log(`   URL: ${result.url}`);
        result.logs.forEach(log => console.log(`   ${log}`));
      } else {
        console.error("❌ Deploy failed");
        result.logs.forEach(log => console.error(`   ${log}`));
        process.exit(1);
      }
    }
    
  } catch (err) {
    console.error("❌ Deploy failed:", err.message);
    process.exit(1);
  }
  
} else if (command === "dev" || !command) {
  // Dev server (default)
  const port = parseInt(process.env.PORT || args.find((a, i) => args[i - 1] === "--port" || a.startsWith("--port="))?.split("=")[1] || "3000");
  const hmr = !args.includes("--no-hmr");

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
  console.log("Usage:");
  console.log("  jxr init <project-name>          Create new project");
  console.log("  jxr dev [--port=3000]            Start dev server");
  console.log("  jxr build [--platform=web]       Production build");
  console.log("  jxr deploy [--target=auto]       Deploy to production");
  console.log("");
  console.log("Deploy targets:");
  console.log("  --target=cloudflare              Cloudflare Pages");
  console.log("  --target=deno                    Deno Deploy");
  console.log("  --target=node                    Node.js server");
  console.log("  --target=auto                    Auto-detect (default)");
  console.log("");
  console.log("Cloudflare Pages:");
  console.log("  Auto-detected when CF_PAGES env var is set");
  console.log("  URL: https://<project>.app.jxrstudios.online");
  process.exit(1);
}