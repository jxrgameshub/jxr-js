import { VirtualFS, jxrCrypto } from '@jxrstudios/jxr';
import type { VirtualFile, ModuleHash } from '@jxrstudios/jxr';

const vfs = new VirtualFS();

// Write a module to the virtual file system
const file: VirtualFile = vfs.write('/src/utils.ts', `
export function greet(name: string): string {
  return 'Hello, ' + name + '!';
}
`);

console.log('wrote:', file.path, `(${file.size} bytes)`);

// Hash the module for integrity verification
const hash: ModuleHash = await jxrCrypto.hashModule(file.content);
console.log('sha-256:', hash.digest);

// Verify integrity
const valid: boolean = await jxrCrypto.verifyModule(file.content, hash);
console.log('integrity:', valid ? 'ok' : 'tampered');

// List all files
console.log('files:', vfs.list().map((f) => f.path));
