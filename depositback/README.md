# Keepsit

Helps US renters get their security deposit back. A free check shows the renter's state deadline and what
their landlord may owe them. The one-time **Recovery Kit** writes a demand letter that cites the state statute
and penalty and argues against each deduction.

Built on [Whop's SaaS starter](https://github.com/whopio/whop-saas-starter) (Next.js 16, Prisma + Postgres,
Whop for sign-in and payments) and the Claude API for letter drafting.

## What's here

| Path | What it does |
| --- | --- |
| `lib/deposit-laws.ts` | Deposit rules for all 50 states + DC (deadline, penalty, statute) and the `assessCase()` calculator |
| `lib/letter.ts` | Demand letter: fixed template for every legal claim + one Claude-written "what happened" section |
| `lib/cases.ts` | Case validation and DB conversion |
| `app/(marketing)/check` | Free deposit check (no account needed) |
| `app/dashboard/cases` | Renter's cases: create, edit, view, letter |
| `app/letter/[id]` | Print / save-as-PDF view of the letter |
| `app/api/cases` | Case CRUD + `POST /api/cases/:id/letter` (Recovery Kit only) |

Plans live in `lib/constants.ts`: `free` and `kit`. The kit is a **one-time** Whop plan; Whop grants a lifetime
membership on purchase, so the starter's membership webhooks unlock it.

## Run locally

```bash
pnpm install
cp .env.example .env.local    # set DATABASE_URL (any Postgres)
pnpm dev                      # http://localhost:3000, then follow the setup wizard
```

`ANTHROPIC_API_KEY` is optional. Without it, letters use a plain template for the "what happened" section.

## Launch checklist

1. **Legal review of `lib/deposit-laws.ts`.** Every state entry is marked `verified: false`. See
   [LEGAL_REVIEW.md](LEGAL_REVIEW.md). Do not launch until each entry is checked against the current statute.
2. **Replace the starter Terms and Privacy pages** (`app/(marketing)/terms`, `privacy`) with real ones that
   include the not-a-law-firm disclaimer.
3. **Whop:** create an app (OAuth + webhooks) and a product with a **one-time** plan (e.g. $29). Put the plan ID in
   the setup wizard or `NEXT_PUBLIC_WHOP_KIT_PLAN_ID`. Test with `NEXT_PUBLIC_WHOP_ENVIRONMENT=sandbox` first.
4. **Deploy:** Vercel + Neon Postgres works out of the box. Add `ANTHROPIC_API_KEY` in the Vercel env vars.
5. Run `pnpm build`. It must pass, and it needs a reachable database.
