import { DEMO } from './demo';

// Gemini's free tier isn't allowed for users in the EU/EEA, UK or Switzerland, so they get a "not yet" message.
// Cloudflare Pages serves /cdn-cgi/trace on every site; its `loc=` line is the visitor's country.

export const BLOCKED = new Set([
  // EU
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
  'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // EEA (non-EU)
  'IS', 'LI', 'NO',
  // UK, Switzerland
  'GB', 'CH',
]);

export function parseLoc(trace: string): string | null {
  return trace.match(/^loc=([A-Z]{2})$/m)?.[1] ?? null;
}

export type RegionState = 'checking' | 'allowed' | 'blocked';

/**
 * QA: `?loc=GB` forces a blocked region. It can only block, never unblock, so it isn't a bypass.
 * On localhost the check is skipped (no /cdn-cgi/trace there).
 */
export async function checkRegion(): Promise<'allowed' | 'blocked'> {
  const forced = new URLSearchParams(location.search).get('loc')?.toUpperCase();
  if (forced && BLOCKED.has(forced)) return 'blocked';
  if (DEMO || ['localhost', '127.0.0.1'].includes(location.hostname)) return 'allowed';
  try {
    const res = await fetch('/cdn-cgi/trace', { cache: 'no-store' });
    const loc = parseLoc(await res.text());
    return loc && BLOCKED.has(loc) ? 'blocked' : 'allowed';
  } catch {
    // If the trace endpoint fails we can't tell; allow rather than lock everyone out.
    return 'allowed';
  }
}
