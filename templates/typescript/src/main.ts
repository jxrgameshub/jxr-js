import { VirtualFS, jxrCrypto } from '@jxrstudios/jxr';
import type { VirtualFile, ModuleHash } from '@jxrstudios/jxr';

const vfs = new VirtualFS();

const file: VirtualFile = vfs.write('/src/utils.ts', `
export function greet(name: string): string {
  return 'Hello, ' + name + '!';
}
`);
console.log('wrote:', file.path, `(${file.size} bytes)`);

const hash: ModuleHash = await jxrCrypto.hashModule(file.content);
console.log('sha-256:', hash.digest);

const valid: boolean = await jxrCrypto.verifyModule(file.content, hash);
console.log('integrity:', valid ? 'ok' : 'tampered');

console.log('files:', vfs.list().map((f) => f.path));
