import { VirtualFS, ImportMapBuilder, jxrCrypto } from '@jxrstudios/jxr';

const importMap = new ImportMapBuilder()
  .addReactDefaults('18')
  .build();
console.log('import map:', JSON.stringify(importMap, null, 2));

const vfs = new VirtualFS();
vfs.write('/src/App.js', `
export default function App() {
  return document.createElement('h1').textContent = 'JXR.js';
}
`);

const nonce = jxrCrypto.generateNonce();
console.log('nonce:', nonce);

for (const file of vfs.list()) {
  console.log(file.path, '-', file.language, '-', file.size, 'bytes');
}
