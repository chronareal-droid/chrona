// POST: validate, rate-limit, insert the scan row, start the pipeline in the background, return { id }.
// Screenshots and scripts are passed to the pipeline in memory only; they are never inserted or logged.
import { generateJson } from "../_shared/ai.ts";
import { db } from "../_shared/db.ts";
import { json, preflight, requireEnv } from "../_shared/http.ts";
import { clientIp, hashIp, SCANS_PER_IP_PER_DAY } from "../_shared/ip.ts";
import { runPipeline, type ScanPatch } from "../_shared/pipeline.ts";
import { RESCAN_WINDOW_DAYS } from "../_shared/report.ts";
import { CreateScanSchema, MAX_REQUEST_BYTES } from "./validate.ts";

Deno.serve(async (req) => {
  const early = preflight(req, "POST");
  if (early) return early;

  try {
    if (Number(req.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES) {
      return json(req, { error: "too_large" }, 413);
    }
    const raw = await req.text();
    if (raw.length > MAX_REQUEST_BYTES) return json(req, { error: "too_large" }, 413);

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return json(req, { error: "invalid", details: "body must be JSON" }, 400);
    }
    const parsed = CreateScanSchema.safeParse(body);
    if (!parsed.success) {
      return json(req, { error: "invalid", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);
    }
    const input = parsed.data;
    const ip_hash = await hashIp(clientIp(req), requireEnv("IP_SALT"));
    const supabase = db();

    // A re-scan rides on its paid parent (one per report, 30 days). It isn't counted against the daily IP limit.
    let rescan: { paid: true; paid_at: string; payment_id: string | null; rescan_of: string } | null = null;
    if (input.rescanOf) {
      const { data: parent, error } = await supabase
        .from("scans").select("id, paid, paid_at, payment_id, rescan_of").eq("id", input.rescanOf).maybeSingle();
      if (error) throw error;
      const until = parent?.paid_at ? new Date(parent.paid_at).getTime() + RESCAN_WINDOW_DAYS * 86_400_000 : 0;
      if (!parent?.paid || parent.rescan_of || until < Date.now()) {
        return json(req, { error: "rescan_unavailable" }, 403);
      }
      rescan = { paid: true, paid_at: new Date().toISOString(), payment_id: parent.payment_id, rescan_of: parent.id };
    } else {
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const { count, error } = await supabase
        .from("scans").select("id", { count: "exact", head: true })
        .eq("ip_hash", ip_hash).gte("created_at", since).neq("status", "error");
      if (error) throw error;
      if ((count ?? 0) >= SCANS_PER_IP_PER_DAY) return json(req, { error: "rate_limited" }, 429);
    }

    const { data: row, error: insertError } = await supabase
      .from("scans")
      .insert({ email: input.email, niche: input.niche, answers: input.answers, src: input.src, ip_hash, ...rescan })
      .select("id")
      .single();
    if (insertError) {
      if (insertError.code === "23505") return json(req, { error: "rescan_used" }, 409);
      throw insertError;
    }

    const id: string = row.id;
    const update = async (patch: ScanPatch) => {
      const { error } = await supabase.from("scans").update(patch).eq("id", id);
      if (error) throw error;
    };
    const work = runPipeline(
      { images: input.images, scripts: input.scripts, answers: input.answers, niche: input.niche },
      {
        generateJson,
        update,
        modelExtract: requireEnv("MODEL_EXTRACT"),
        modelJudge: requireEnv("MODEL_JUDGE"),
        log: (msg, data) => console.log(JSON.stringify({ fn: "create-scan", scan: id, msg, ...data })),
      },
    );
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(work);
    else work.catch(() => {}); // local `deno run` without the edge runtime

    return json(req, { id });
  } catch (err) {
    console.error(JSON.stringify({ fn: "create-scan", error: String((err as Error)?.message ?? err) }));
    return json(req, { error: "internal" }, 500);
  }
});
