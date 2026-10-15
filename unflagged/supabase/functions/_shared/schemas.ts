// zod schemas (runtime validation) and the matching JSON schemas sent to the model as the response format.
// Keep each pair in sync: the JSON schema shapes what the model writes, zod decides whether we accept it.
import { z } from "zod";

// ---------- Request: quick-question answers (section 2) ----------

export const ANSWER_OPTIONS = {
  monetization: ["not_applied", "applied_waiting", "rejected", "monetized", "demonetized"],
  voice: ["own", "ai", "mix"],
  visuals: ["ai_generated", "stock", "others_clips", "original", "mix"],
  scripts: ["self_written", "ai_heavy_rewrite", "ai_light_edits", "adapted"],
  opinion: ["every_video", "sometimes", "rarely"],
  uploads: ["1-2", "3-6", "7-14", "15+"],
} as const;

export const AnswersSchema = z.object({
  monetization: z.enum(ANSWER_OPTIONS.monetization),
  voice: z.enum(ANSWER_OPTIONS.voice),
  visuals: z.enum(ANSWER_OPTIONS.visuals),
  scripts: z.enum(ANSWER_OPTIONS.scripts),
  opinion: z.enum(ANSWER_OPTIONS.opinion),
  uploads: z.enum(ANSWER_OPTIONS.uploads),
});
export type Answers = z.infer<typeof AnswersSchema>;

/** Plain-English labels, used when describing answers to the judge. */
export const ANSWER_LABELS: Record<keyof Answers, { q: string; a: Record<string, string> }> = {
  monetization: {
    q: "Monetization status",
    a: {
      not_applied: "Not applied yet",
      applied_waiting: "Applied, waiting",
      rejected: "Rejected",
      monetized: "Monetized",
      demonetized: "Demonetized",
    },
  },
  voice: { q: "Voice", a: { own: "My own", ai: "AI voice", mix: "Mix" } },
  visuals: {
    q: "Visuals",
    a: {
      ai_generated: "Mostly AI-generated",
      stock: "Stock footage",
      others_clips: "Clips from other creators/media",
      original: "Original footage/animation",
      mix: "Mix",
    },
  },
  scripts: {
    q: "Scripts",
    a: {
      self_written: "I write them",
      ai_heavy_rewrite: "AI drafts, I rewrite heavily",
      ai_light_edits: "AI drafts, light edits",
      adapted: "Adapted from other sources",
    },
  },
  opinion: {
    q: "Own opinion/analysis in videos",
    a: { every_video: "Every video", sometimes: "Sometimes", rarely: "Rarely" },
  },
  uploads: { q: "Uploads per week", a: { "1-2": "1–2", "3-6": "3–6", "7-14": "7–14", "15+": "15+" } },
};

// ---------- Extraction (section 3.2) ----------

const nullableString = z.string().nullable().optional().transform((v) => (v ?? null));

export const ExtractionSchema = z.object({
  videos: z.array(
    z.object({
      title: nullableString,
      duration_text: nullableString,
      views_text: nullableString,
      age_text: nullableString,
      thumbnail: z
        .object({
          style: nullableString,
          dominant_colors: z.array(z.string()).nullable().optional().transform((v) => v ?? []),
          text_overlay: nullableString,
          figures: nullableString,
          layout: nullableString,
        })
        .nullable()
        .optional()
        .transform((v) => v ?? null),
    }),
  ),
  notes: nullableString,
});
export type Extraction = z.infer<typeof ExtractionSchema>;
export type ExtractedVideo = Extraction["videos"][number];

const nStr = { type: ["string", "null"] };
export const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    videos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: nStr,
          duration_text: nStr,
          views_text: nStr,
          age_text: nStr,
          thumbnail: {
            type: "object",
            properties: {
              style: nStr,
              dominant_colors: { type: "array", items: { type: "string" } },
              text_overlay: nStr,
              figures: nStr,
              layout: nStr,
            },
          },
        },
        required: ["title", "duration_text", "views_text", "age_text", "thumbnail"],
      },
    },
    notes: nStr,
  },
  required: ["videos"],
};

// ---------- Judgment / report (section 3.4) ----------

export const LEVELS = ["low", "elevated", "high"] as const;
export const CATEGORY_KEYS = ["generic_repetitive", "off_putting", "ai_persona_sensitive", "reused"] as const;
export type Level = (typeof LEVELS)[number];
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

const Finding = z.object({
  title: z.string().min(1).max(140),
  evidence: z.string().min(1).max(600),
  why_it_matters: z.string().min(1).max(500),
  fix: z.string().min(1).max(500),
});

export const ReportSchema = z.object({
  overall: z.enum(LEVELS),
  headline: z.string().min(1).max(240),
  categories: z
    .array(
      z.object({
        key: z.enum(CATEGORY_KEYS),
        level: z.enum(LEVELS),
        summary: z.string().min(1).max(360),
        evidence: z.array(z.string().max(500)).max(6),
        fixes: z.array(z.string().max(400)).max(6),
      }),
    )
    .refine((cs) => CATEGORY_KEYS.every((k) => cs.filter((c) => c.key === k).length === 1), {
      message: "categories must contain each of the 4 keys exactly once",
    }),
  top_findings: z.array(Finding).min(1).max(10),
  videos_to_review: z.array(z.object({ title: z.string().min(1).max(200), reason: z.string().min(1).max(400) })).max(12),
  action_plan_7_days: z.array(z.string().max(400)).min(5).max(9),
  before_you_apply_checklist: z.array(z.string().max(300)).min(1).max(12),
  confidence_note: z.string().max(500),
});
export type Report = z.infer<typeof ReportSchema>;
export type Finding = z.infer<typeof Finding>;

const lvl = { type: "string", enum: [...LEVELS] };
export const REPORT_JSON_SCHEMA = {
  type: "object",
  properties: {
    overall: lvl,
    headline: { type: "string", description: "one plain-English sentence" },
    categories: {
      type: "array",
      description: "exactly 4 entries, one per key",
      items: {
        type: "object",
        properties: {
          key: { type: "string", enum: [...CATEGORY_KEYS] },
          level: lvl,
          summary: { type: "string" },
          evidence: {
            type: "array",
            items: { type: "string" },
            description: "concrete, quotes the user's own titles/scripts",
          },
          fixes: { type: "array", items: { type: "string" }, description: "specific actions" },
        },
        required: ["key", "level", "summary", "evidence", "fixes"],
      },
    },
    top_findings: {
      type: "array",
      description: "ordered by severity, most severe first",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          evidence: { type: "string" },
          why_it_matters: { type: "string" },
          fix: { type: "string" },
        },
        required: ["title", "evidence", "why_it_matters", "fix"],
      },
    },
    videos_to_review: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "exact title from inputs" },
          reason: { type: "string" },
        },
        required: ["title", "reason"],
      },
    },
    action_plan_7_days: { type: "array", items: { type: "string" }, description: '"Day 1: ..." through "Day 7: ..."' },
    before_you_apply_checklist: { type: "array", items: { type: "string" } },
    confidence_note: {
      type: "string",
      description: "what we could not see (e.g. descriptions, full videos) and how that limits this read",
    },
  },
  required: [
    "overall",
    "headline",
    "categories",
    "top_findings",
    "videos_to_review",
    "action_plan_7_days",
    "before_you_apply_checklist",
    "confidence_note",
  ],
};
