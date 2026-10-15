// GET ?id= : status for polling, and the report. Unpaid scans get ONLY the free fields (built server-side).
import { db } from "../_shared/db.ts";
import { isUuid, json, preflight } from "../_shared/http.ts";
import { RESCAN_ATTEMPTS, type ScanRow, STALE_PROCESSING_MS, STALE_SECONDS, toPublicView } from "../_shared/report.ts";

Deno.serve(async (req) => {
  const early = preflight(req, "GET");
  if (early) return early;
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!isUuid(id)) return json(req, { error: "not_found" }, 404);
    const supabase = db();
    const { data, error } = await supabase
      .from("scans")
      .select("id, created_at, status, stage, error_code, extracted, report, paid, paid_at, rescan_of")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return json(req, { error: "not_found" }, 404);
    const row = data as ScanRow;

    // A scan still "processing" long after any pipeline could have finished lost its worker (wall clock, CPU or
    // memory limit, redeploy). Fail it so the page offers a retry and it stops counting toward the IP limit.
    if (row.status === "processing" && Date.now() - new Date(row.created_at).getTime() > STALE_PROCESSING_MS) {
      const { error: e } = await supabase
        .from("scans")
        .update({ status: "error", error_code: "timeout", stage: null })
        .eq("id", row.id)
        .eq("status", "processing");
      if (e) throw e;
      Object.assign(row, { status: "error", error_code: "timeout", stage: null });
    }

    let rescanUsed = false;
    if (row.paid && !row.rescan_of) {
      // Same rule create_rescan enforces: a done or running re-scan uses it, as do RESCAN_ATTEMPTS creator-side
      // failures or 3× RESCAN_ATTEMPTS attempts in all.
      const { data: used, error: e2 } = await supabase.rpc("rescan_used", {
        p_parent: row.id,
        p_attempt_limit: RESCAN_ATTEMPTS,
        p_stale_seconds: STALE_SECONDS,
      });
      if (e2) throw e2;
      rescanUsed = used === true;
    }
    return json(req, toPublicView(row, rescanUsed));
  } catch (err) {
    console.error(JSON.stringify({ fn: "get-scan", error: String((err as Error)?.message ?? err) }));
    return json(req, { error: "internal" }, 500);
  }
});
