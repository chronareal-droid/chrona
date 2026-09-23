import { defineConfig } from 'vite';
import { renderSections } from './src/render.js';

// Sections are rendered from src/data/content.json into static HTML at build (and dev) time,
// so crawlers and no-JS visitors get the full page.
const sections = () => ({
  name: 'mgtd-sections',
  transformIndexHtml: {
    order: 'pre',
    handler: async (html, ctx) => {
      if (ctx.server) ctx.server.watcher.add(['src/data/content.json', 'src/data/media.json', 'public/media/local.json']);
      const parts = await renderSections();
      return html.replace(/<!--\s*@(\w+)\s*-->/g, (m, key) => (key in parts ? parts[key] : m));
    },
  },
  handleHotUpdate({ file, server }) {
    if (/content\.json|media\.json|local\.json|render\.js/.test(file)) server.ws.send({ type: 'full-reload' });
  },
});

export default defineConfig({
  base: './',
  plugins: [sections()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { target: 'es2020', assetsInlineLimit: 0 },
});
