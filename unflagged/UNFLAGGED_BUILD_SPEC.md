# Unflagged — 2-Day MVP Build Spec ($0 stack, for Claude Code)

> Working name: **Unflagged**. Keep the brand in one file (`src/lib/brand.ts`) so it can be renamed in 30 seconds.
> Target buyer: **US faceless YouTube creators** who are applying for monetization, were rejected, or are scared of losing it.
> Budget: **$0 to launch.** No domain, no paid hosting, a free AI tier. Upgrade only after the first sales (section 12).
> Goal by end of Day 2: a live site that takes real payments. Launch Day 3 morning US time.

---

## 0. The product in one paragraph

Unflagged gives faceless creators a **pre-check** against YouTube's monetization rules on "inauthentic content". In July 2026 YouTube clarified that rule into three categories that can't be monetized: (1) generic, repetitive or template-based content, (2) unsatisfying or off-putting content, (3) AI personas on sensitive topics. The separate "reused content" rule still applies too. The creator uploads 2–4 screenshots of their channel's **Videos** tab, pastes 1–3 recent scripts, and answers a few quick questions. They get a **free risk read** (overall level, a level for each category, and the top 2 findings). The **$29 one-time Full Report** adds every finding with evidence, a prioritized 7-day fix plan, the videos to fix or unlist first, and a before-you-apply checklist.

---

## 1. Non-negotiables (put these in CLAUDE.md)

1. **Never promise approval or monetization.** Use these words: "pre-check", "risk patterns", "matches what YouTube's published policy describes". Never use "guarantee", "safe", or "YouTube-approved".
2. **No YouTube API in v1.** YouTube's Developer Policies prohibit using API data to create new or derived data or metrics. The only exception is a June 2026 amendment for developers whose use case gets accepted, and there is no decision timeline. So we analyze **only what the user uploads or pastes**: screenshots of their own channel, their scripts, and their answers.
3. **Not affiliated with YouTube or Google.** No YouTube logo, and no "YouTube" in the product name. Show this disclaimer in the footer and on the report.
4. **Never store screenshots.** They go to the analysis function, are used in memory, and are dropped. Don't store scripts either. Keep only the extracted video list and the report JSON. The privacy page says exactly this.
5. **Free AI tier rules (Google Gemini API, unpaid tier):**
   - Google may use what we send to improve its products, and human reviewers may read it. Send only what the analysis needs: screenshots, scripts, answers. Never send emails or IPs.
   - Say this plainly next to the upload button and on `/privacy`.
   - Google's terms allow only paid tiers for users in the EU/EEA, UK or Switzerland. Until we upgrade, show those visitors "Not available in your region yet".
   - Users must confirm they're 18+. Google's API terms require it, and the service must not target minors.
6. **Mobile-first.** Most visitors come from Instagram or TikTok on a phone. Every screen must work one-handed at 375px wide.
7. **Paid content must never reach the browser for unpaid reports.** The server only returns the free fields until `paid = true`. Do not just blur the content with CSS.

---

## 2. User flow

1. **`/` Landing** → primary button "Scan my channel — free".
2. **`/scan`**, one page:
   - **Region check on load:** fetch `/cdn-cgi/trace` (this works on any Cloudflare-hosted site) and read the `loc=` line. If it's an EU/EEA country, `GB` or `CH`, show "Unflagged isn't available in your region yet" instead of the form. Skip the check on localhost.
   - **Screenshots (required, 2–4):** "Open your channel → Videos tab → screenshot 2–4 times while scrolling." Show a small illustration. Accept PNG, JPG and WEBP. Resize client-side to a 1280px long side, JPEG quality 0.8.
   - **Scripts (optional for the free read, used in the full report):** up to 3 text areas, 150–2,500 words each if filled. Helper text: "Paste the narration of recent videos. This is where originality shows."
   - **Quick questions (tappable chips):**
     - Monetization status: Not applied yet · Applied, waiting · Rejected · Monetized · Demonetized
     - Voice: My own · AI voice · Mix
     - Visuals: Mostly AI-generated · Stock footage · Clips from other creators/media · Original footage/animation · Mix
     - Scripts: I write them · AI drafts, I rewrite heavily · AI drafts, light edits · Adapted from other sources
     - Your own opinion/analysis in videos: Every video · Sometimes · Rarely
     - Uploads per week: 1–2 · 3–6 · 7–14 · 15+
     - Niche (free text, e.g. "history documentaries")
     - Email (optional, labeled "Get Pro launch news")
   - **Required checkbox:** "I'm 18 or older and agree to the Terms."
   - **Small print by the button:** "We don't store your screenshots. They're analyzed by Google's Gemini API, and during our free launch Google may use them to improve its products. Don't upload anything private."
