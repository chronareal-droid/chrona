// POST { id }: creates a Dodo hosted checkout for the Full Report and returns its URL.
import { db } from "../_shared/db.ts";
import { createCheckoutSession } from "../_shared/dodo.ts";
import { isUuid, json, preflight, requireEnv, siteUrl } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const early = preflight(req, "POST");
  if (early) return early;
  try {
    const { id } = await req.json().catch(() => ({}));
    if (!isUuid(id)) return json(req, { error: "invalid" }, 400);

    const { data: scan, error } = await db().from("scans").select("id, status, paid").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!scan) return json(req, { error: "not_found" }, 404);
    if (scan.paid) return json(req, { error: "already_paid" }, 409);
    if (scan.status !== "done") return json(req, { error: "not_ready" }, 409);

    const session = await createCheckoutSession({
      apiKey: requireEnv("DODO_API_KEY"),
      productId: requireEnv("DODO_PRODUCT_ID"),
      scanId: id,
      returnUrl: `${siteUrl()}/r/${id}?paid=1`,
    });
    return json(req, { url: session.checkout_url });
  } catch (err) {
    console.error(JSON.stringify({ fn: "create-checkout", error: String((err as Error)?.message ?? err) }));
    return json(req, { error: "internal" }, 500);
  }
});
