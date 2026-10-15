-- Rate limiting and re-scans, done atomically in the database.
-- (Before: create-scan counted rows and then inserted in two separate calls, so parallel requests all passed the
-- count; failed scans weren't counted even though they had spent AI quota; and a failed re-scan used up the
-- customer's one included re-scan for good.)

-- 1) A re-scan that ends in error no longer holds the parent's one re-scan slot.
drop index if exists scans_one_rescan;
create unique index scans_one_rescan on scans (rescan_of) where rescan_of is not null and status <> 'error';

-- 2) Count + insert under a per-IP lock. Every scan in the last 24 h counts, except failures that were ours
--    (AI at capacity, timeouts, internal errors). A second, looser cap counts every attempt, errors included.
create or replace function create_scan(
  p_ip_hash text,
  p_answers jsonb,
  p_email text,
  p_niche text,
  p_src text,
  p_limit int default 3,
  p_attempt_limit int default 10
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  counted int;
  attempts int;
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('scan-limit:' || p_ip_hash));
  select
    count(*) filter (where status <> 'error' or coalesce(error_code, '') not in ('capacity', 'timeout', 'internal')),
    count(*)
  into counted, attempts
  from scans
  where ip_hash = p_ip_hash
    and rescan_of is null
    and created_at > now() - interval '24 hours';

  if counted >= p_limit or attempts >= p_attempt_limit then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into scans (ip_hash, answers, email, niche, src)
  values (p_ip_hash, p_answers, p_email, p_niche, p_src)
  returning id into new_id;
  return new_id;
end;
$$;

-- 3) Claim the included re-scan of a paid report (30 days from payment, once, unless the re-scan failed).
--    The parent row is locked so two simultaneous re-scans can't both pass.
create or replace function create_rescan(
  p_parent uuid,
  p_ip_hash text,
  p_answers jsonb,
  p_email text,
  p_niche text,
  p_src text,
  p_window_days int default 30
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  parent scans%rowtype;
  new_id uuid;
begin
  select * into parent from scans where id = p_parent for update;
  if not found
     or not parent.paid
     or parent.rescan_of is not null
     or parent.paid_at is null
     or parent.paid_at < now() - make_interval(days => p_window_days) then
    raise exception 'rescan_unavailable' using errcode = 'P0001';
  end if;
  if exists (select 1 from scans where rescan_of = p_parent and status <> 'error') then
    raise exception 'rescan_used' using errcode = 'P0001';
  end if;

  insert into scans (ip_hash, answers, email, niche, src, paid, paid_at, payment_id, rescan_of)
  values (p_ip_hash, p_answers, p_email, p_niche, p_src, true, now(), parent.payment_id, p_parent)
  returning id into new_id;
  return new_id;
end;
$$;

-- Only the Edge Functions (service role) may call these.
revoke execute on function create_scan(text, jsonb, text, text, text, int, int) from public, anon, authenticated;
revoke execute on function create_rescan(uuid, text, jsonb, text, text, text, int) from public, anon, authenticated;
grant execute on function create_scan(text, jsonb, text, text, text, int, int) to service_role;
grant execute on function create_rescan(uuid, text, jsonb, text, text, text, int) to service_role;

-- 4) Waitlist sign-ups are throttled per (hashed) IP too.
alter table waitlist add column if not exists ip_hash text;
create index if not exists waitlist_ip_day on waitlist (ip_hash, created_at);
