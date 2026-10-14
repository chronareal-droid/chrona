// The analysis pipeline (section 3). Runs in the background of create-scan under EdgeRuntime.waitUntil.
// Screenshots and scripts arrive as arguments, live only in memory here, and are never written anywhere.
import { type GenerateJson, type GenerateJsonArgs, type Part, PipelineError } from "./ai.ts";
import { applyGuards } from "./guards.ts";
import { EXTRACT_PROMPT, JUDGE_OUTPUT_RULES, JUDGE_SYSTEM_PROMPT } from "./prompts.ts";
import {
  ANSWER_LABELS,
  type Answers,
  EXTRACTION_JSON_SCHEMA,
  type ExtractedVideo,
  ExtractionSchema,
  type Report,
  REPORT_JSON_SCHEMA,
  ReportSchema,
} from "./schemas.ts";
import { computeSignals, describeSignals, normalizeTitle, type Signals } from "./signals.ts";
import type { z } from "zod";

/** Free-plan wall clock is 150 s per invocation; leave headroom for the final DB write. */
export const PIPELINE_BUDGET_MS = 140_000;
/** Extraction must leave the judge at least this long. */
const JUDGE_RESERVE_MS = 45_000;
export const MAX_SCRIPT_WORDS_TOTAL = 6_000;

export interface PipelineInput {
  images: string[]; // base64 JPEG, no data: prefix
  scripts: string[];
  answers: Answers;
  niche: string | null;
}

export type ScanPatch = Partial<{
  status: "processing" | "done" | "error";
  stage: string | null;
  error_code: string | null;
  extracted: unknown;
  signals: Signals;
  report: Report;
}>;

export interface PipelineDeps {
  generateJson: GenerateJson;
  update: (patch: ScanPatch) => Promise<void>;
  modelExtract: string;
  modelJudge: string;
  now?: () => number;
  log?: (msg: string, data?: Record<string, unknown>) => void;
  budgetMs?: number;
}

class ValidationIssue extends Error {}

function zodMessage(err: z.ZodError): string {
  return err.issues
    .slice(0, 8)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

/** One AI call, validated; on a validation failure, one retry with the error appended to the prompt. */
async function callValidated<T>(
  gen: GenerateJson,
  args: GenerateJsonArgs,
  accept: (raw: unknown) => T,
): Promise<T> {
  let lastIssue = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const parts: Part[] = attempt === 0 ? args.parts : [
      ...args.parts,
      { text: `Your previous output was rejected: ${lastIssue}. Return corrected output that follows every rule.` },
    ];
    const raw = await gen({ ...args, parts });
    try {
      return accept(raw);
    } catch (err) {
      if (!(err instanceof ValidationIssue)) throw err;
      lastIssue = err.message;
    }
  }
  throw new PipelineError("bad_output", `output failed validation twice: ${lastIssue}`);
}

/** Keeps titled videos only (an untitled video can't be referenced) and dedupes across screenshots. */
export function dedupeVideos(videos: ExtractedVideo[]): (ExtractedVideo & { title: string })[] {
  const seen = new Set<string>();
  const out: (ExtractedVideo & { title: string })[] = [];
  for (const v of videos) {
    const title = v.title?.trim();
    if (!title) continue;
    const key = normalizeTitle(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...v, title });
  }
  return out;
}

/** Caps scripts at ~6,000 words total, split evenly, so the judge prompt stays small for a Flash-Lite model. */
export function truncateScripts(scripts: string[], maxTotal = MAX_SCRIPT_WORDS_TOTAL): string[] {
  const filled = scripts.map((s) => s.trim()).filter(Boolean);
  if (!filled.length) return [];
  const cap = Math.floor(maxTotal / filled.length);
  return filled.map((s) => {
    const ws = s.split(/\s+/);
    return ws.length <= cap ? s : `${ws.slice(0, cap).join(" ")} [...truncated]`;
  });
}

function describeVideo(v: ExtractedVideo & { title: string }, i: number): string {
  const t = v.thumbnail;
  const thumb = t
    ? [t.style, t.dominant_colors?.length ? `colors: ${t.dominant_colors.join(", ")}` : null,
      t.text_overlay ? `text: "${t.text_overlay}"` : null, t.figures, t.layout].filter(Boolean).join("; ")
    : "unreadable";
  return `${i + 1}. "${v.title}" | ${v.duration_text ?? "?"} | ${v.views_text ?? "?"} | ${v.age_text ?? "?"} | thumbnail: ${thumb}`;
}

