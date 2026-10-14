// Captures ?src=ig|tt|yt|reddit|x on first landing so the scan row records which platform sent the visitor.
const KEY = 'unflagged_src';

export function captureSrc(): void {
  try {
    const src = new URLSearchParams(location.search).get('src')?.toLowerCase();
    if (src && /^[a-z0-9_-]{1,24}$/.test(src)) sessionStorage.setItem(KEY, src);
  } catch {
    /* storage blocked: fine */
  }
}

export function getSrc(): string | undefined {
  try {
    return sessionStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
