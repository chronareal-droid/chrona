// Turns dist-demo/index.html into a page fragment for hosting inside another page shell (e.g. a shared preview):
// keeps the title, the inlined CSS and JS and the #root mount, and drops the document-level tags the host provides.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-demo/index.html', 'utf8');
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]);
const scripts = [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]);
if (!styles.length || !scripts.length) throw new Error('expected inlined <style> and <script> in dist-demo/index.html');

const page = [
  '<title>Unflagged Demo</title>',
  '<meta name="description" content="Clickable demo of Unflagged with sample data.">',
  ...styles,
  '<div id="root"></div>',
  ...scripts,
].join('\n');
writeFileSync('dist-demo/unflagged-demo.html', page);
console.log(`dist-demo/unflagged-demo.html: ${(page.length / 1024).toFixed(0)} KB`);
