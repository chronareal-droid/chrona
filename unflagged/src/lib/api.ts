import { DEMO, demoApi } from './demo';
import { ApiError } from './errors';
import type { CreateScanPayload, PublicScan } from './types';

export { ApiError };

const BASE = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

const SCAN_ID = /^[A-Za-z0-9-]{8,64}$/;

/** A live build without VITE_SUPABASE_URL can't work: every call would go to the static host. */
export const MISCONFIGURED = !DEMO && !import.meta.env.VITE_SUPABASE_URL;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, 'Content-Type': 'application/json', ...init?.headers },
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) throw new ApiError(res.status, body?.error ?? 'network');
  // A 2xx that isn't our JSON (e.g. an HTML page from a misrouted URL) is an error, not an empty success.
  if (!body || typeof body !== 'object') throw new ApiError(502, 'bad_response');
  return body as T;
}

const liveApi = {
  createScan: async (p: CreateScanPayload) => {
    const r = await call<{ id?: unknown }>('create-scan', { method: 'POST', body: JSON.stringify(p) });
    // The id becomes the report URL; anything else would send the creator to a broken page.
    if (typeof r.id !== 'string' || !SCAN_ID.test(r.id)) throw new ApiError(502, 'bad_response');
    return { id: r.id };
  },
  getScan: (id: string) => call<PublicScan>(`get-scan?id=${encodeURIComponent(id)}`),
  createCheckout: (id: string) => call<{ url: string }>('create-checkout', { method: 'POST', body: JSON.stringify({ id }) }),
  joinWaitlist: (email: string, scanId?: string, source?: string) =>
    call<{ ok: true }>('join-waitlist', { method: 'POST', body: JSON.stringify({ email, scan_id: scanId, source }) }),
};

export const api: typeof liveApi = DEMO ? demoApi : liveApi;

/** The last submitted payload, kept in memory only (never storage) so "Try again" can resubmit without re-uploading. */
let lastPayload: CreateScanPayload | null = null;
export const rememberPayload = (p: CreateScanPayload) => void (lastPayload = p);
export const takeLastPayload = () => lastPayload;
