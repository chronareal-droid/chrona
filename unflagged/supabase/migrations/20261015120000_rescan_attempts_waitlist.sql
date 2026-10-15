-- Follow-up to 20261015000000_atomic_limits.sql, after review:
-- 1) A failed re-scan freed the slot with no cap, so one paid report link allowed unlimited AI calls (upload junk,
--    fail with no_videos, repeat). Now a re-scan that is done or still running holds the slot, failed ones don't,
--    and a paid report gets at most p_attempt_limit re-scan attempts in total.
-- 2) A scan whose worker died stays 'processing' until someone polls that exact row, and until then it held the
--    re-scan slot and counted toward the IP limit. The limit functions now expire such rows themselves first.
-- 3) Waitlist sign-ups: count + insert under a per-IP lock (it was two separate calls, so a burst got past it).

drop function if exists create_scan(text, jsonb, text, text, text, int, int);
drop function if exists create_rescan(uuid, text, jsonb, text, text, text, int);

-- Is the paid report's included re-scan used up? Read-only; get-scan shows it, create_rescan enforces it.
create function rescan_used(p_parent uuid, p_attempt_limit int default 5, p_stale_seconds int default 170)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select count(*) filter (
           where status = 'done'
              or (status = 'processing' and created_at >= now() - make_interval(secs => p_stale_seconds))
         ) > 0
      or count(*) >= p_attempt_limit
  from scans
  where rescan_of = p_parent;
$$;

create function create_scan(
  p_ip_hash text,
  p_answers jsonb,
  p_email text,
  p_niche text,
  p_src text,
  p_limit int default 3,
  p_attempt_limit int default 10,
  p_stale_seconds int default 170
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
  -- This IP's scans whose worker died: fail them, so a timeout (our side) stops counting.
  update scans set status = 'error', error_code = 'timeout', stage = null
  where ip_hash = p_ip_hash
    and status = 'processing'
    and created_at < now() - make_interval(secs => p_stale_seconds);

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

create function create_rescan(
  p_parent uuid,
  p_ip_hash text,
  p_answers jsonb,
  p_email text,
  p_niche text,
  p_src text,
  p_window_days int default 30,
  p_attempt_limit int default 5,
  p_stale_seconds int default 170
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  parent scans%rowtype;
  new_id uuid;
begin
  -- Locking the parent serializes re-scans of the same report.
  select * into parent from scans where id = p_parent for update;
  if not found
     or not parent.paid
     or parent.rescan_of is not null
     or parent.paid_at is null
     or parent.paid_at < now() - make_interval(days => p_window_days) then
    raise exception 'rescan_unavailable' using errcode = 'P0001';
  end if;

  -- A re-scan whose worker died doesn't hold the slot (the unique index would otherwise reject the next one).
  update scans set status = 'error', error_code = 'timeout', stage = null
  where rescan_of = p_parent
    and status = 'processing'
    and created_at < now() - make_interval(secs => p_stale_seconds);

  if rescan_used(p_parent, p_attempt_limit, p_stale_seconds) then
    raise exception 'rescan_used' using errcode = 'P0001';
  end if;

  insert into scans (ip_hash, answers, email, niche, src, paid, paid_at, payment_id, rescan_of)
  values (p_ip_hash, p_answers, p_email, p_niche, p_src, true, now(), parent.payment_id, p_parent)
  returning id into new_id;
  return new_id;
end;
$$;

-- 'joined' or 'already' (re-joining is a no-op success, even past the limit). Raises 'rate_limited' or
-- 'invalid_scan' (a scan id that doesn't exist).
create function join_waitlist(
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
begin
  perform pg_advisory_xact_lock(hashtext('waitlist:' || p_ip_hash));
  if exists (select 1 from waitlist where lower(email) = lower(p_email) and plan = p_plan) then
    return 'already';
  end if;
  if (select count(*) from waitlist where ip_hash = p_ip_hash and created_at > now() - interval '24 hours') >= p_limit then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if p_scan_id is not null and not exists (select 1 from scans where id = p_scan_id) then
    raise exception 'invalid_scan' using errcode = 'P0001';
  end if;
  insert into waitlist (email, plan, scan_id, source, ip_hash)
  values (lower(p_email), p_plan, p_scan_id, p_source, p_ip_hash)
  on conflict do nothing;
  return 'joined';
end;
$$;

-- Only the Edge Functions (service role) may call these. Supabase grants EXECUTE on new functions to anon and
-- authenticated by default, so revoking from PUBLIC alone is not enough.
revoke execute on function rescan_used(uuid, int, int) from public, anon, authenticated;
revoke execute on function create_scan(text, jsonb, text, text, text, int, int, int) from public, anon, authenticated;
revoke execute on function create_rescan(uuid, text, jsonb, text, text, text, int, int, int) from public, anon, authenticated;
revoke execute on function join_waitlist(text, text, uuid, text, text, int) from public, anon, authenticated;
grant execute on function rescan_used(uuid, int, int) to service_role;
grant execute on function create_scan(text, jsonb, text, text, text, int, int, int) to service_role;
grant execute on function create_rescan(uuid, text, jsonb, text, text, text, int, int, int) to service_role;
grant execute on function join_waitlist(text, text, uuid, text, text, int) to service_role;
