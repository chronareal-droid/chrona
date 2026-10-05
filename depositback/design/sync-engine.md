---
title: Future — Whop Data Sync Engine
description: Design document for a potential Whop-to-Postgres sync engine, inspired by Supabase's stripe-sync-engine.
---

# Whop Data Sync Engine (Future)

This document outlines how a Whop data sync engine could work, inspired by [Supabase's stripe-sync-engine](https://github.com/supabase/stripe-sync-engine). This is **not yet implemented** — it's a design reference for when the need arises.

## Why a sync engine?

Currently we track subscription state as a single `plan` string on the User model, updated by webhooks. This works well for access control but has limitations:

- **No billing history** — can't show past invoices or payment amounts
- **No subscription metadata** — don't know renewal dates, trial end dates, or payment methods
- **No recovery from missed webhooks** — if a webhook fails, our DB is out of sync until the next event
- **No analytics queries** — can't do things like "revenue by plan this month" or "churn rate" from our own DB

A sync engine mirrors Whop's data into your Postgres, giving you full SQL access to billing data.

## Architecture

```
┌──────────┐     webhooks      ┌──────────────┐     upsert     ┌──────────┐
│   Whop   │ ───────────────→  │  Sync Engine  │ ────────────→  │ Postgres │
│   API    │ ←─────────────── │  (API route)  │                │  (whop.  │
│          │    backfill       │               │                │  schema) │
└──────────┘                   └──────────────┘                └──────────┘
```

### Two sync mechanisms

1. **Webhook-driven (real-time)** — process each Whop webhook event and upsert the relevant entity into a local table. This is what we already do for `membership_activated` etc., but expanded to cover all entity types.

2. **Backfill (on-demand)** — paginate through Whop's list APIs and bulk-upsert everything. Used for initial setup, recovery from downtime, or periodic consistency checks.

## Proposed schema

A dedicated `whop` schema in Postgres with tables mirroring Whop's data model:

```sql
CREATE SCHEMA IF NOT EXISTS whop;

-- Core entities
CREATE TABLE whop.memberships (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  product_id    TEXT,
  plan_id       TEXT,
  status        TEXT,        -- active, canceled, expired, etc.
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at   TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE whop.payments (
  id            TEXT PRIMARY KEY,
  membership_id TEXT REFERENCES whop.memberships(id),
  user_id       TEXT NOT NULL,
  amount        INTEGER,     -- cents
  currency      TEXT,
  status        TEXT,        -- succeeded, failed, refunded
  created_at    TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE whop.products (
  id            TEXT PRIMARY KEY,
  title         TEXT,
  created_at    TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE whop.plans (
  id            TEXT PRIMARY KEY,
  product_id    TEXT REFERENCES whop.products(id),
  plan_type     TEXT,        -- recurring, one_time, free
  amount        INTEGER,
  currency      TEXT,
  billing_period TEXT,       -- monthly, yearly, etc.
  created_at    TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Timestamp protection

Every table has a `last_synced_at` column. Upserts include a `WHERE` guard:

```sql
INSERT INTO whop.memberships (id, ..., last_synced_at)
VALUES ($1, ..., NOW())
ON CONFLICT (id) DO UPDATE SET ...
WHERE whop.memberships.last_synced_at <= EXCLUDED.last_synced_at;
```

This prevents older webhook payloads from overwriting newer data (solves race conditions from out-of-order delivery).

## Implementation approach

### Option A: Extend existing webhook handler

Add new cases to `app/api/webhooks/whop/route.ts` that upsert into the `whop.*` tables. Simplest approach — no new infrastructure.

```typescript
case "payment_succeeded": {
  await upsertPayment(event.data);
  break;
}
```

### Option B: Dedicated sync service

A separate API route (`/api/sync/whop`) that handles both webhook processing and backfill. More modular, can be disabled without affecting core app.

### Backfill endpoint

```typescript
// POST /api/sync/whop/backfill
// Admin-only, triggers a full sync from Whop's list APIs
export async function POST() {
  // Paginate through Whop API
  // Bulk upsert into whop.* tables
  // Return sync statistics
}
```

## When to build this

Build a sync engine when you need any of:

- **Billing history UI** — showing past invoices, payment amounts, receipts
- **Revenue analytics** — MRR, churn rate, plan distribution, cohort analysis
- **Subscription metadata display** — renewal dates, trial end dates in the dashboard
- **Audit trail** — complete record of all membership state changes
- **Recovery mechanism** — ability to rebuild state from Whop API after missed webhooks

Until then, the current approach (webhook-driven plan string + `checkWhopAccess()` for real-time verification) is sufficient and simpler to maintain.
