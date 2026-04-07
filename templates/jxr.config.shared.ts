import type { JXRConfig } from '@jxrstudios/jxr';

/** Shared defaults for all templates. Override per-template as needed. */
export const sharedConfig: Partial<JXRConfig> = {
  platform: 'web',
  devServer: {
    port: 3000,
    hmr: true,
  },
  build: {
    outDir: 'dist',
    minify: true,
    sourcemap: true,
  },
};
