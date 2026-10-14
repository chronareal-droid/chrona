// POST { email, scan_id?, source? }: Pro waitlist sign-up. Re-joining is a no-op success.
import { z } from "zod";
import { db } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  scan_id: z.string().uuid().optional(),
  source: z.string().trim().max(40).optional(),
});

Deno.serve(async (req) => {
  const early = preflight(req, "POST");
  if (early) return early;
  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json(req, { error: "invalid" }, 400);
    const { email, scan_id, source } = parsed.data;
    const { error } = await db().from("waitlist").insert({ email, plan: "pro", scan_id: scan_id ?? null, source: source ?? null });
    if (error && error.code !== "23505") throw error;
    return json(req, { ok: true });
  } catch (err) {
    console.error(JSON.stringify({ fn: "join-waitlist", error: String((err as Error)?.message ?? err) }));
    return json(req, { error: "internal" }, 500);
  }
});
