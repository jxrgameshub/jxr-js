# JXR Default Template

The project scaffolded by `jxr init`. Zero-build React with no configuration.

## Structure

```
.
├── index.html          # Reference entry document (dev/build generate their own)
├── package.json
├── tsconfig.json
└── src
    ├── App.tsx         # Your app — edit and save
    ├── main.tsx        # Bootstraps React into #root
    └── styles.css      # Plain CSS, injected by the dev server
```

## Commands

```bash
pnpm install    # or npm install
jxr dev         # zero-build dev server with HMR
jxr build       # production bundle + crypto-signed manifest
jxr serve       # serve the production build from ./dist
```
