import { assert, assertEquals } from "@std/assert";
import type { ScanPatch } from "../_shared/pipeline.ts";
import type { CreateResult, NewScan, ScanStore } from "../_shared/store.ts";
import { createScanHandler } from "./handler.ts";

const ENV: Record<string, string> = { IP_SALT: "salt", MODEL_EXTRACT: "m1", MODEL_JUDGE: "m2", GEMINI_API_KEY: "k" };
const body = {
  images: ["/9j/4AAQSkZJRg==", "/9j/4AAQSkZJRg=="],
  scripts: [],
  answers: { monetization: "rejected", voice: "ai", visuals: "stock", scripts: "self_written", opinion: "sometimes", uploads: "3-6" },
  ageConfirmed: true,
};

function setup(result: () => CreateResult, env = ENV) {
  const calls: { kind: string; scan: NewScan; parent?: string }[] = [];
  const updates: ScanPatch[] = [];
  const background: Promise<unknown>[] = [];
  const store: ScanStore = {
    createScan: async (scan) => (calls.push({ kind: "scan", scan }), result()),
    createRescan: async (parent, scan) => (calls.push({ kind: "rescan", scan, parent }), result()),
    update: async (_id, patch) => void updates.push(patch),
  };
  const handler = createScanHandler({
    store,
    generateJson: async () => ({ videos: [] }),
    env: (k) => env[k],
    waitUntil: (p) => void background.push(p),
    log: () => {},
  });
  const post = (b: unknown, headers: Record<string, string> = {}) =>
    handler(new Request("https://x.test/create-scan", { method: "POST", body: JSON.stringify(b), headers: { "cf-connecting-ip": "203.0.113.9", ...headers } }));
  return { calls, updates, background, post };
}

Deno.test("create-scan: creates the scan and runs the pipeline in the background", async () => {
  const t = setup(() => ({ id: "00000000-0000-4000-8000-000000000001" }));
  const res = await t.post(body);
  assertEquals(res.status, 200);
  assertEquals((await res.json()).id, "00000000-0000-4000-8000-000000000001");
  assertEquals(t.calls[0].kind, "scan");
  assertEquals(t.background.length, 1);
  await t.background[0];
  assertEquals(t.updates.at(-1)?.error_code, "no_videos"); // the fake model saw no videos
});

Deno.test("create-scan: the IP key ignores a spoofed X-Forwarded-For", async () => {
  const t = setup(() => ({ id: "00000000-0000-4000-8000-000000000001" }));
  await t.post(body, { "x-forwarded-for": "1.2.3.4, 203.0.113.9" });
  await t.post(body, { "x-forwarded-for": "5.6.7.8, 203.0.113.9" });
  assertEquals(t.calls[0].scan.ip_hash, t.calls[1].scan.ip_hash);
});

Deno.test("create-scan: limits and re-scan errors map to their status codes", async () => {
  assertEquals((await setup(() => ({ error: "rate_limited" })).post(body)).status, 429);
  const used = await setup(() => ({ error: "rescan_used" })).post({ ...body, rescanOf: "00000000-0000-4000-8000-000000000009" });
  assertEquals(used.status, 409);
  assertEquals((await setup(() => ({ error: "rescan_unavailable" })).post(body)).status, 403);
});

Deno.test("create-scan: missing configuration fails before anything is stored", async () => {
  const t = setup(() => ({ id: "x" }), { IP_SALT: "salt" });
  assertEquals((await t.post(body)).status, 500);
  assertEquals(t.calls.length, 0);
});

Deno.test("create-scan: oversized and invalid bodies are rejected", async () => {
  const t = setup(() => ({ id: "x" }));
  const huge = { ...body, images: ["/9j/" + "A".repeat(5 * 1024 * 1024), "/9j/AAAA"] };
  assertEquals((await t.post(huge)).status, 413);
  const bad = await t.post({ ...body, ageConfirmed: false });
  assertEquals(bad.status, 400);
  assert(t.calls.length === 0);
});
