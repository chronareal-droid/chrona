# Unflagged

Monetization pre-check for faceless creators. Spec: [`UNFLAGGED_BUILD_SPEC.md`](UNFLAGGED_BUILD_SPEC.md). Rules that must not drift: [`CLAUDE.md`](CLAUDE.md).

```
src/                         Vite + React + Tailwind SPA (→ Cloudflare Pages)
  lib/brand.ts               name, prices, support email: rename here
supabase/migrations/         scans + waitlist tables, RLS on with no public policies
supabase/functions/
  _shared/signals.ts         deterministic signals (unit tested)
  _shared/ai.ts              generateJson() over Gemini, retries + deadline
  _shared/pipeline.ts        extract → signals → judge → guards → save
  _shared/guards.ts          drops invented titles and quotes
  _shared/report.ts          server-side free/paid split for get-scan
  _shared/dodo.ts            checkout session + Standard Webhooks verification
  create-scan · get-scan · create-checkout · dodo-webhook · join-waitlist
```

## Local checks

```bash
npm install
npm run build             # typecheck + production build
npm run test:functions    # deno test: signals, guards, pipeline (fake AI), webhook signatures, free/paid split
npm run check:functions   # deno check every function
```

## First deploy (needs your accounts; see spec section 11)

1. **Supabase**
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   cp supabase/functions/.env.example supabase/functions/.env   # fill it in
   #   IP_SALT: any long random string (openssl rand -hex 32)
   #   MODEL_EXTRACT / MODEL_JUDGE: two different Flash-Lite models that accept images + JSON schema.
   #     Check today's free limits for your project in Google AI Studio first.
   npx supabase secrets set --env-file supabase/functions/.env
   npx supabase functions deploy create-scan get-scan create-checkout join-waitlist
   npx supabase functions deploy dodo-webhook --no-verify-jwt
   ```
2. **Dodo Payments (test mode)**: create a one-time product "Unflagged Full Report" at $29 and set its id as
   `DODO_PRODUCT_ID`. Add a webhook pointing at `https://<project-ref>.supabase.co/functions/v1/dodo-webhook`
   subscribed to `payment.succeeded`, and set its signing secret (`whsec_...`) as `DODO_WEBHOOK_SECRET`.
   `DODO_MODE=test` uses `test.dodopayments.com`; switch to `live` with live keys once you're verified.
3. **Cloudflare Pages**: `npm run deploy:pages` (or connect the repo with root `unflagged`, build `npm run build`,
   output `dist`). Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_POSTHOG_KEY` in the Pages project,
   then set `SITE_URL` in Supabase secrets to the pages.dev URL (it controls CORS and the checkout return URL).
4. Set a real inbox in `src/lib/brand.ts → supportEmail` (shown on the privacy, terms and refunds pages).

## QA helpers

- Region gate: open `/scan?loc=GB` (the override can only block, never unblock).
- Capacity path: set `MODEL_JUDGE` to an invalid model name; the report page shows the capacity message + retry.
- Pipeline logs (`supabase functions logs create-scan`) print per-step timings and how many items the guards dropped.
