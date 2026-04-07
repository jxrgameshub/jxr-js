# Cloudflare Worker

Edge deployment template. Build and deploy to Cloudflare without wrangler — only a JXR API key is needed.

```bash
npm install

# Local development
jxr dev

# Production build + deploy
export JXR_API_KEY=jxr_live_xxxxx
jxr build --platform=cloudflare-worker
jxr deploy --target=cloudflare
```

The build step bundles with esbuild targeting ES2022 and signs the manifest with ECDSA-P256.
The deploy step uploads the bundle to `https://<project>.app.jxrstudios.online`.
