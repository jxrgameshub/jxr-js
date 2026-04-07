import { VirtualFS, ImportMapBuilder, jxrCrypto } from '@jxrstudios/jxr';

// Build a browser-native import map for React
const importMap = new ImportMapBuilder()
  .addReactDefaults('18')
  .build();

console.log('import map:', JSON.stringify(importMap, null, 2));

// Create an in-memory project
const vfs = new VirtualFS();
vfs.write('/src/App.js', `
export default function App() {
  return document.createElement('h1').textContent = 'JXR.js';
}
`);

// Generate a nonce for request signing
const nonce = jxrCrypto.generateNonce();
console.log('nonce:', nonce);

// List files
for (const file of vfs.list()) {
  console.log(file.path, '-', file.language, '-', file.size, 'bytes');
}
