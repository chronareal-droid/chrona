import { expect, test } from '@playwright/test';
import {
  errorScan,
  FREE,
  fillScanForm,
  freeScan,
  mockAnalytics,
  mockApi,
  noHorizontalScroll,
  PAID_ONLY,
  paidScan,
  processing,
  SCAN_ID,
} from './mock';

// Analytics are on in the e2e build: never let them reach the real PostHog.
test.beforeEach(async ({ page }) => {
  await mockAnalytics(page);
});

const DISCLAIMER = 'Not affiliated with or endorsed by YouTube or Google.';

test.describe('pages', () => {
  for (const path of ['/', '/scan', '/methodology', '/privacy', '/terms', '/refunds']) {
    test(`${path} fits a 375px phone and carries the disclaimer`, async ({ page }) => {
      await mockApi(page);
      await page.goto(path);
      await expect(page.getByText(DISCLAIMER).first()).toBeVisible();
      expect(await noHorizontalScroll(page)).toBeLessThanOrEqual(0);
    });
  }

  test('landing CTA leads to the scan form', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Would your channel survive a monetization review?');
    await page.getByRole('link', { name: 'Scan my channel — free' }).first().click();
    await expect(page).toHaveURL(/\/scan$/);
  });

  test('privacy page covers what the spec requires', async ({ page }) => {
    await page.goto('/privacy');
    const text = (await page.locator('main').innerText()).toLowerCase();
    for (const must of ['never stored', 'gemini', 'what we store', 'deletion', 'eu/eea', 'switzerland', '18']) {
      expect(text, `privacy page should mention "${must}"`).toContain(must);
    }
  });

  test('each page has its own tab title', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page).toHaveTitle('Privacy · Unflagged');
    await page.goto('/nope');
    await expect(page).toHaveTitle('Page not found · Unflagged');
  });

  test('unknown routes show a not-found page (SPA fallback)', async ({ page }) => {
    await page.goto('/nope');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});

test.describe('scan form', () => {
  test('lists what is missing instead of submitting', async ({ page }) => {
    const api = await mockApi(page);
    await page.goto('/scan');
    await page.getByRole('button', { name: 'Get my free risk read' }).click();
    await expect(page.getByText('Add at least 2 screenshots')).toBeVisible();
    await expect(page.getByText('Confirm you’re 18 or older')).toBeVisible();
    expect(api.createBodies).toHaveLength(0);
  });

  test('blocks EU/UK/CH visitors (QA override ?loc=GB)', async ({ page }) => {
    await page.goto('/scan?loc=GB');
    await expect(page.getByText('Unflagged isn’t available in your region yet')).toBeVisible();
    await expect(page.locator('#shots')).toHaveCount(0);
  });

  test('sends resized JPEGs, answers, src and the 18+ flag', async ({ page }) => {
    const api = await mockApi(page);
    await fillScanForm(page);
    await page.getByRole('button', { name: 'Get my free risk read' }).click();
    await expect(page).toHaveURL(new RegExp(`/r/${SCAN_ID}$`));
    const body = api.createBodies[0] as { images: string[]; answers: Record<string, string>; ageConfirmed: boolean; src: string; scripts: string[] };
    expect(body.images).toHaveLength(2);
    for (const img of body.images) {
      expect(img.startsWith('data:image/jpeg;base64,/9j/')).toBe(true);
      expect((img.length * 3) / 4).toBeLessThan(700 * 1024);
    }
    expect(body.answers).toEqual({ monetization: 'rejected', voice: 'ai', visuals: 'stock', scripts: 'ai_light_edits', opinion: 'rarely', uploads: '7-14' });
    expect(body.ageConfirmed).toBe(true);
    expect(body.src).toBe('tt');
    expect(body.scripts).toHaveLength(1);
    expect(JSON.stringify(body).length).toBeLessThan(4 * 1024 * 1024);
  });

  test('a mistyped optional email is flagged instead of submitted', async ({ page }) => {
    const api = await mockApi(page);
    await fillScanForm(page);
    await page.getByRole('textbox', { name: /Email/ }).fill('creator@gmail');
    await page.getByRole('button', { name: 'Get my free risk read' }).click();
    await expect(page.getByText('Check your email address, or leave it empty').first()).toBeVisible();
    expect(api.createBodies).toHaveLength(0);
    await page.getByRole('textbox', { name: /Email/ }).fill('');
    await page.getByRole('button', { name: 'Get my free risk read' }).click();
    await expect(page).toHaveURL(new RegExp(`/r/${SCAN_ID}$`));
  });

  test('blocks EU overseas regions too', async ({ page }) => {
    await page.goto('/scan?loc=RE');
    await expect(page.getByText('Unflagged isn’t available in your region yet')).toBeVisible();
  });

  test('shows the daily limit message when rate limited', async ({ page }) => {
    await mockApi(page, { create: () => ({ status: 429, error: 'rate_limited' }) });
    await fillScanForm(page);
    await page.getByRole('button', { name: 'Get my free risk read' }).click();
    await expect(page.getByText('You’ve reached the free scan limit for the last 24 hours')).toBeVisible();
  });
});

