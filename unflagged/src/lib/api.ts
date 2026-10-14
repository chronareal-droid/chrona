import type { CreateScanPayload, PublicScan } from './types';

const BASE = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body?.error ?? 'network');
  return body as T;
}

export const api = {
  createScan: (p: CreateScanPayload) => call<{ id: string }>('create-scan', { method: 'POST', body: JSON.stringify(p) }),
  getScan: (id: string) => call<PublicScan>(`get-scan?id=${encodeURIComponent(id)}`),
  createCheckout: (id: string) => call<{ url: string }>('create-checkout', { method: 'POST', body: JSON.stringify({ id }) }),
  joinWaitlist: (email: string, scanId?: string, source?: string) =>
    call<{ ok: true }>('join-waitlist', { method: 'POST', body: JSON.stringify({ email, scan_id: scanId, source }) }),
};

/** The last submitted payload, kept in memory only (never storage) so "Try again" can resubmit without re-uploading. */
let lastPayload: CreateScanPayload | null = null;
export const rememberPayload = (p: CreateScanPayload) => void (lastPayload = p);
export const takeLastPayload = () => lastPayload;
