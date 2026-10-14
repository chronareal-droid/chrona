import { assert, assertEquals } from "@std/assert";
import { paidScanFromEvent, signWebhook, verifyWebhook } from "./dodo.ts";

const SECRET = `whsec_${btoa("test-secret-bytes-0123456789")}`;
const body = JSON.stringify({ type: "payment.succeeded", data: { payment_id: "pay_1", metadata: { scan_id: "s1" } } });

async function headers(over: Record<string, string> = {}, ts = Math.floor(Date.now() / 1000)) {
  const sig = await signWebhook(SECRET, "msg_1", String(ts), body);
  return new Headers({ "webhook-id": "msg_1", "webhook-timestamp": String(ts), "webhook-signature": `v1,${sig}`, ...over });
}

Deno.test("verifyWebhook accepts a valid Standard Webhooks signature", async () => {
  assert(await verifyWebhook(SECRET, await headers(), body));
  // Multiple signatures (secret rotation): any match passes.
  const h = await headers();
  h.set("webhook-signature", `v1,bm9wZQ== ${h.get("webhook-signature")}`);
  assert(await verifyWebhook(SECRET, h, body));
});

Deno.test("verifyWebhook rejects tampering, wrong secret, stale timestamps and missing headers", async () => {
  assert(!(await verifyWebhook(SECRET, await headers(), body.replace("pay_1", "pay_2"))));
  assert(!(await verifyWebhook(`whsec_${btoa("other")}`, await headers(), body)));
  assert(!(await verifyWebhook(SECRET, await headers({}, Math.floor(Date.now() / 1000) - 3600), body)));
  const h = await headers();
  h.delete("webhook-id");
  assert(!(await verifyWebhook(SECRET, h, body)));
});

Deno.test("paidScanFromEvent only accepts payment.succeeded with a scan id", () => {
  assertEquals(paidScanFromEvent(JSON.parse(body)), { scanId: "s1", paymentId: "pay_1" });
  assertEquals(paidScanFromEvent({ type: "payment.failed", data: { payment_id: "p", metadata: { scan_id: "s" } } }), null);
  assertEquals(paidScanFromEvent({ type: "payment.succeeded", data: { payment_id: "p" } }), null);
});
