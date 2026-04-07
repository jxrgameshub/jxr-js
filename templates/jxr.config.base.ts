import { defineConfig } from '@jxrstudios/jxr';
import type { JXRConfig } from '@jxrstudios/jxr';

/** Base config shared by all templates. Import and spread in per-template jxr.config.ts. */
export const base: Partial<JXRConfig> = {
  platform: 'web',
  devServer: { port: 3000, hmr: true },
  build: { outDir: 'dist', minify: true, sourcemap: true },
};
