# Unflagged — rules for working in this folder

The full spec is `UNFLAGGED_BUILD_SPEC.md`; this file holds the parts that must never drift.
Brand name, prices and copy constants live in `src/lib/brand.ts` (renaming = edit one file).

## Non-negotiables

1. **Never promise approval or monetization.** Say "pre-check", "risk patterns", "matches what YouTube's published policy describes".
   Never write "guarantee", "safe", or "YouTube-approved" in product copy or prompts. Check with `grep -ri "guarantee" src`.
2. **No YouTube API in v1.** Analyze only what the user uploads or pastes: screenshots of their own channel, their scripts, their answers.
3. **Not affiliated with YouTube or Google.** No YouTube logo, no "YouTube" in the product name. The disclaimer is in the footer and on the report.
4. **Never store screenshots or scripts.** They live in memory inside `create-scan` and are dropped. Only `extracted` (video list),
   `signals` (numbers only) and `report` JSON are stored. No Supabase Storage. The privacy page says exactly this.
5. **Gemini free tier:**
   - Send only what the analysis needs (screenshots, scripts, answers, niche). Never send emails or IPs to the AI.
   - Say plainly by the upload button and on `/privacy` that Google may use uploads to improve its products.
   - EU/EEA, UK (GB) and Switzerland visitors see "Not available in your region yet" (`src/lib/region.ts`).
   - 18+ checkbox is required; the service must not target minors.
6. **Mobile-first.** Every screen works one-handed at 375px wide.
7. **Paid content never reaches the browser for unpaid reports.** `get-scan` strips paid fields server-side
   (`_shared/report.ts → toPublicView`). Never blur with CSS instead.

## Stack ($0)

- Frontend: Vite + React + TypeScript + Tailwind v4 + react-router. Static SPA → Cloudflare Pages (`public/_redirects` SPA fallback).
- Backend: Supabase free (Postgres + Deno Edge Functions). 150 s wall clock, 2 s CPU, 256 MB. RLS on, **no** public policies:
  only Edge Functions (service role) touch tables.
- AI: Gemini API free tier via `npm:@google/genai`, wrapped in `_shared/ai.ts → generateJson({ model, system, parts, schema })`.
  Models come from secrets `MODEL_EXTRACT` / `MODEL_JUDGE` (two different Flash-Lite models = two daily quotas).
- Payments: Dodo Payments hosted checkout (`create-checkout`), Standard Webhooks signature (`dodo-webhook`, `--no-verify-jwt`).
- Analytics: PostHog (no-op when `VITE_POSTHOG_KEY` is empty). Rate limit: 3 scans / salted-IP-hash / day in Postgres.

## Pipeline (`_shared/pipeline.ts`, runs under `EdgeRuntime.waitUntil` in `create-scan`)

1. **Extract** (`MODEL_EXTRACT`, Appendix B prompt): all screenshots in one call → `{ videos[], notes }`. Dedupe by normalized title in code.
2. **Signals** (`_shared/signals.ts`, pure TS, unit tested): title templating, duration uniformity, cadence, script signals.
   Raw numbers + `low|medium|high` flags; thresholds documented in comments. Passed to the judge as plain-English lines.
3. **Judge** (`MODEL_JUDGE`, Appendix A prompt): videos + labeled signals + scripts (≤ ~6,000 words) + answers + niche.
   zod-validated; one retry with the validation error appended.
4. **Guards** (`_shared/guards.ts`): drop `videos_to_review` titles not in the extracted list; drop quoted lines not found in the inputs.
5. Save `extracted`, `signals`, `report`, `status='done'`. Whole run must finish in ~140 s; AI 429/5xx → backoff 2/6/15 s →
   `status='error', error_code='capacity'`.

`top_findings` is severity-ordered; the first 2 are free.

## Commands

- `npm run dev` / `npm run build` / `npm run typecheck`
- `npm run test:functions` (deno test) / `npm run check:functions` (deno check)
