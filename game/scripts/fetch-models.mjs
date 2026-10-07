// Downloads the AI-generated character models listed in public/models/models.json into public/models/,
// so the game serves them itself instead of loading them from the generator's CDN.
import { readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const manifest = JSON.parse(await readFile(join(root, 'models', 'models.json'), 'utf8'));
for (const [id, m] of Object.entries(manifest)) {
  const out = join(root, m.local.replace(/^\.\//, ''));
  try { await access(out); console.log(`${id}: already present`); continue; } catch {}
  const res = await fetch(m.remote);
  if (!res.ok) { console.error(`${id}: HTTP ${res.status}`); process.exitCode = 1; continue; }
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  console.log(`${id}: saved ${out}`);
}
