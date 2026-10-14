import { expect, test } from '@playwright/test';
import { errorScan, fillScanForm, freeScan, mockApi, noHorizontalScroll, PAID_ONLY, paidScan, processing, SCAN_ID } from './mock';

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

  test('shows the daily limit message when rate limited', async ({ page }) => {
    await mockApi(page, { create: () => ({ status: 429, error: 'rate_limited' }) });
    await fillScanForm(page);
    await page.getByRole('button', { name: 'Get my free risk read' }).click();
    await expect(page.getByText('You’ve hit today’s limit of 3 free scans')).toBeVisible();
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
