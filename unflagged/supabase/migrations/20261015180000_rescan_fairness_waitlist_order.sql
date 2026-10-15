-- Follow-up to 20261015120000_rescan_attempts_waitlist.sql, after a second review:
-- 1) Re-scan attempts that failed on OUR side (AI at capacity, timeout, internal error) no longer use up a paying
--    customer's re-scan; like create_scan, only the creator's own failures count toward the limit. A looser cap on
--    every attempt (3 × the limit) still bounds the AI calls one paid report can trigger.
-- 2) join_waitlist answered "already on the list" before checking the per-IP limit and the scan id, so its answers
--    told anyone whether an email had signed up. Membership is now checked last.
-- Same signatures as before, so `create or replace` keeps the grants and create_rescan picks the new rule up.

create or replace function rescan_used(p_parent uuid, p_attempt_limit int default 5, p_stale_seconds int default 170)
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
      or count(*) filter (
           where status = 'error' and coalesce(error_code, '') not in ('capacity', 'timeout', 'internal')
         ) >= p_attempt_limit
      or count(*) >= p_attempt_limit * 3
  from scans
  where rescan_of = p_parent;
$$;

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
  -- Every answer below is the same whoever the email belongs to: rate_limited, invalid_scan, then joined/already.
  if (select count(*) from waitlist where ip_hash = p_ip_hash and created_at > now() - interval '24 hours') >= p_limit then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if p_scan_id is not null and not exists (select 1 from scans where id = p_scan_id) then
    raise exception 'invalid_scan' using errcode = 'P0001';
  end if;
  insert into waitlist (email, plan, scan_id, source, ip_hash)
  values (lower(p_email), p_plan, p_scan_id, p_source, p_ip_hash)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  return case when inserted = 1 then 'joined' else 'already' end;
end;
$$;