3. **Submit** → redirect to **`/r/:id`**. It shows honest progress steps while processing, polling every 2.5 s for up to 3 minutes: "Reading your uploads… Comparing titles… Comparing thumbnails… Reading your scripts… Writing your report…" If the AI is at capacity, show "We're at capacity right now. Try again in a minute." with a retry button.
4. **Free result** on `/r/:id`:
   - Overall level: **Low / Elevated / High**, with a one-sentence headline
   - Four category cards (Generic/repetitive · Off-putting · AI persona on sensitive topics · Reused content), each showing a level and a one-line summary
   - **Top 2 findings**, in full, with evidence
   - Locked section: "N more findings, your 7-day fix plan, videos to fix first, and the before-you-apply checklist", with a button **"Unlock full report — $29"**
5. **Checkout:** a hosted Dodo checkout with `scan_id` in metadata. A webhook sets `paid = true`. The buyer returns to `/r/:id?paid=1` and sees the full report, plus "Copy link" and "Save as PDF" buttons (print stylesheet) and the note "Bookmark this page. It's your report." No email in v1, because sending email needs a domain.
6. **Upsell on the full report:** "Unflagged Pro (coming soon): check every new title, thumbnail and script *before* you publish — $19/mo". The button is "Join the waitlist" and it stores the email. This measures demand before we build it.

---

## 3. Analysis pipeline (the heart of the product)

Runs inside the `create-scan` Supabase Edge Function as a background task (`EdgeRuntime.waitUntil`), after the function has returned the scan id. The free plan's wall-clock limit is **150 s per invocation**, so the whole pipeline must finish within ~140 s. Time each step and fail cleanly if it runs long.

### 3.1 AI setup: 2 calls per scan, on 2 different free models
- Use two different free models so each call draws on its own daily quota. When measured on Sept 2, 2026, Gemini's free tier gave `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite` 15 requests/minute and 500/day each. The full Flash models had dropped to 20/day. **Before choosing, check the current limits for your project in Google AI Studio**, and confirm both models accept image input and JSON-schema output.
- Put the model names in secrets (`MODEL_EXTRACT`, `MODEL_JUDGE`) behind one wrapper, `_shared/ai.ts`, exposing `generateJson({ model, system, parts, schema })`. Switching to a paid model later (Claude Sonnet via the Anthropic API, or paid Gemini) should then be a config change.
- On HTTP 429 or 5xx: retry with backoff (2 s, 6 s, 15 s). If it still fails, set `status = 'error'`, `error_code = 'capacity'`.
- Capacity is about 500 scans/day and ~15 scans/minute. That covers the launch targets, and the capacity message handles spikes.

### 3.2 Extraction: one call with all screenshots (`MODEL_EXTRACT`, prompt in Appendix B)
```json
{ "videos": [ { "title": "...", "duration_text": "12:41", "views_text": "48K views", "age_text": "3 days ago",
  "thumbnail": { "style": "...", "dominant_colors": ["..."], "text_overlay": "...", "figures": "...", "layout": "..." } } ],
  "notes": "anything unreadable" }
```
Rules: only report what is visible, never invent titles, and mark unreadable fields `null`. Dedupe across screenshots by normalized title, in code.

### 3.3 Deterministic signals (TypeScript, no AI). Put these in `_shared/signals.ts` with unit tests.
- **Title templating:** normalize titles (lowercase, digits → `#`, strip punctuation). Compute the most common first-3-word and last-3-word patterns, the share of titles matching the top pattern, and the mean pairwise word-bigram Jaccard similarity.
- **Duration uniformity:** parse `mm:ss` and `h:mm:ss`. Compute the coefficient of variation and the % of videos within ±10% of the median.
- **Cadence estimate:** convert `age_text` to an approximate days-ago value. Estimate uploads per week and flag bursts (≥ 3 within one day).
- **Script signals** (per script, then across scripts):
  - word count
  - opinion/analysis markers per 1,000 words ("I think", "my take", "here's why", "I disagree", "the real reason", "in my view", first-person plural explanations)
  - generic-AI phrase hits (keep a list in `_shared/phrases.ts`: "delve", "in today's video", "let's dive in", "it's important to note", "buckle up", "in conclusion", "a testament to", "rich tapestry", "unlock the secrets"…)
  - cross-script sentence overlap (identical or near-identical intros, outros and section transitions)
