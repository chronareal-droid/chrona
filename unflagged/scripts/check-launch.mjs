// Pre-deploy check for the live site: fails the deploy on settings that would ship a broken or placeholder build.
// Reads env the way `vite build` does (.env, .env.production, then the process env, e.g. Cloudflare Pages variables).
import { readFileSync } from 'node:fs';
import { loadEnv } from 'vite';

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...pick(process.env, 'VITE_') };
const brand = readFileSync(new URL('../src/lib/brand.ts', import.meta.url), 'utf8');
const supportEmail = brand.match(/supportEmail:\s*'([^']*)'/)?.[1] ?? '';

const errors = [];
const warnings = [];

const url = env.VITE_SUPABASE_URL ?? '';
if (!url) errors.push('VITE_SUPABASE_URL is empty: every API call would hit the static host.');
else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) || url.includes('YOUR-PROJECT-REF')) {
  errors.push(`VITE_SUPABASE_URL doesn't look like a Supabase project URL: ${url}`);
}
if (!env.VITE_SUPABASE_ANON_KEY) errors.push('VITE_SUPABASE_ANON_KEY is empty: the functions gateway will reject every call.');
if (env.VITE_DEMO === '1') errors.push('VITE_DEMO=1 would ship the in-browser fake backend.');
if (!supportEmail || /@example\.(com|org|net)$/i.test(supportEmail)) {
  errors.push(`src/lib/brand.ts supportEmail is a placeholder (${supportEmail || 'empty'}): set an inbox you read.`);
}
if (!env.VITE_POSTHOG_KEY) warnings.push('VITE_POSTHOG_KEY is empty: analytics are off.');
else warnings.push('PostHog: check Project settings → "Discard client IP data" is on (the privacy page says it is).');

for (const w of warnings) console.warn(`warn: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
if (errors.length) {
  console.error(`\ncheck-launch: ${errors.length} problem(s); not deploying.`);
  process.exit(1);
}
console.log('check-launch: ok');

function pick(obj, prefix) {
  return Object.fromEntries(Object.entries(obj).filter(([k, v]) => k.startsWith(prefix) && v !== undefined));
}
