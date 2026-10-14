// Everything brand- or price-shaped lives here, so a rename is a one-file change.
export const BRAND = {
  name: 'Unflagged',
  tagline: 'Monetization pre-check for faceless creators',
  siteUrl: 'https://unflagged.pages.dev',
  /** TODO before launch: set a real inbox you control (shown on /privacy, /terms, /refunds). */
  supportEmail: 'support@example.com',
  priceUsd: 29,
  proPriceUsd: 19,
  refundDays: 7,
  rescanDays: 30,
  freeFindings: 2,
  disclaimer: 'Not affiliated with or endorsed by YouTube or Google.',
} as const;

export const PRICE = `$${BRAND.priceUsd}`;
