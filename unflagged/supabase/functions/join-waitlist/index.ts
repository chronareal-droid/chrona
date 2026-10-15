// POST { email, scan_id?, source? }: Pro waitlist sign-up. Re-joining is a no-op success.
// Throttled per hashed IP and a scan_id, when given, must be a real scan (so the table can't be flooded with junk):
// both checked atomically with the insert by the join_waitlist RPC.
import { z } from "zod";
import { db } from "../_shared/db.ts";
import { json, preflight, readBodyLimited, requireEnv, TooLarge } from "../_shared/http.ts";
import { clientIp, hashIp, WAITLIST_PER_IP_PER_DAY } from "../_shared/ip.ts";

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  scan_id: z.string().uuid().optional(),
  source: z.string().trim().max(40).optional(),
});

Deno.serve(async (req) => {
  const early = preflight(req, "POST");
  if (early) return early;
  try {
    let raw: string;
    try {
      raw = await readBodyLimited(req, 4096);
    } catch (err) {
      if (err instanceof TooLarge) return json(req, { error: "too_large" }, 413);
      throw err;
    }
    const parsed = Body.safeParse((() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })());
    if (!parsed.success) return json(req, { error: "invalid" }, 400);
    const { email, scan_id, source } = parsed.data;
    const ip_hash = await hashIp(clientIp(req), requireEnv("IP_SALT"));
    const { error } = await db().rpc("join_waitlist", {
      p_email: email,
      p_plan: "pro",
      p_scan_id: scan_id ?? null,
      p_source: source ?? null,
      p_ip_hash: ip_hash,
      p_limit: WAITLIST_PER_IP_PER_DAY,
    });
    if (error?.message === "rate_limited") return json(req, { error: "rate_limited" }, 429);
    if (error?.message === "invalid_scan") return json(req, { error: "invalid" }, 400);
    if (error && error.code !== "23505") throw error;
    return json(req, { ok: true });
  } catch (err) {
    console.error(JSON.stringify({ fn: "join-waitlist", error: String((err as Error)?.message ?? err) }));
    return json(req, { error: "internal" }, 500);
  }
});
