// A scripted fake backend for the e2e tests: intercepts every Edge Function call the SPA makes.
import { gunzipSync } from 'node:zlib';
import type { Page, Route } from '@playwright/test';

export const API = 'https://mock.supabase.test/functions/v1';
export const SCAN_ID = '11111111-2222-4333-8444-555555555555';
/** Each new scan gets a fresh id, like the real backend (the first one is SCAN_ID). */
export const scanId = (n: number) => (n === 0 ? SCAN_ID : `11111111-2222-4333-8444-${String(n).padStart(12, '0')}`);

export const FREE = {
  overall: 'elevated',
  headline: 'Your titles follow one template, but your scripts show real analysis.',
  categories: [
    { key: 'generic_repetitive', level: 'high', summary: '9 of 14 titles start with "Top 10 Scariest".' },
    { key: 'off_putting', level: 'low', summary: 'No shock formulas.' },
    { key: 'ai_persona_sensitive', level: 'low', summary: 'No sensitive topics.' },
    { key: 'reused', level: 'elevated', summary: 'Clips from other creators.' },
  ],
  top_findings: [
    { title: 'Titles follow one frame', evidence: '"Top 10 Scariest Places in Japan"', why_it_matters: 'Template pattern.', fix: 'Retitle 3 uploads.' },
    { title: 'Durations are identical', evidence: '11 of 14 run 10:00–10:30.', why_it_matters: 'Mass-produced look.', fix: 'Let length follow the story.' },
  ],
  confidence_note: 'We could not see your descriptions.',
};

/** Strings that exist only in the paid report: they must never reach an unpaid page. */
export const PAID_ONLY = ['PAID-FINDING-THREE', 'PAID-CHECKLIST-ITEM', 'PAID-DAY-ONE'];

export const REPORT = {
  ...FREE,
  categories: FREE.categories.map((c) => ({ ...c, evidence: ['"Top 10 Scariest Places in Japan"'], fixes: ['Rewrite the title.'] })),
  top_findings: [...FREE.top_findings, { title: 'PAID-FINDING-THREE', evidence: '"Buckle up"', why_it_matters: 'Generic.', fix: 'Cut it.' }],
  videos_to_review: [{ title: 'Top 10 Scariest Places in Japan', reason: 'Most generic.' }],
  action_plan_7_days: ['PAID-DAY-ONE', ...Array.from({ length: 6 }, (_, i) => `Day ${i + 2}: next`)],
  before_you_apply_checklist: ['PAID-CHECKLIST-ITEM'],
};

const base = { id: SCAN_ID, created_at: '2026-10-14T00:00:00Z', error_code: null, videos_read: 14 };
export const processing = (stage: 'extract' | 'signals' | 'judge') => ({ ...base, status: 'processing', stage, paid: false, videos_read: null });
export const freeScan = () => ({
  ...base,
  status: 'done',
  stage: null,
  paid: false,
  free: FREE,
  locked: { more_findings: 1, videos_to_review: 1, plan_days: 7, checklist_items: 1 },
});
export const paidScan = () => ({
  ...base,
  status: 'done',
  stage: null,
  paid: true,
  report: REPORT,
  rescan: { available: true, until: '2026-11-13T00:00:00Z' },
});
export const errorScan = (code: string) => ({ ...base, status: 'error', stage: null, error_code: code, paid: false, videos_read: null });

type Json = Record<string, unknown>;
export interface MockState {
  createBodies: Json[];
  checkoutCalls: number;
  waitlist: Json[];
  getScanCalls: number;
}

/**
 * Installs the fake backend. `scan` decides what get-scan returns on its n-th call (0-based);
 * `create` can return an error code to simulate a rejected upload.
 */
export async function mockApi(
  page: Page,
  opts: { scan?: (n: number, state: MockState) => Json | 404; create?: () => { status: number; error: string } | null } = {},
): Promise<MockState> {
  const state: MockState = { createBodies: [], checkoutCalls: 0, waitlist: [], getScanCalls: 0 };
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': '*' } });
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    const url = new URL(req.url());
    const fn = url.pathname.split('/').pop();
    if (fn === 'create-scan') {
      state.createBodies.push(req.postDataJSON());
      const err = opts.create?.();
      return err ? json(route, { error: err.error }, err.status) : json(route, { id: scanId(state.createBodies.length - 1) });
    }
    if (fn === 'get-scan') {
      const res = (opts.scan ?? (() => freeScan()))(state.getScanCalls++, state);
      return res === 404 ? json(route, { error: 'not_found' }, 404) : json(route, res);
    }
    if (fn === 'create-checkout') {
      state.checkoutCalls++;
      return json(route, { url: `http://localhost:4174/r/${SCAN_ID}?paid=1` });
    }
    if (fn === 'join-waitlist') {
      state.waitlist.push(req.postDataJSON());
      return json(route, { ok: true });
    }
    return json(route, { error: 'unknown' }, 404);
  });
  return state;
}

/** Two phone-sized PNG "screenshots" (real images, so the client-side resize runs for real). */
export async function screenshotFiles(page: Page) {
  await page.setViewportSize({ width: 1170, height: 2532 });
  await page.setContent('<body style="margin:0;background:linear-gradient(#222,#999)"><h1 style="color:#fff;font:80px sans-serif">Videos</h1></body>');
  const png = await page.screenshot();
  await page.setViewportSize({ width: 375, height: 812 });
  return [
    { name: 'shot-1.png', mimeType: 'image/png', buffer: png },
    { name: 'shot-2.png', mimeType: 'image/png', buffer: png },
  ];
}

export async function fillScanForm(page: Page) {
  const files = await screenshotFiles(page);
  await page.goto('/scan?src=tt');
  await page.locator('#shots').setInputFiles(files);
  await page.getByText('Add more (2/4)').waitFor();
  await page.locator('textarea').first().fill(Array(200).fill('word').join(' '));
  for (const label of ['Rejected', 'AI voice', 'Stock footage', 'AI drafts, light edits', 'Rarely', '7–14']) {
    await page.getByRole('button', { name: label, exact: true }).click();
  }
  await page.getByPlaceholder('e.g. history documentaries').fill('horror lists');
  await page.getByRole('checkbox').check();
}

export async function noHorizontalScroll(page: Page): Promise<number> {
  // clientWidth excludes a vertical scrollbar, so a page that only scrolls vertically still measures 0.
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

export interface AnalyticsRequest {
  url: string;
  body: string;
}

/**
 * Stands in for PostHog (the e2e build has a fake key) and records every request it would have received, with
 * the body decoded whichever way posthog-js encoded it (gzip, base64 form field or plain JSON).
 */
export async function mockAnalytics(page: Page): Promise<AnalyticsRequest[]> {
  const seen: AnalyticsRequest[] = [];
  await page.route(/^https:\/\/[a-z-]+\.i\.posthog\.com\//, (route) => {
    const req = route.request();
    const raw = req.postDataBuffer() ?? Buffer.alloc(0);
    let body = raw.toString('utf8');
    if (raw[0] === 0x1f && raw[1] === 0x8b) body = gunzipSync(raw).toString('utf8');
    else if (body.startsWith('data=')) body = Buffer.from(decodeURIComponent(body.slice(5)), 'base64').toString('utf8');
    seen.push({ url: req.url(), body });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' });
  });
  return seen;
}