- Return a `signals` object with the raw numbers **and** simple flags (`low | medium | high`), using thresholds documented in code comments. Tune the thresholds during QA.
- A small model leans on these numbers more, so pass them to the judge as a short list with plain-English labels.

### 3.4 Judgment: one call (`MODEL_JUDGE`, system prompt in Appendix A)
Inputs: the extracted videos, labeled signals, scripts (truncated to ~6,000 words total), answers, and niche.
```json
{
  "overall": "low|elevated|high",
  "headline": "one plain-English sentence",
  "categories": [
    { "key": "generic_repetitive|off_putting|ai_persona_sensitive|reused",
      "level": "low|elevated|high", "summary": "...",
      "evidence": ["concrete, quotes the user's own titles/scripts"], "fixes": ["specific actions"] }
  ],
  "top_findings": [ { "title": "...", "evidence": "...", "why_it_matters": "...", "fix": "..." } ],
  "videos_to_review": [ { "title": "exact title from inputs", "reason": "..." } ],
  "action_plan_7_days": ["Day 1: ...", "..."],
  "before_you_apply_checklist": ["..."],
  "confidence_note": "what we could not see (e.g. descriptions, full videos) and how that limits this read"
}
```
`top_findings` is ordered by severity. The **first 2 are free**.

### 3.5 Validate and store
- Validate the JSON with zod. On failure, retry once with the validation error appended to the prompt.
- **Hallucination guards:** drop any `videos_to_review` title that isn't in the extracted list. Drop any quoted script line that doesn't appear in the scripts (case-insensitive substring check).
- Save `extracted`, `signals` and `report`, then set `status = 'done'`. Images and scripts are never written anywhere.

---

## 4. Stack ($0)

