import { assert, assertEquals } from "@std/assert";
import { type GenerateJsonArgs, PipelineError } from "./ai.ts";
import { dedupeVideos, runPipeline, type ScanPatch, truncateScripts } from "./pipeline.ts";
import { sampleReport, SCRIPT, TITLES } from "./fixtures.ts";
import type { Answers, ExtractedVideo } from "./schemas.ts";

const answers: Answers = {
  monetization: "rejected",
  voice: "ai",
  visuals: "stock",
  scripts: "ai_light_edits",
  opinion: "rarely",
  uploads: "7-14",
};

const extraction: { videos: ExtractedVideo[]; notes: null } = {
  videos: TITLES.map((title, i): ExtractedVideo => ({
    title,
    duration_text: `10:0${i}`,
    views_text: "1K views",
    age_text: `${i + 1} days ago`,
    thumbnail: { style: "photo", dominant_colors: ["red"], text_overlay: "SCARY", figures: null, layout: "centered" },
  })).concat([{ title: "TOP 10 scariest places in Japan!", duration_text: null, views_text: null, age_text: null, thumbnail: null }]),
  notes: null,
};

function harness(responses: ((a: GenerateJsonArgs) => unknown)[]) {
  const patches: ScanPatch[] = [];
  const calls: GenerateJsonArgs[] = [];
  const deps = {
    generateJson: async (a: GenerateJsonArgs) => {
      calls.push(a);
      const next = responses.shift();
      if (!next) throw new Error("unexpected call");
      return next(a);
    },
    update: async (p: ScanPatch) => void patches.push(p),
    modelExtract: "extract-model",
    modelJudge: "judge-model",
    log: () => {},
  };
  const merged = () => Object.assign({}, ...patches) as ScanPatch;
  return { deps, patches, calls, merged };
}

const input = { images: ["/9j/AAAA", "/9j/BBBB"], scripts: [SCRIPT], answers, niche: "horror lists" };

Deno.test("pipeline: extract → signals → judge → guarded report, nothing sensitive stored", async () => {
  const h = harness([() => extraction, () => sampleReport()]);
  await runPipeline(input, h.deps);
  const m = h.merged();
  assertEquals(m.status, "done");
  assertEquals(h.patches.map((p) => p.stage).filter((s) => s !== undefined), ["extract", "signals", "judge", null]);
  // Two different models; images only go to the extraction call.
  assertEquals(h.calls.map((c) => c.model), ["extract-model", "judge-model"]);
  assertEquals(h.calls[0].parts.filter((p) => "inlineData" in p).length, 2);
  assert(h.calls[1].parts.every((p) => "text" in p));
  // Dedupe collapsed the repeated title across screenshots.
  assertEquals((m.extracted as { videos: unknown[] }).videos.length, 5);
  // Guards ran.
  assertEquals(m.report!.videos_to_review.length, 1);
  // Nothing persisted contains screenshots or script text.
  const stored = JSON.stringify(h.patches);
  assert(!stored.includes("/9j/") && !stored.includes("tunnel that locals refuse"));
});

Deno.test("pipeline: invalid judge output is retried once with the validation error", async () => {
  const h = harness([() => extraction, () => ({ overall: "maybe" }), () => sampleReport()]);
  await runPipeline(input, h.deps);
  assertEquals(h.merged().status, "done");
  const retry = h.calls[2].parts.at(-1) as { text: string };
  assert(retry.text.startsWith("Your previous output was rejected"));
});

Deno.test("pipeline: two invalid outputs → error bad_output", async () => {
  const h = harness([() => extraction, () => ({}), () => ({})]);
  await runPipeline(input, h.deps);
  assertEquals([h.merged().status, h.merged().error_code], ["error", "bad_output"]);
});

Deno.test("pipeline: capacity errors surface as error_code=capacity", async () => {
  const h = harness([() => {
    throw new PipelineError("capacity", "429");
  }]);
  await runPipeline(input, h.deps);
  assertEquals([h.merged().status, h.merged().error_code], ["error", "capacity"]);
});

Deno.test("pipeline: unreadable screenshots → no_videos", async () => {
  const h = harness([() => ({ videos: [{ title: null, duration_text: null, views_text: null, age_text: null, thumbnail: null }] })]);
  await runPipeline(input, h.deps);
  assertEquals(h.merged().error_code, "no_videos");
});

Deno.test("pipeline: judge that only quotes invented text is rejected", async () => {
  const bad = () => sampleReport({ top_findings: [{ title: "x", evidence: '"we filmed this in Osaka ourselves"', why_it_matters: "w", fix: "f" }] });
  const h = harness([() => extraction, bad, bad]);
  await runPipeline(input, h.deps);
  assertEquals(h.merged().error_code, "bad_output");
});

Deno.test("dedupeVideos / truncateScripts", () => {
  assertEquals(dedupeVideos(extraction.videos).length, 5);
  const long = Array(5000).fill("word").join(" ");
  const t = truncateScripts([long, long, ""]);
  assertEquals(t.length, 2);
  assertEquals(t[0].split(" ").length, 3000 + 1); // + "[...truncated]"
});
