// `npm run test:db`: applies every migration to PGlite (real Postgres compiled to WASM, no server needed) and checks
// the limit RPCs behave as create-scan expects. Concurrency isn't covered (PGlite is one connection); the advisory
// lock and the unique index handle that.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const dir = new URL('../migrations', import.meta.url).pathname;
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role;`);
for (const f of readdirSync(dir).sort()) {
  await db.exec(readFileSync(`${dir}/${f}`, 'utf8'));
  console.log('applied', f);
}
const ok = (name) => console.log('  ok -', name);
const err = async (sql, params) => {
  try { await db.query(sql, params); return null; } catch (e) { return e.message; }
};
const scan = (ip) => db.query(`select create_scan($1, '{"voice":"ai"}'::jsonb, null, null, null, 3, 10) as id`, [ip]).then((r) => r.rows[0].id);
const rescan = (parent, ip = 'ipR') => db.query(`select create_rescan($1, $2, '{}'::jsonb, null, null, null, 30) as id`, [parent, ip]).then((r) => r.rows[0].id);

// 1) three scans, then rate_limited
for (let i = 0; i < 3; i++) await scan('ip1');
assert.equal(await err(`select create_scan('ip1', '{}'::jsonb, null, null, null, 3, 10)`), 'rate_limited');
ok('4th scan in 24 h is rate_limited');

// 2) our failures don't count, the user's do
const a = await scan('ip2');
await db.query(`update scans set status='error', error_code='capacity' where id=$1`, [a]);
const b = await scan('ip2');
await db.query(`update scans set status='error', error_code='timeout' where id=$1`, [b]);
await scan('ip2'); await scan('ip2'); await scan('ip2');
assert.equal(await err(`select create_scan('ip2', '{}'::jsonb, null, null, null, 3, 10)`), 'rate_limited');
ok('capacity/timeout errors are free; 3 counted scans still cap');
const c = await scan('ip3');
await db.query(`update scans set status='error', error_code='no_videos' where id=$1`, [c]);
await scan('ip3'); await scan('ip3');
assert.equal(await err(`select create_scan('ip3', '{}'::jsonb, null, null, null, 3, 10)`), 'rate_limited');
ok('no_videos (user-side) errors count');

// 3) attempt cap: 10 capacity failures
for (let i = 0; i < 10; i++) {
  const id = await scan('ip4');
  await db.query(`update scans set status='error', error_code='capacity' where id=$1`, [id]);
}
assert.equal(await err(`select create_scan('ip4', '{}'::jsonb, null, null, null, 3, 10)`), 'rate_limited');
ok('10 attempts cap even when every one failed on our side');

// 4) the window slides
await db.query(`update scans set created_at = now() - interval '25 hours' where ip_hash='ip1'`);
await scan('ip1');
ok('scans older than 24 h stop counting');

// 5) re-scans
const unpaid = await scan('ip5');
assert.equal(await err(`select create_rescan($1, 'x', '{}'::jsonb, null, null, null, 30)`, [unpaid]), 'rescan_unavailable');
assert.equal(await err(`select create_rescan(gen_random_uuid(), 'x', '{}'::jsonb, null, null, null, 30)`), 'rescan_unavailable');
ok('unpaid or unknown parent: rescan_unavailable');
await db.query(`update scans set paid=true, paid_at=now(), payment_id='pay_1' where id=$1`, [unpaid]);
const r1 = await rescan(unpaid);
const row = (await db.query(`select paid, payment_id, rescan_of from scans where id=$1`, [r1])).rows[0];
assert.deepEqual(row, { paid: true, payment_id: 'pay_1', rescan_of: unpaid });
assert.equal(await err(`select create_rescan($1, 'x', '{}'::jsonb, null, null, null, 30)`, [unpaid]), 'rescan_used');
ok('paid parent: one re-scan, inherits payment, second is rescan_used');
await db.query(`update scans set status='error', error_code='capacity' where id=$1`, [r1]);
const r2 = await rescan(unpaid);
assert.ok(r2);
ok('a failed re-scan frees the slot');
assert.equal(await err(`select create_rescan($1, 'x', '{}'::jsonb, null, null, null, 30)`, [r2]), 'rescan_unavailable');
ok('a re-scan has no re-scan of its own');
const dup = await err(`insert into scans (ip_hash, answers, rescan_of) values ('x', '{}', $1)`, [unpaid]);
assert.match(dup, /scans_one_rescan/);
ok('unique index backs it up (raced insert → 23505)');
const old = await scan('ip6');
await db.query(`update scans set paid=true, paid_at=now() - interval '31 days' where id=$1`, [old]);
assert.equal(await err(`select create_rescan($1, 'x', '{}'::jsonb, null, null, null, 30)`, [old]), 'rescan_unavailable');
ok('window closes after 30 days');
// re-scans don't use up the creator's daily free scans
for (let i = 0; i < 3; i++) await scan('ipR');
ok('re-scans are not counted toward the daily limit');

// 6) privileges
const priv = (await db.query(`select
  has_function_privilege('anon', 'create_scan(text,jsonb,text,text,text,int,int)', 'execute') as anon_scan,
  has_function_privilege('authenticated', 'create_rescan(uuid,text,jsonb,text,text,text,int)', 'execute') as auth_rescan,
  has_function_privilege('service_role', 'create_scan(text,jsonb,text,text,text,int,int)', 'execute') as svc_scan`)).rows[0];
assert.deepEqual(priv, { anon_scan: false, auth_rescan: false, svc_scan: true });
ok('only service_role may execute');
const cols = (await db.query(`select column_name from information_schema.columns where table_name='waitlist' and column_name='ip_hash'`)).rows;
assert.equal(cols.length, 1);
ok('waitlist.ip_hash exists');
console.log('all migration checks passed');