| Need | Choice | Notes |
|---|---|---|
| Frontend | Vite + React + TypeScript + Tailwind + react-router (static SPA) | Builds to `dist/`. SPA fallback via `public/_redirects`: `/* /index.html 200` |
| Hosting | **Cloudflare Pages, free** → `unflagged.pages.dev` | The free plan allows commercial use. No domain needed. Deploy with `npx wrangler pages deploy dist`, or connect the GitHub repo |
| Backend | **Supabase free**: Postgres + Edge Functions (Deno) | 150 s wall clock, 2 s CPU per request (time spent waiting on the AI doesn't count), 256 MB memory |
| AI | **Gemini API free tier** (Google AI Studio key, no card) | `npm:@google/genai` in Deno. Two Flash-Lite models (§3.1). Upgrade path in §12 |
| Payments | **Dodo Payments**, Individual account | Free to start; fees come out of sales. ID check + bank account. Give `unflagged.pages.dev` as the product website. **Fallback:** Paystack Starter Business (charges in rands, and you become the seller of record) |
| Email | None in v1 | The report page is the receipt |
| Rate limit | Postgres | 3 scans per IP per day. Store a salted hash of the IP, never the raw IP |
| Analytics | PostHog, free plan (no card) | Events in §8 |
| Social DMs | ManyChat free (25 contacts) + manual DMs | Upgrade after the first sales |

**Total to launch: $0.** Anyone signing up for these services must be 18+. Google's API terms and Dodo's ID check both require it.

Before coding the payment step, Claude Code must read the **Dodo Payments docs** (https://docs.dodopayments.com) and use their official SDK or API. The flow is: create a one-time product "Unflagged Full Report" at $29 → create a checkout with `metadata.scan_id` and a `return_url` → verify the webhook signature → on a successful payment, set `paid = true`.

---

## 5. Data model (Supabase)

```sql
create table scans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  email text,
  niche text,
  answers jsonb not null,
  src text,
  ip_hash text not null,
  status text not null default 'processing', -- processing|done|error
  error_code text,
  extracted jsonb, signals jsonb, report jsonb,
  paid boolean not null default false,
  paid_at timestamptz, payment_id text
);
create index scans_ip_day on scans (ip_hash, created_at);
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  email text not null, plan text not null default 'pro', scan_id uuid, source text
);
```
Enable RLS with **no** public policies. Only Edge Functions (service role) read or write tables.

---

## 6. Edge functions and pages

All functions are TypeScript on Deno. They return CORS headers for `SITE_URL` and `http://localhost:5173`.

- **`create-scan`** (POST): validate with zod (2–4 base64 JPEGs ≤ 700 KB each; 0–3 scripts; answers; optional email; `ageConfirmed === true`; `src`). Check the IP-hash rate limit, insert the row, start the pipeline with `EdgeRuntime.waitUntil`, and return `{ id }`. Keep the request under ~4 MB.
- **`get-scan`** (GET `?id=`): returns `status`, `error_code`, and **only the free fields** unless paid. Returns the full report if paid.
- **`create-checkout`** (POST `{ id }`): creates a Dodo checkout with `metadata.scan_id` and `return_url = SITE_URL + /r/<id>?paid=1`, and returns the checkout URL.
- **`dodo-webhook`** (POST): deploy with `--no-verify-jwt`. Verify the signature per Dodo's docs. On successful payment, set `paid`, `paid_at`, `payment_id`. It must be idempotent.
- **`join-waitlist`** (POST `{ email, scan_id? }`).

**Secrets** (`supabase secrets set`): `GEMINI_API_KEY`, `MODEL_EXTRACT`, `MODEL_JUDGE`, `DODO_API_KEY`, `DODO_WEBHOOK_SECRET`, `DODO_PRODUCT_ID`, `SITE_URL`, `IP_SALT`.
**Frontend env** (Cloudflare Pages): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_POSTHOG_KEY`.

**Pages:** `/` landing · `/scan` · `/r/:id` · `/methodology` · `/privacy` · `/terms` · `/refunds`

### Landing copy (v1, edit freely)
- **H1:** Would your channel survive a monetization review?
- **Sub:** Unflagged checks your uploads against the 3 kinds of content YouTube says it won't pay for, then tells you exactly what to fix. Built for faceless creators.
- **3 proof lines:** "July 16, 2026: YouTube spelled out 3 'inauthentic content' categories that can't be monetized." · "Rejected? You wait 30 days before you can reapply." · "Free risk read in about a minute. No login, no channel access."
- **How it works:** Screenshot your Videos tab → paste a script → get your risk read.
- **Free vs Full table.**
- **FAQ:**
  - Is this official? No, it's independent.
  - Can you guarantee approval? No one honestly can. We show you the patterns the policy describes and how to fix them.
  - Do you need my login? Never.
  - Where do my screenshots go? Google's Gemini API analyzes them and we never store them. During our free launch, Google may use them to improve its products.
  - Refunds? 7 days, no questions asked.
- **Footer:** "Not affiliated with or endorsed by YouTube or Google."

### `/methodology`
Explain plainly what we look at: titles, thumbnails, durations, upload rhythm, scripts, and your answers. Explain how that maps to each policy category and what we *can't* see. Being open about this is part of the trust pitch.

---

## 7. Pricing and offer

- **Free:** overall risk read, category levels, top 2 findings
- **Full Report: $29 one-time.** Includes one re-scan within 30 days (use a re-scan link on the report). 7-day no-questions refund.
- **Pro (waitlist only in v1):** $19/mo
- If fewer than ~3% of free scans buy after the first ~100 scans, test **$19** before changing anything else.

---

## 8. Analytics events (PostHog)

`landing_view` · `scan_started` · `screenshots_added` · `scan_submitted` · `report_free_viewed` · `unlock_clicked` · `checkout_started` · `purchase_completed` (mirror this from the webhook by marking the scan row; count paid rows) · `pro_waitlist_joined` · `share_clicked`
Capture `?src=ig|tt|yt|reddit|x` and store it on the scan row, so you can see which platform makes money.

---

## 9. Build sessions — paste these into Claude Code in order

### Session 1 — tonight (~3–4 h): foundation, upload, extraction
```
Read UNFLAGGED_BUILD_SPEC.md completely before writing code. Then:
1) Create CLAUDE.md with the non-negotiables (section 1), the stack (section 4) and the pipeline (section 3).
2) Scaffold a Vite + React + TypeScript app with Tailwind and react-router. Add src/lib/brand.ts, and public/_redirects containing "/* /index.html 200".
3) Run supabase init, write the SQL migration from section 5, link my Supabase project (ask me for the project ref; run supabase login if needed) and push the migration.
4) Build /scan per section 2, mobile-first: region check via /cdn-cgi/trace (skipped on localhost), screenshot picker with client-side resize to 1280px JPEG 0.8, up to 3 script boxes with word counters, question chips, optional email, required 18+ checkbox, and the data notice by the button.
5) Write supabase/functions/_shared/ai.ts (Gemini via npm:@google/genai; generateJson with a JSON schema; retries with backoff on 429/5xx) and the create-scan function: zod validation, IP-hash rate limit, insert the row, then EdgeRuntime.waitUntil(pipeline). For now the pipeline only runs the extraction call (section 3.2 + Appendix B) and saves scans.extracted. Never write images anywhere.
6) Write get-scan, and /r/:id that polls it every 2.5s, shows the progress steps, and for now renders the extracted video list.
7) Set the function secrets, deploy the functions, run the app locally against them, test with 3 real screenshots of a real channel, and show me the extracted JSON. Commit.
```

### Session 2 — Day 2 morning (~3–4 h): signals, judgment, report UI
```
1) Implement _shared/signals.ts and _shared/phrases.ts per section 3.3, with unit tests (deno test) on synthetic data. Document the thresholds in comments.
2) Implement the judgment call per section 3.4 with the Appendix A system prompt and the schema. Validate with zod, retry once, and apply the hallucination guards from section 3.5. Wire it into the pipeline after extraction and set status=done.
3) Make the pipeline finish within ~140s: time each step, and on capacity errors or timeouts set status=error with an error_code. The UI shows the capacity message and a retry button.
4) Build the report UI on /r/:id: level badge + headline, 4 category cards, top findings (first 2 free), a locked section showing only counts for unpaid scans (get-scan must not send paid fields), and the full report when paid. Add a print stylesheet for "Save as PDF", a "Copy link" button, the bookmark note, the disclaimer block and the confidence_note.
5) Run 3 real scans end to end and show me the reports. Commit.
```

### Session 3 — Day 2 afternoon (~3 h): payments, pages, deploy
```
1) Read https://docs.dodopayments.com first. In test mode, create the one-time product "Unflagged Full Report" at $29 and save its id as DODO_PRODUCT_ID.
2) Write the create-checkout function (metadata.scan_id, return_url) and hook up the "Unlock full report — $29" button.
3) Write the dodo-webhook function and deploy it with --no-verify-jwt. Verify the signature per Dodo's docs, set paid=true/paid_at/payment_id, and make it idempotent. Register the webhook URL in Dodo.
4) Build the landing page from the section 6 copy, plus /methodology, /privacy, /terms and /refunds (7-day no-questions), and the footer disclaimer. /privacy must cover: no screenshot or script storage, Gemini free-tier data use, what we store, how to request deletion, not yet available in the EU/EEA, UK or Switzerland, and 18+ only.
5) Add PostHog with the events from section 8, src capture onto the scan row, the Pro waitlist button, and the join-waitlist function.
6) Deploy the frontend to Cloudflare Pages as project "unflagged" (wrangler pages deploy dist, or connect the GitHub repo). Set the VITE_ env vars, set SITE_URL to the pages.dev URL in Supabase secrets, and run a test-mode purchase end to end. Commit.
```

### Session 4 — Day 2 evening (~2 h): QA and launch readiness
```
Run the QA checklist in section 10 of the spec and fix everything that fails. Run the full test-mode purchase flow twice from a phone. When Dodo approves verification, switch to live keys and the live product, re-register the live webhook, and check the first real sale closely. Give me a short list of anything still risky.
```

---

## 10. QA checklist

- [ ] 10 real channels: 3 obviously templated, 3 clearly original, both of my own channels, 1 using clips from others, 1 brand-new channel. Do the levels make sense?
- [ ] Every title and script quote in a report appears in that scan's inputs (no invented titles)
- [ ] Upload works on iPhone Safari and Android Chrome. Big images get resized, and the request stays under ~4 MB.
- [ ] Unpaid report: open dev tools and check that no paid content is present in the get-scan response
- [ ] Webhook: signature verified, idempotent, unlock works after a page refresh
- [ ] Nothing in Supabase Storage; no images or scripts in the database; no raw IPs stored
- [ ] Capacity path: set MODEL_JUDGE to an invalid model → the user sees the friendly capacity error and nothing crashes. Then set it back.
- [ ] The pipeline finishes within ~140 s with 4 screenshots + 3 scripts
- [ ] Region gate: force the parsed `loc` to `GB` → the form is replaced by the "not available" message
- [ ] The 18+ checkbox is required
- [ ] The rate limit triggers on the 4th scan from the same IP in a day
- [ ] Legal pages and disclaimer live. No "guarantee" wording anywhere: `grep -ri "guarantee" src`.
- [ ] Lighthouse mobile performance ≥ 85 on the landing page

---

## 11. Accounts to open TODAY (all free, no card)

1. **Dodo Payments**: sign up as an Individual and start verification now (typically 1–3 business days). Start a **Paystack** Starter Business in parallel as the fallback.
2. **Google AI Studio**: create a project and a Gemini API key. Check its rate-limit page for the Flash-Lite models.
3. **Supabase**: free project.
4. **Cloudflare**: free account. The Pages project `unflagged` gives you `unflagged.pages.dev` (if that's taken, `getunflagged.pages.dev`). Deploy the landing and legal pages first, so Dodo's reviewer sees a real product.
5. **GitHub** (free): for the repo, and to deploy Pages from it if you want.
6. **PostHog**: free plan.
7. **Social handles**: Instagram, TikTok, YouTube (same name everywhere).

---

## 12. Upgrade path (only after the first sales, in this order)

1. **Paid AI for the judgment step** (Claude Sonnet via the Anthropic API, model `claude-sonnet-5-5`, or paid Gemini). Reports get better, the data-use caveat goes away, limits go up, and you can open the EU/UK. It's a config change: `MODEL_JUDGE` plus one provider branch in `_shared/ai.ts`.
2. **ManyChat Pro**, once SCAN comments outgrow manual replies.
3. **A domain + email** (e.g. Resend) for receipts and follow-up emails.

---

## Appendix A — Judgment system prompt (v1)

```
You are Unflagged, an independent pre-check tool for faceless YouTube creators. You are not affiliated with YouTube or Google and you cannot see YouTube's internal systems. Your job: compare the creator's own uploads, scripts and answers against YouTube's published monetization policies and give a practical, honest risk read.