test.describe('report', () => {
  test('progress → free read with paid content locked → checkout → full report', async ({ page }) => {
    const api = await mockApi(page, {
      scan: (n, s) => (s.checkoutCalls ? paidScan() : n === 0 ? processing('extract') : n === 1 ? processing('judge') : freeScan()),
    });
    await fillScanForm(page);
    await page.getByRole('button', { name: 'Get my free risk read' }).click();
    await expect(page.getByText('Checking your channel')).toBeVisible();
    const unlock = page.getByRole('button', { name: 'Unlock full report — $29' });
    await expect(unlock).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Titles follow one frame')).toBeVisible();
    // Paid content must not be anywhere in the unpaid page.
    const html = await page.content();
    for (const s of PAID_ONLY) expect(html).not.toContain(s);
    await unlock.click();
    await expect(page).toHaveURL(/paid=1/);
    await expect(page.getByRole('heading', { name: 'All findings' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('PAID-FINDING-THREE')).toBeVisible();
    await expect(page.getByText('PAID-CHECKLIST-ITEM')).toBeVisible();
    await expect(page.getByText('Bookmark this page. It’s your report.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start my re-scan' })).toHaveAttribute('href', `/scan?rescan=${SCAN_ID}`);
    expect(api.checkoutCalls).toBe(1);
    expect(await noHorizontalScroll(page)).toBeLessThanOrEqual(0);
  });

  test('waits for the payment webhook after returning from checkout', async ({ page }) => {
    await mockApi(page, { scan: (n) => (n < 2 ? freeScan() : paidScan()) });
    await page.goto(`/r/${SCAN_ID}?paid=1`);
    await expect(page.getByText('Confirming your payment')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'All findings' })).toBeVisible({ timeout: 15_000 });
  });

  test('a late payment webhook gets an honest note, then the page updates by itself', async ({ page }) => {
    let paid = false;
    let checked = false;
    await page.clock.install();
    await mockApi(page, {
      scan: () => (paid ? paidScan() : checked ? { ...freeScan(), free: { ...FREE, headline: 'REFRESHED-READ' } } : freeScan()),
    });
    await page.goto(`/r/${SCAN_ID}?paid=1`);
    await expect(page.getByText('Confirming your payment')).toBeVisible();
    await page.clock.fastForward('01:35');
    await expect(page.getByText('We haven’t received the payment confirmation yet')).toBeVisible();
    // The Unlock button is back, in case the payment never went through.
    await expect(page.getByRole('button', { name: 'Unlock full report — $29' })).toBeVisible();
    // "Check again" doesn't restart the 90-second clock. Wait until the refreshed poll has landed (its answer
    // carries a marker headline) before checking the page didn't fall back to "Confirming…".
    checked = true;
    await page.getByRole('button', { name: 'Check again' }).click();
    await expect(page.getByText('REFRESHED-READ')).toBeVisible();
    await expect(page.getByText('We haven’t received the payment confirmation yet')).toBeVisible();
    await expect(page.getByText('Confirming your payment')).toHaveCount(0);
    paid = true;
    const heading = page.getByRole('heading', { name: 'All findings' });
    // Jump past the next 10-second poll, retrying in case the jump lands before that timer is set.
    await expect.poll(async () => (await page.clock.fastForward('00:11'), heading.isVisible())).toBe(true);
  });

  test('a failed payment comes back to the Unlock button, not a wait for confirmation', async ({ page }) => {
    const api = await mockApi(page, { scan: () => freeScan() });
    await page.goto(`/r/${SCAN_ID}?paid=1&payment_id=pay_1&status=failed`);
    await expect(page.getByText('The payment didn’t go through. You can try again.')).toBeVisible();
    await expect(page.getByText('Confirming your payment')).toHaveCount(0);
    await page.getByRole('button', { name: 'Unlock full report — $29' }).click();
    await expect.poll(() => api.checkoutCalls).toBe(1);
  });

  test('analytics never receive a report id or a payment id', async ({ page }) => {
    const sent = await mockAnalytics(page);
    // posthog-js drops everything from automated browsers (navigator.webdriver, a "HeadlessChrome" brand): look like
    // a real one.
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
      Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => undefined });
    });
    await mockApi(page, { scan: () => paidScan() });
    await page.goto(`/r/${SCAN_ID}?paid=1&payment_id=pay_secret_1&status=succeeded`);
    await expect(page.getByRole('heading', { name: 'All findings' })).toBeVisible();
    // Events go out in batches every few seconds: wait for this page's before leaving it.
    await expect.poll(() => sent.some((r) => r.body.includes('purchase_completed')), { timeout: 15_000 }).toBe(true);
    // A second page load: posthog-js re-sends the first page's URL as "initial" person properties.
    const before = sent.length;
    await page.goto('/');
    await expect.poll(() => sent.slice(before).some((r) => r.body.includes('landing_view')), { timeout: 15_000 }).toBe(true);
    for (const r of sent) {
      expect(r.url + r.body).not.toContain(SCAN_ID);
      expect(r.url + r.body).not.toContain('pay_secret_1');
    }
    expect(sent.some((r) => r.body.includes('/r/:id')), 'the report page view is counted, without its id').toBe(true);
    expect(sent.filter((r) => /\/(flags|decide)\b/.test(r.url))).toEqual([]);
  });

  test('keeps polling through a dropped connection and says so', async ({ page }) => {
    let down = true;
    let attempts = 0;
    await page.clock.install();
    await mockApi(page, { scan: () => freeScan() });
    await page.route('**/get-scan*', (route) => (attempts++, down ? route.abort('internetdisconnected') : route.fallback()));
    await page.goto(`/r/${SCAN_ID}`);
    // Three failed polls (backing off 5 s, then 10 s) before the page admits it's offline.
    await expect.poll(async () => (await page.clock.fastForward('00:11'), attempts)).toBeGreaterThanOrEqual(3);
    await expect(page.getByRole('heading', { name: 'Can’t reach the server' })).toBeVisible();
    down = false;
    await page.getByRole('button', { name: 'Retry now' }).click();
    await expect(page.getByText('Titles follow one frame')).toBeVisible();
    await expect(page).toHaveTitle(/Your risk read: elevated/);
  });

  test('capacity error offers a retry that resubmits without re-uploading', async ({ page }) => {
    const api = await mockApi(page, { scan: (n) => (n === 0 ? errorScan('capacity') : freeScan()) });
    await fillScanForm(page);
    await page.getByRole('button', { name: 'Get my free risk read' }).click();
    await expect(page.getByText('We’re at capacity right now')).toBeVisible();
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('button', { name: 'Unlock full report — $29' })).toBeVisible({ timeout: 15_000 });
    expect(api.createBodies).toHaveLength(2);
    expect(api.createBodies[1]).toEqual(api.createBodies[0]);
  });

  test('unreadable screenshots get their own message', async ({ page }) => {
    await mockApi(page, { scan: () => errorScan('no_videos') });
    await page.goto(`/r/${SCAN_ID}`);
    await expect(page.getByText('We couldn’t read any videos')).toBeVisible();
  });

  test('unknown report id', async ({ page }) => {
    await mockApi(page, { scan: () => 404 });
    await page.goto(`/r/${SCAN_ID}`);
    await expect(page.getByText('Report not found')).toBeVisible();
  });

  test('Pro waitlist stores the email', async ({ page }) => {
    const api = await mockApi(page, { scan: () => paidScan() });
    await page.goto(`/r/${SCAN_ID}`);
    await page.getByPlaceholder('you@example.com').fill('creator@example.com');
    await page.getByRole('button', { name: 'Join the waitlist' }).click();
    await expect(page.getByText('You’re on the list')).toBeVisible();
    expect(api.waitlist[0]).toMatchObject({ email: 'creator@example.com', scan_id: SCAN_ID });
  });
});
