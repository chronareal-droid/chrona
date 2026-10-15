// GET ?id= : status for polling, and the report. Unpaid scans get ONLY the free fields (built server-side).
import { db } from "../_shared/db.ts";
import { isUuid, json, preflight } from "../_shared/http.ts";
import { type ScanRow, STALE_PROCESSING_MS, toPublicView } from "../_shared/report.ts";

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
      // A re-scan that failed doesn't use up the included one.
      const { count, error: e2 } = await supabase
        .from("scans").select("id", { count: "exact", head: true }).eq("rescan_of", row.id).neq("status", "error");
      if (e2) throw e2;
      rescanUsed = (count ?? 0) > 0;
    }
    return json(req, toPublicView(row, rescanUsed));
  } catch (err) {
    console.error(JSON.stringify({ fn: "get-scan", error: String((err as Error)?.message ?? err) }));
    return json(req, { error: "internal" }, 500);
  }
});