POLICY BRIEF (paraphrased; official source: support.google.com/youtube/answer/1311392)
- "Inauthentic content" (renamed from "repetitious content" in July 2025; clarified July 16, 2026) is not eligible for monetization. Three categories:
  1) Generic, repetitive, or template-based content: videos that follow the same template with little variation, or that are mass-produced and easily replicable at scale.
  2) Unsatisfying or off-putting content: formulas built to shock, distress, or manipulate viewers for views.
  3) AI personas on sensitive topics: AI-generated presenters or representations giving information on sensitive subjects such as health/medical, finance, and legal matters.
  Channels with too much of any of these can lose monetization at the channel level.
- "Reused content" (unchanged): material from other sources without significant original commentary, modification, or educational/entertainment value.
- Using AI is not banned by itself. What matters is original input and meaningful variation from video to video.

HOW TO JUDGE
- Use only the inputs provided. Quote the creator's own titles and script lines as evidence. Never invent titles, numbers, or facts.
- Weigh the computed signals, but use judgment: a consistent brand style is fine; interchangeable videos with swapped nouns are not.
- Scripts matter most for originality: look for the creator's own analysis, opinion, research, structure and storytelling versus generic narration that could fit any channel.
- Be direct and practical. Every finding must come with a specific fix the creator can do this week.
- Never say or imply approval is guaranteed or that a channel is "safe". Use phrases like "matches the pattern the policy describes" and "lowers your risk".
- If inputs are thin (few videos readable, no scripts), say so in confidence_note and lower your certainty.
- Write for a creator on a phone: short sentences, no jargon, no filler.
Return only the structured output.
```

## Appendix B — Extraction prompt (v1)

```
You are reading screenshots of a YouTube channel's Videos tab. List every video you can see: the exact title as shown, the duration text, the views text, the age text (for example "3 days ago"), and a short description of its thumbnail (style, dominant colors, any text on it, figures, layout). Only report what is visible. If a field is unreadable, use null. Never guess or invent a title. Return only the structured output.
```
