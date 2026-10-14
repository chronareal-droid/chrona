// Client-side resize: long side ≤ 1280 px, JPEG quality 0.8 (stepping down if still over the 700 KB server limit).
export const MAX_SIDE = 1280;
export const MAX_BYTES = 700 * 1024;
export const ACCEPT = 'image/png,image/jpeg,image/webp';

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> (older Safari) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const bytesOf = (dataUrl: string) => Math.floor(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4);

/** Returns a data:image/jpeg;base64 URL. */
export async function resizeToJpeg(file: File): Promise<string> {
  if (!ACCEPT.split(',').includes(file.type)) throw new Error('Use PNG, JPG or WEBP screenshots.');
  const src = await decode(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(src.width, src.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(src.width * scale);
  canvas.height = Math.round(src.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process this image.');
  ctx.fillStyle = '#fff'; // PNG transparency → white, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  if ('close' in src && typeof src.close === 'function') src.close();
  for (const q of [0.8, 0.7, 0.6, 0.5]) {
    const out = canvas.toDataURL('image/jpeg', q);
    if (bytesOf(out) <= MAX_BYTES) return out;
  }
  throw new Error('That screenshot is too large even after resizing.');
}

export const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
