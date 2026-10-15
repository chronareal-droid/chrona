import { assert, assertEquals } from "@std/assert";
import { Webhook } from "standardwebhooks";
import { type PaymentEvent, paidScanFromEvent, signWebhook, verifyWebhook } from "./dodo.ts";

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

// The shape Dodo sends (from the official SDK's PaymentSucceededWebhookEvent: an envelope around a Payment).
const dodoEvent = {
  business_id: "bus_1",
  type: "payment.succeeded",
  timestamp: "2026-10-15T04:00:00Z",
  data: {
    payload_type: "Payment",
    payment_id: "pay_9",
    status: "succeeded",
    total_amount: 2900,
    currency: "USD",
    metadata: { scan_id: "11111111-2222-4333-8444-555555555555" },
    product_cart: [{ product_id: "pdt_report", quantity: 1 }],
    customer: { customer_id: "cus_1", email: "x@example.com", name: "X" },
  },
};

Deno.test("paidScanFromEvent reads Dodo's real envelope and checks the product", () => {
  assertEquals(paidScanFromEvent(dodoEvent, "pdt_report"), { scanId: "11111111-2222-4333-8444-555555555555", paymentId: "pay_9" });
  assertEquals(paidScanFromEvent(dodoEvent, "pdt_other"), { wrongProduct: true });
  // No product id configured, or a payment without a cart: don't block a real purchase.
  assertEquals(paidScanFromEvent(dodoEvent), { scanId: "11111111-2222-4333-8444-555555555555", paymentId: "pay_9" });
  const noCart: PaymentEvent = { ...dodoEvent, data: { ...dodoEvent.data, product_cart: null } };
  assertEquals(paidScanFromEvent(noCart, "pdt_report"), { scanId: "11111111-2222-4333-8444-555555555555", paymentId: "pay_9" });
});

Deno.test("verifyWebhook agrees with the reference Standard Webhooks library (what Dodo's SDK uses)", async () => {
  const raw = JSON.stringify(dodoEvent);
  const ref = new Webhook(SECRET);
  const now = new Date();
  const ts = String(Math.floor(now.getTime() / 1000));
  // Signed by the reference implementation, verified by ours.
  const refSig = ref.sign("msg_ref", now, raw);
  const h = new Headers({ "webhook-id": "msg_ref", "webhook-timestamp": ts, "webhook-signature": refSig });
  assert(await verifyWebhook(SECRET, h, raw));
  assert(!(await verifyWebhook(SECRET, h, raw.replace("pay_9", "pay_8"))));
  // Signed by ours, verified by the reference implementation (throws on a bad signature).
  const ours = `v1,${await signWebhook(SECRET, "msg_ours", ts, raw)}`;
  ref.verify(raw, { "webhook-id": "msg_ours", "webhook-timestamp": ts, "webhook-signature": ours });
});
