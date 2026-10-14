// Renders chosen frames of a composition to out/stills/ (bundles once, so it's much faster than `remotion still` per frame).
// Usage: node scripts/stills.mjs Day1 0 45 150 ...
// Env: REMOTION_BROWSER_EXECUTABLE (a specific Chrome), STILLS_DIR (default out/stills)
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const [id = 'Day1', ...frameArgs] = process.argv.slice(2);
const frames = frameArgs.length ? frameArgs.map(Number) : [0];
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id, browserExecutable });
const dir = process.env.STILLS_DIR || 'out/stills';
mkdirSync(dir, { recursive: true });
for (const frame of frames) {
  const output = `${dir}/${id}-${String(frame).padStart(4, '0')}.png`;
  await renderStill({ serveUrl, composition, frame, output, browserExecutable, overwrite: true });
  console.log(output);
}
