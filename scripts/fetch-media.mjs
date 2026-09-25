// Downloads the images listed in src/data/media.json and self-hosts them as WebP
// (a 2000px and a 900px width) in public/media/, then writes public/media/local.json.
// The site prefers these local files whenever local.json lists them.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const media = JSON.parse(await readFile(new URL('src/data/media.json', root), 'utf8'));
const out = new URL('public/media/', root);
await mkdir(out, { recursive: true });

const WIDTHS = [2000, 900];
const local = {};

for (const [key, item] of Object.entries(media)) {
  if (key.startsWith('_')) continue;
  try {
    const res = await fetch(item.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const files = {};
    for (const w of WIDTHS) {
      const name = `${key}-${w}.webp`;
      await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(new URL(name, out).pathname);
      files[w] = `media/${name}`;
    }
    local[key] = files;
    console.log(`✓ ${key}`);
  } catch (err) {
    console.warn(`✗ ${key}: ${err.message} (the site will use the hosted original)`);
  }
}

await writeFile(new URL('local.json', out), JSON.stringify(local, null, 2) + '\n');
console.log(`Wrote public/media/local.json (${Object.keys(local).length} images)`);
