// Resolves media keys to URLs. Self-hosted files (written by `npm run media:fetch`
// into public/media/local.json) win; otherwise the Higgsfield-hosted originals are used.
import manifest from '../data/media.json';

let local = { videos: {}, images: {} };

export async function loadLocalManifest() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}media/local.json`, { cache: 'no-cache' });
    if (res.ok) {
      const json = await res.json();
      local = { videos: json.videos || {}, images: json.images || {} };
    }
  } catch {
    /* no local media, fall back to remote */
  }
}

const base = (p) => `${import.meta.env.BASE_URL}${p}`;

export function imageUrl(key) {
  if (local.images[key]) return base(local.images[key]);
  return manifest.images[key]?.remote || '';
}

/** Returns [{src, type}] sources in preference order, plus an optional poster. */
export function videoSources(key) {
  const l = local.videos[key];
  if (l) {
    const out = [];
    if (l.webm) out.push({ src: base(l.webm), type: 'video/webm; codecs="vp9"' });
    if (l.mp4) out.push({ src: base(l.mp4), type: 'video/mp4; codecs="avc1.4d401f"' });
    return { sources: out, poster: l.poster ? base(l.poster) : '' };
  }
  const r = manifest.videos[key]?.remote;
  return { sources: r ? [{ src: r, type: 'video/mp4' }] : [], poster: '' };
}

/** Fill a <video data-media="key"> with <source> tags. */
export function attachVideo(video) {
  const key = video.dataset.media;
  const { sources, poster } = videoSources(key);
  if (poster) video.poster = poster;
  video.innerHTML = sources.map((s) => `<source src="${s.src}" type='${s.type}'>`).join('');
  video.dataset.attached = '1';
}
