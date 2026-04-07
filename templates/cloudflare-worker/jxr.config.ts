import { defineConfig } from '@jxrstudios/jxr';

export default defineConfig({
  name: 'jxr-cloudflare-worker',
  platform: 'cloudflare-worker',

  build: {
    outDir: 'dist',
    minify: true,
    sourcemap: false,
    target: ['es2022'],
  },

  devServer: {
    port: 3000,
    hmr: true,
  },
});
