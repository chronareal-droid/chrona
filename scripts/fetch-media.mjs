#!/usr/bin/env node
// Downloads the Higgsfield-generated media listed in src/data/media.json, re-encodes it for the web
// and writes public/media/local.json so the site serves it from /media/ instead of the remote CDN.
//
//   npm run media:fetch            # everything
//   npm run media:fetch -- hero    # only listed keys
//
// Hero is encoded all-intra (every frame a keyframe) so scroll-scrubbing seeks are instant.
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(root, 'src/data/media.json'), 'utf8'));
const out = path.join(root, 'public/media');
const raw = path.join(root, 'media-src');
const only = new Set(process.argv.slice(2));
const want = (k) => !only.size || only.has(k);

await mkdir(path.join(out, 'video'), { recursive: true });
await mkdir(path.join(out, 'img'), { recursive: true });
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

let local = { videos: {}, images: {} };
try { local = JSON.parse(await readFile(path.join(out, 'local.json'), 'utf8')); local.videos ||= {}; local.images ||= {}; } catch { /* fresh */ }

for (const [key, v] of Object.entries(manifest.videos)) {
  if (!want(key)) continue;
  console.log(`▸ video ${key}`);
  const src = await download(v.remote, path.join(raw, `${key}.mp4`));
  const scrub = key === 'hero';
  const gop = scrub ? ['-g', '1', '-keyint_min', '1'] : ['-g', '48'];
  const vf = ['-vf', 'scale=1280:-2:flags=lanczos,format=yuv420p'];
  await run(['-i', src, '-an', ...vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', scrub ? '24' : '26', ...gop, '-movflags', '+faststart', path.join(out, `video/${key}.mp4`)]);
  await run(['-i', src, '-an', ...vf, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', scrub ? '34' : '38', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', ...gop, path.join(out, `video/${key}.webm`)]);
  await run(['-ss', scrub ? '0' : '2', '-i', src, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '4', path.join(out, `video/${key}.jpg`)]);
  // WebM (VP9) is offered first; browsers without VP9 fall back to the MP4.
  local.videos[key] = { webm: `media/video/${key}.webm`, mp4: `media/video/${key}.mp4`, poster: `media/video/${key}.jpg` };
}

for (const [key, v] of Object.entries(manifest.images)) {
  if (!want(key)) continue;
  console.log(`▸ image ${key}`);
  const src = await download(v.full || v.remote, path.join(raw, `${key}${path.extname(new URL(v.full || v.remote).pathname)}`));
  await run(['-i', src, '-vf', "scale='min(1800,iw)':-2:flags=lanczos", '-c:v', 'libwebp', '-quality', '78', path.join(out, `img/${key}.webp`)]);
  local.images[key] = `media/img/${key}.webp`;
}

await writeFile(path.join(out, 'local.json'), JSON.stringify(local, null, 2) + '\n');
console.log('✓ public/media/local.json updated. The site now serves self-hosted media.');
