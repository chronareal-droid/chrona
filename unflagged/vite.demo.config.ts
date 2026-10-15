// `npm run build:demo`: the whole app in one HTML file, running on the in-browser fake backend (src/lib/demo.ts).
import { defineConfig, mergeConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import base from './vite.config';

export default mergeConfig(
  base,
  defineConfig({
    plugins: [viteSingleFile()],
    define: { 'import.meta.env.VITE_DEMO': JSON.stringify('1'), 'import.meta.env.VITE_POSTHOG_KEY': JSON.stringify('') },
    build: { outDir: 'dist-demo', emptyOutDir: true },
  }),
);
