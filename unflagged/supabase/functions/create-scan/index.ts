// Entry point: wires the handler to Supabase, Gemini and the Edge Runtime. Logic lives in handler.ts.
import { generateJson } from "../_shared/ai.ts";
import { db } from "../_shared/db.ts";
import { supabaseStore } from "../_shared/store.ts";
import { createScanHandler, inFlight } from "./handler.ts";

Deno.serve(
  createScanHandler({
    store: supabaseStore(db()),
    generateJson,
    env: (name) => Deno.env.get(name),
    waitUntil: (p) => (typeof EdgeRuntime !== "undefined" ? EdgeRuntime.waitUntil(p) : void p.catch(() => {})),
  }),
);

// The runtime is shutting this worker down (wall clock, CPU or memory limit, or a redeploy): mark scans that are
// still running as failed so their page shows the retry path instead of waiting. Best effort; get-scan also
// expires stale scans on its own.
addEventListener("beforeunload", () => {
  for (const [id, store] of inFlight) {
    store.update(id, { status: "error", error_code: "timeout", stage: null }).catch(() => {});
  }
});
