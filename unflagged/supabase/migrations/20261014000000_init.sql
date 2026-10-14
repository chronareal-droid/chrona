-- Unflagged v1 schema. Only Edge Functions (service role) read or write these tables:
-- RLS is enabled with NO policies, so the anon key can't touch them.

create table scans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  email text,
  niche text,
  answers jsonb not null,
  src text,
  ip_hash text not null,
  status text not null default 'processing', -- processing|done|error
  stage text,                                -- extract|signals|judge (drives the honest progress steps)
  error_code text,
  extracted jsonb, signals jsonb, report jsonb,
  paid boolean not null default false,
  paid_at timestamptz, payment_id text,
  rescan_of uuid references scans (id)       -- the one free re-scan included with a Full Report
);
create index scans_ip_day on scans (ip_hash, created_at);
-- One re-scan per paid report, enforced by the database.
create unique index scans_one_rescan on scans (rescan_of) where rescan_of is not null;

create table waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  email text not null, plan text not null default 'pro', scan_id uuid, source text
);
create unique index waitlist_email_plan on waitlist (lower(email), plan);

alter table scans enable row level security;
alter table waitlist enable row level security;
