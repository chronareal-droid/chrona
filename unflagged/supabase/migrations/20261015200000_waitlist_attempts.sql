-- Follow-up to 20261015180000_rescan_fairness_waitlist_order.sql: the waitlist limit counted inserted rows, and
-- re-joining with an email already on the list inserts none. So whether the next call from that IP hit the limit
-- revealed whether the email was a member. Every call that passes the checks now uses a slot, member or not.

create table waitlist_attempts (
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index waitlist_attempts_ip_day on waitlist_attempts (ip_hash, created_at);
alter table waitlist_attempts enable row level security;
revoke all on table waitlist_attempts from anon, authenticated;

create or replace function join_waitlist(
  p_email text,
  p_plan text,
  p_scan_id uuid,
  p_source text,
  p_ip_hash text,
  p_limit int default 5
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int;
begin
  perform pg_advisory_xact_lock(hashtext('waitlist:' || p_ip_hash));
  -- Nothing a caller can see may depend on whether the email is already on the list: not the error, and not the
  -- count that decides the next answer. (The function returns 'joined' or 'already' for logs; join-waitlist answers
  -- both with the same { ok: true }.)
  if (select count(*) from waitlist_attempts where ip_hash = p_ip_hash and created_at > now() - interval '24 hours') >= p_limit then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if p_scan_id is not null and not exists (select 1 from scans where id = p_scan_id) then
    raise exception 'invalid_scan' using errcode = 'P0001';
  end if;
  insert into waitlist_attempts (ip_hash) values (p_ip_hash);
  insert into waitlist (email, plan, scan_id, source, ip_hash)
  values (lower(p_email), p_plan, p_scan_id, p_source, p_ip_hash)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  return case when inserted = 1 then 'joined' else 'already' end;
end;
$$;
