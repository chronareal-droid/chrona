import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  server: { host: true, port: 5175 },
  preview: { host: true, port: 4175 },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    rollupOptions: { input: { main: resolve(import.meta.dirname, 'index.html'), legal: resolve(import.meta.dirname, 'legal.html') } },
  },
});
