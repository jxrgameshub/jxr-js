# JXR.js Official Templates

npm workspaces monorepo — one `npm install`, then run any template.

| Template | Language | Entry |
|----------|----------|-------|
| [typescript](./typescript) | TypeScript | `src/main.ts` |
| [javascript](./javascript) | JavaScript | `src/main.js` |
| [jsx](./jsx) | JSX | `src/main.jsx` |
| [tsx](./tsx) | TSX | `src/main.tsx` |
| [react-native](./react-native) | React Native + TSX | `src/main.tsx` |

## Quick Start (in monorepo)

```bash
cd templates
npm install
cd tsx && jxr dev
```

## Standalone Copy

```bash
./scripts/create-from-template.sh tsx my-app
cd my-app && npm install && jxr dev
```

The script inlines shared deps and tsconfig for standalone use.

## Validate All

```bash
./scripts/validate-all.sh
```
