#!/usr/bin/env node
// Downloads the media listed in src/data/media.json, re-encodes it for the web and writes
// public/media/local.json so the site serves it from media/ instead of the remote CDN.
//
//   npm run media:fetch
//
// Stills  -> WebP at 2400 / 1400 / 800 px wide (used as a srcset)
// Video   -> VP9 WebM + H.264 MP4 at 1280 px, no audio, plus a JPG poster
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(root, 'src/data/media.json'), 'utf8'));
const out = path.join(root, 'public/media');
const raw = path.join(root, 'media-src');
const WIDTHS = [800, 1400, 2400];

await mkdir(path.join(out, 'img'), { recursive: true });
await mkdir(path.join(out, 'video'), { recursive: true });
await mkdir(raw, { recursive: true });

const run = (args) => new Promise((res, rej) => {
  const p = spawn(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  p.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`))));
});
const exists = async (f) => { try { return (await stat(f)).size > 0; } catch { return false; } };
async function download(url, file) {
  if (await exists(file)) return file;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  await writeFile(file, Buffer.from(await r.arrayBuffer()));
  return file;
}

const local = { images: {}, videos: {} };

for (const [key, v] of Object.entries(manifest.images)) {
  if (!v.remote?.startsWith('http')) continue;
  console.log(`▸ image ${key}`);
  const src = await download(v.remote, path.join(raw, `${key}${path.extname(new URL(v.remote).pathname) || '.png'}`));
  const set = {};
  for (const w of WIDTHS) {
    const file = `img/${key}-${w}.webp`;
    await run(['-i', src, '-vf', `scale='min(${w},iw)':-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', w > 1400 ? '72' : '76', path.join(out, file)]);
    set[w] = `media/${file}`;
  }
  local.images[key] = set;
  // Open Graph card from the hero still
  if (key === 'hero') await run(['-i', src, '-vf', 'scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630', '-q:v', '3', path.join(root, 'public/og-image.jpg')]);
}

for (const [key, v] of Object.entries(manifest.videos)) {
  if (!v.remote?.startsWith('http')) continue;
  console.log(`▸ video ${key}`);
  const src = await download(v.remote, path.join(raw, `${key}.mp4`));
  const vf = ['-vf', 'scale=1280:-2:flags=lanczos,format=yuv420p'];
  await run(['-i', src, '-an', ...vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-movflags', '+faststart', path.join(out, `video/${key}.mp4`)]);
  await run(['-i', src, '-an', ...vf, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', path.join(out, `video/${key}.webm`)]);
  await run(['-i', src, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '4', path.join(out, `video/${key}.jpg`)]);
  local.videos[key] = { webm: `media/video/${key}.webm`, mp4: `media/video/${key}.mp4`, poster: `media/video/${key}.jpg` };
}

await writeFile(path.join(out, 'local.json'), JSON.stringify(local, null, 2) + '\n');
console.log('✓ public/media/local.json written. The site now serves self-hosted media.');
