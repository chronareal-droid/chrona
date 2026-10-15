// `npm run test:db`: applies every migration to PGlite (real Postgres compiled to WASM, no server needed) and checks
// the limit RPCs behave as the Edge Functions expect. Concurrency isn't covered (PGlite is one connection); the
// advisory locks and the unique index handle that.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const dir = new URL('../migrations', import.meta.url).pathname;
const db = new PGlite();
// Mirror what Supabase sets up before our migrations run: its API roles, and default grants that give them access to
// every new table and EXECUTE on every new function (so a migration must revoke those explicitly).
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`);
for (const f of readdirSync(dir).sort()) {
  await db.exec(readFileSync(`${dir}/${f}`, 'utf8'));
  console.log('applied', f);
}

const ok = (name) => console.log('  ok -', name);
const err = async (sql, params) => {
  try {
    await db.query(sql, params);
    return null;
  } catch (e) {
    return e.message;
  }
};
const one = (sql, params) => db.query(sql, params).then((r) => r.rows[0]);
const scan = (ip) => one(`select create_scan($1, '{"voice":"ai"}'::jsonb, null, null, null, 3, 10, 170) as id`, [ip]).then((r) => r.id);
const scanErr = (ip) => err(`select create_scan($1, '{}'::jsonb, null, null, null, 3, 10, 170)`, [ip]);
const rescan = (parent, ip = 'ipR') =>
  one(`select create_rescan($1, $2, '{}'::jsonb, null, null, null, 30, 5, 170) as id`, [parent, ip]).then((r) => r.id);
const rescanErr = (parent) => err(`select create_rescan($1, 'x', '{}'::jsonb, null, null, null, 30, 5, 170)`, [parent]);
const used = (parent) => one(`select rescan_used($1, 5, 170) as u`, [parent]).then((r) => r.u);
const fail = (id, code) => db.query(`update scans set status='error', error_code=$2 where id=$1`, [id, code]);
const paidReport = async (ip) => {
  const id = await scan(ip);
  await db.query(`update scans set status='done', paid=true, paid_at=now(), payment_id='pay_' || $2 where id=$1`, [id, ip]);
  return id;
};

// ---------- create_scan ----------

for (let i = 0; i < 3; i++) await scan('ip1');
assert.equal(await scanErr('ip1'), 'rate_limited');
ok('4th scan in 24 h is rate_limited');

await fail(await scan('ip2'), 'capacity');
await fail(await scan('ip2'), 'timeout');
await scan('ip2'); await scan('ip2'); await scan('ip2');
assert.equal(await scanErr('ip2'), 'rate_limited');
ok('capacity/timeout errors are free; 3 counted scans still cap');

await fail(await scan('ip3'), 'no_videos');
await scan('ip3'); await scan('ip3');
assert.equal(await scanErr('ip3'), 'rate_limited');
ok('no_videos (user-side) errors count');

for (let i = 0; i < 10; i++) await fail(await scan('ip4'), 'capacity');
assert.equal(await scanErr('ip4'), 'rate_limited');
ok('10 attempts cap even when every one failed on our side');

await db.query(`update scans set created_at = now() - interval '25 hours' where ip_hash='ip1'`);
await scan('ip1');
ok('scans older than 24 h stop counting');

// A scan whose worker died (still "processing" long after any pipeline could run) is expired by the next scan.
const dead = [await scan('ip7'), await scan('ip7'), await scan('ip7')];
assert.equal(await scanErr('ip7'), 'rate_limited');
await db.query(`update scans set created_at = now() - interval '5 minutes' where id = $1`, [dead[0]]);
await scan('ip7');
assert.deepEqual(await one(`select status, error_code from scans where id=$1`, [dead[0]]), { status: 'error', error_code: 'timeout' });
ok('a stranded processing scan is failed as timeout and stops counting');
const fresh = await one(`select status from scans where id=$1`, [dead[1]]);
assert.equal(fresh.status, 'processing');
ok('a scan still within its time budget is left alone');

// ---------- re-scans ----------

const unpaid = await scan('ip5');
assert.equal(await rescanErr(unpaid), 'rescan_unavailable');
assert.equal(await err(`select create_rescan(gen_random_uuid(), 'x', '{}'::jsonb, null, null, null, 30, 5, 170)`), 'rescan_unavailable');
ok('unpaid or unknown parent: rescan_unavailable');

const p1 = await paidReport('ip5');
assert.equal(await used(p1), false);
const r1 = await rescan(p1);
assert.deepEqual(await one(`select paid, payment_id, rescan_of from scans where id=$1`, [r1]), { paid: true, payment_id: 'pay_ip5', rescan_of: p1 });
assert.equal(await used(p1), true);
assert.equal(await rescanErr(p1), 'rescan_used');
ok('paid parent: re-scan inherits the payment; a running one holds the slot');
await fail(r1, 'capacity');
assert.equal(await used(p1), false);
const r2 = await rescan(p1);
await db.query(`update scans set status='done' where id=$1`, [r2]);
assert.equal(await used(p1), true);
assert.equal(await rescanErr(p1), 'rescan_used');
ok('a failed re-scan frees the slot; a done one uses it for good');
assert.equal(await rescanErr(r2), 'rescan_unavailable');
ok('a re-scan has no re-scan of its own');

// The abuse the cap exists for: upload junk, fail with no_videos, repeat.
const p2 = await paidReport('ip8');
for (let i = 0; i < 5; i++) await fail(await rescan(p2), 'no_videos');
assert.equal(await used(p2), true);
assert.equal(await rescanErr(p2), 'rescan_used');
ok('at most 5 re-scan attempts per paid report, failed ones included');

// A re-scan whose worker died doesn't hold the slot.
const p3 = await paidReport('ip9');
const stuck = await rescan(p3);
await db.query(`update scans set created_at = now() - interval '5 minutes' where id=$1`, [stuck]);
assert.equal(await used(p3), false);
await rescan(p3);
assert.deepEqual(await one(`select status, error_code from scans where id=$1`, [stuck]), { status: 'error', error_code: 'timeout' });
ok('a stranded re-scan is expired and the next one is accepted');

const dup = await err(`insert into scans (ip_hash, answers, rescan_of) values ('x', '{}', $1)`, [p1]);
assert.match(dup, /scans_one_rescan/);
ok('unique index backs it up (raced insert → 23505)');

const old = await scan('ip6');
await db.query(`update scans set paid=true, paid_at=now() - interval '31 days' where id=$1`, [old]);
assert.equal(await rescanErr(old), 'rescan_unavailable');
ok('window closes after 30 days');

for (let i = 0; i < 3; i++) await scan('ipR');
ok('re-scans are not counted toward the daily limit');

// ---------- waitlist ----------

const join = (email, ip, scanId = null) => one(`select join_waitlist($1, 'pro', $2, null, $3, 5) as r`, [email, scanId, ip]).then((r) => r.r);
assert.equal(await join('A@x.com', 'w1', p1), 'joined');
assert.equal((await one(`select email, scan_id from waitlist where ip_hash='w1'`)).email, 'a@x.com');
assert.equal(await join('a@X.com', 'w1'), 'already');
ok('joins once, case-insensitively; re-joining is a no-op');
for (let i = 2; i <= 5; i++) await join(`u${i}@x.com`, 'w1');
assert.equal(await err(`select join_waitlist('u6@x.com', 'pro', null, null, 'w1', 5)`), 'rate_limited');
assert.equal(await join('a@x.com', 'w1'), 'already');
ok('5 sign-ups per IP per day; an existing sign-up still gets its no-op success');
assert.equal(await err(`select join_waitlist('z@x.com', 'pro', gen_random_uuid(), null, 'w2', 5)`), 'invalid_scan');
ok('a scan id that does not exist is rejected');

// ---------- who can do what ----------

const fns = {
  create_scan: 'create_scan(text,jsonb,text,text,text,int,int,int)',
  create_rescan: 'create_rescan(uuid,text,jsonb,text,text,text,int,int,int)',
  rescan_used: 'rescan_used(uuid,int,int)',
  join_waitlist: 'join_waitlist(text,text,uuid,text,text,int)',
};
for (const [name, sig] of Object.entries(fns)) {
  const p = await one(`select has_function_privilege('anon', $1, 'execute') as anon,
    has_function_privilege('authenticated', $1, 'execute') as auth,
    has_function_privilege('service_role', $1, 'execute') as svc`, [sig]);
  assert.deepEqual(p, { anon: false, auth: false, svc: true }, name);
}
const leftovers = await db.query(`select p.oid::regprocedure::text as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')`);
assert.deepEqual(leftovers.rows, [], 'no public function may be callable by anon');
ok('only service_role may execute the RPCs (Supabase default grants revoked)');

// RLS on with no policies: the anon key reads and writes nothing, even with Supabase's default table grants.
await db.exec(`set role anon`);
assert.equal((await one(`select count(*)::int as n from scans`)).n, 0);
assert.equal((await one(`select count(*)::int as n from waitlist`)).n, 0);
assert.match(await err(`insert into waitlist (email) values ('x@x.com')`), /row-level security/);
await db.exec(`reset role`);
assert.ok((await one(`select count(*)::int as n from scans`)).n > 0);
ok('RLS: anon sees no rows and cannot insert');

console.log('all migration checks passed');
