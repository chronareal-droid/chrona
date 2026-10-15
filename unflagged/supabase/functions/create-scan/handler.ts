// POST: validate, rate-limit + insert atomically, start the pipeline in the background, return { id }.
// Screenshots and scripts are passed to the pipeline in memory only; they are never inserted or logged.
import type { GenerateJson } from "../_shared/ai.ts";
import { json, preflight, readBodyLimited, TooLarge } from "../_shared/http.ts";
import { clientIp, hashIp } from "../_shared/ip.ts";
import { PIPELINE_BUDGET_MS, runPipeline, type ScanPatch } from "../_shared/pipeline.ts";
import type { ScanStore } from "../_shared/store.ts";
import { CreateScanSchema, MAX_REQUEST_BYTES } from "./validate.ts";

export interface CreateScanDeps {
  store: ScanStore;
  generateJson: GenerateJson;
  env: (name: string) => string | undefined;
  /** Keeps the worker alive for the background pipeline (EdgeRuntime.waitUntil in production). */
  waitUntil: (p: Promise<unknown>) => void;
  now?: () => number;
  log?: (msg: string, data?: Record<string, unknown>) => void;
}

/** Scans whose pipeline is still running in this worker (so a shutdown can mark them failed). */
export const inFlight = new Map<string, ScanStore>();

export function createScanHandler(deps: CreateScanDeps): (req: Request) => Promise<Response> {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((msg, data) => console.log(JSON.stringify({ fn: "create-scan", msg, ...data })));

  return async (req) => {
    const early = preflight(req, "POST");
    if (early) return early;
    const receivedAt = now(); // the pipeline's time budget counts from here, not from after the upload

    try {
      // Configuration first: a missing secret must not leave a half-created scan behind.
      const salt = deps.env("IP_SALT");
      const modelExtract = deps.env("MODEL_EXTRACT");
      const modelJudge = deps.env("MODEL_JUDGE");
      if (!salt || !modelExtract || !modelJudge || !deps.env("GEMINI_API_KEY")) {
        log("missing configuration", { salt: !!salt, modelExtract: !!modelExtract, modelJudge: !!modelJudge });
        return json(req, { error: "internal" }, 500);
      }

      let raw: string;
      try {
        raw = await readBodyLimited(req, MAX_REQUEST_BYTES);
      } catch (err) {
        if (err instanceof TooLarge) return json(req, { error: "too_large" }, 413);
        throw err;
      }
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(req, { error: "invalid", details: ["body must be JSON"] }, 400);
      }
      const parsed = CreateScanSchema.safeParse(body);
      if (!parsed.success) {
        return json(req, { error: "invalid", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);
      }
      const input = parsed.data;
      const ip_hash = await hashIp(clientIp(req), salt);
      const row = { ip_hash, answers: input.answers, email: input.email, niche: input.niche, src: input.src };

      // A re-scan rides on its paid parent (one per report, 30 days) and isn't counted against the IP limit.
      const created = input.rescanOf ? await deps.store.createRescan(input.rescanOf, row) : await deps.store.createScan(row);
      if ("error" in created) {
        const status = created.error === "rate_limited" ? 429 : created.error === "rescan_used" ? 409 : 403;
        return json(req, { error: created.error }, status);
      }

      const id = created.id;
      inFlight.set(id, deps.store);
      const work = runPipeline(
        { images: input.images, scripts: input.scripts, answers: input.answers, niche: input.niche },
        {
          generateJson: deps.generateJson,
          update: (patch: ScanPatch) => deps.store.update(id, patch),
          modelExtract,
          modelJudge,
          now,
          startedAt: receivedAt,
          budgetMs: PIPELINE_BUDGET_MS,
          log: (msg, data) => log(msg, { scan: id, ...data }),
        },
      ).finally(() => inFlight.delete(id));
      deps.waitUntil(work);
      return json(req, { id });
    } catch (err) {
      log("failed", { error: String((err as Error)?.message ?? err) });
      return json(req, { error: "internal" }, 500);
    }
  };
}
