// POST from Dodo (deployed with --no-verify-jwt). Authenticated by the Standard Webhooks signature.
// Idempotent: only flips rows that aren't paid yet, so Dodo's retries are harmless.
import { db } from "../_shared/db.ts";
import { type PaymentEvent, paidScanFromEvent, verifyWebhook } from "../_shared/dodo.ts";
import { isUuid, requireEnv } from "../_shared/http.ts";

const text = (body: string, status = 200) => new Response(body, { status });

Deno.serve(async (req) => {
  if (req.method !== "POST") return text("method not allowed", 405);
  try {
    const raw = await req.text(); // verify against the exact bytes Dodo signed
    if (!(await verifyWebhook(requireEnv("DODO_WEBHOOK_SECRET"), req.headers, raw))) {
      return text("invalid signature", 401);
    }
    const evt = JSON.parse(raw) as PaymentEvent;
    const paid = paidScanFromEvent(evt, Deno.env.get("DODO_PRODUCT_ID"));
    if (!paid) return text("ignored");
    if ("wrongProduct" in paid) {
      console.error(JSON.stringify({ fn: "dodo-webhook", error: "payment.succeeded for another product; check DODO_PRODUCT_ID" }));
      return text("ignored");
    }
    if (!isUuid(paid.scanId)) return text("unknown scan");

    const { error } = await db()
      .from("scans")
      .update({ paid: true, paid_at: new Date().toISOString(), payment_id: paid.paymentId })
      .eq("id", paid.scanId)
      .eq("paid", false);
    if (error) throw error;
    console.log(JSON.stringify({ fn: "dodo-webhook", msg: "purchase_completed", scan: paid.scanId }));
    return text("ok");
  } catch (err) {
    console.error(JSON.stringify({ fn: "dodo-webhook", error: String((err as Error)?.message ?? err) }));
    return text("error", 500); // Dodo retries on non-2xx
  }
});