export function buildJudgeInput(
  videos: (ExtractedVideo & { title: string })[],
  signals: Signals,
  scripts: string[],
  answers: Answers,
  niche: string | null,
  notes: string | null,
): string {
  const answerLines = (Object.keys(ANSWER_LABELS) as (keyof Answers)[])
    .map((k) => `- ${ANSWER_LABELS[k].q}: ${ANSWER_LABELS[k].a[answers[k]]}`);
  const sc = truncateScripts(scripts);
  return [
    `NICHE: ${niche?.trim() || "not given"}`,
    "",
    "CREATOR'S ANSWERS",
    ...answerLines,
    "",
    "COMPUTED SIGNALS (deterministic; flags are risk levels)",
    ...describeSignals(signals).map((l) => `- ${l}`),
    "",
    `VIDEOS (${videos.length} read from the creator's Videos tab screenshots; title | duration | views | age | thumbnail)`,
    ...videos.map(describeVideo),
    notes ? `Extraction notes: ${notes}` : "",
    "",
    sc.length ? `SCRIPTS (${sc.length})` : "SCRIPTS: none provided",
    ...sc.map((s, i) => `--- Script ${i + 1} ---\n${s}`),
    "",
    "WHAT WE CANNOT SEE: video descriptions, the full videos, audio, comments, analytics, and anything outside these screenshots.",
    "",
    JUDGE_OUTPUT_RULES,
  ].join("\n");
}

export async function runPipeline(input: PipelineInput, deps: PipelineDeps): Promise<void> {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((msg, data) => console.log(JSON.stringify({ msg, ...data })));
  const start = now();
  const deadline = start + (deps.budgetMs ?? PIPELINE_BUDGET_MS);
  const timings: Record<string, number> = {};
  const timed = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const t0 = now();
    try {
      return await fn();
    } finally {
      timings[name] = now() - t0;
    }
  };

  try {
    // 1) Extraction: one call with every screenshot.
    await deps.update({ stage: "extract" });
    const extraction = await timed("extract", () =>
      callValidated(
        deps.generateJson,
        {
          model: deps.modelExtract,
          system: EXTRACT_PROMPT,
          parts: [
            { text: `${input.images.length} screenshot(s) of one channel's Videos tab follow, in scroll order.` },
            ...input.images.map((data): Part => ({ inlineData: { mimeType: "image/jpeg", data } })),
          ],
          schema: EXTRACTION_JSON_SCHEMA,
          deadline: deadline - JUDGE_RESERVE_MS,
        },
        (raw) => {
          const r = ExtractionSchema.safeParse(raw);
          if (!r.success) throw new ValidationIssue(zodMessage(r.error));
          return r.data;
        },
      ));
    const videos = dedupeVideos(extraction.videos);
    await deps.update({ extracted: { videos, notes: extraction.notes } });
    if (!videos.length) throw new PipelineError("no_videos", "no readable videos in the screenshots");

    // 2) Deterministic signals.
    await deps.update({ stage: "signals" });
    const signals = await timed("signals", () => Promise.resolve(computeSignals(videos, input.scripts)));
    await deps.update({ signals });

    // 3) Judgment, validated and guarded.
    await deps.update({ stage: "judge" });
    const guardInputs = {
      titles: videos.map((v) => v.title),
      scripts: input.scripts,
      otherText: videos.map((v) => v.thumbnail?.text_overlay ?? "").filter(Boolean),
    };
    const report = await timed("judge", () =>
      callValidated(
        deps.generateJson,
        {
          model: deps.modelJudge,
          system: JUDGE_SYSTEM_PROMPT,
          parts: [{
            text: buildJudgeInput(videos, signals, input.scripts, input.answers, input.niche, extraction.notes),
          }],
          schema: REPORT_JSON_SCHEMA,
          deadline,
        },
        (raw) => {
          const r = ReportSchema.safeParse(raw);
          if (!r.success) throw new ValidationIssue(zodMessage(r.error));
          const { report, dropped } = applyGuards(r.data, guardInputs);
          if (dropped.videos || dropped.evidence || dropped.findings) log("guards dropped items", dropped);
          if (!report.top_findings.length) {
            throw new ValidationIssue(
              "every top_findings evidence quoted text that is not in the inputs; quote titles and script lines exactly",
            );
          }
          return report;
        },
      ));

    await deps.update({ status: "done", stage: null, report });
    log("pipeline done", { ms: now() - start, timings });
  } catch (err) {
    const code = err instanceof PipelineError ? err.code : "internal";
    log("pipeline failed", { code, error: String((err as Error)?.message ?? err), ms: now() - start, timings });
    await deps.update({ status: "error", error_code: code }).catch((e) => log("failed to record error", { e: String(e) }));
  }
}
