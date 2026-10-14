// Deterministic signals (section 3.3). Pure TypeScript, no AI, no I/O.
// The judge gets these as plain-English lines; the stored `signals` object holds numbers and flags only
// (never script text, so nothing a creator pasted is persisted through here).
//
// Flags describe RISK: "high" means the pattern matches what the policy describes, not "high quality".
// Thresholds are first guesses to tune during QA (section 10); each is documented where it's used.
import { GENERIC_AI_PHRASES, OPINION_MARKERS } from "./phrases.ts";

export type Flag = "low" | "medium" | "high";

export interface VideoInput {
  title: string | null;
  duration_text: string | null;
  age_text: string | null;
}

// ---------- shared helpers ----------

/** lowercase, digits → "#", punctuation stripped, whitespace collapsed. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\d+/g, "#")
    .replace(/[^\p{L}\p{N}#\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(s: string): string[] {
  return s.split(" ").filter(Boolean);
}

function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function bigrams(ws: string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < ws.length - 1; i++) out.add(`${ws[i]} ${ws[i + 1]}`);
  return out;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Below this many readable videos, title/duration/cadence flags say "low" and `insufficient` is set. */
export const MIN_VIDEOS = 4;

// ---------- titles ----------

export interface TitleSignals {
  count: number;
  insufficient: boolean;
  top_prefix: string | null; // most common first-3-word pattern (normalized)
  top_prefix_count: number;
  top_suffix: string | null; // most common last-3-word pattern
  top_suffix_count: number;
  top_pattern_share: number; // share of titles matching the more common of the two (0–1)
  mean_bigram_jaccard: number; // mean pairwise word-bigram Jaccard (0–1)
  flag: Flag;
}

function mostCommon(xs: string[]): [string | null, number] {
  const counts = new Map<string, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  let best: string | null = null;
  let n = 0;
  for (const [k, v] of counts) if (v > n) [best, n] = [k, v];
  return [best, n];
}

export function titleSignals(titles: string[]): TitleSignals {
  const norm = titles.map(normalizeTitle).filter(Boolean);
  const ws = norm.map(words);
  const long = ws.filter((w) => w.length >= 3);
  const [top_prefix, top_prefix_count] = mostCommon(long.map((w) => w.slice(0, 3).join(" ")));
  const [top_suffix, top_suffix_count] = mostCommon(long.map((w) => w.slice(-3).join(" ")));

  // A "pattern" needs at least 2 titles sharing it; a one-off isn't a template.
  const best = Math.max(top_prefix_count, top_suffix_count);
  const top_pattern_share = norm.length && best >= 2 ? best / norm.length : 0;

  let sum = 0;
  let pairs = 0;
  const grams = ws.map(bigrams);
  for (let i = 0; i < grams.length; i++) {
    for (let j = i + 1; j < grams.length; j++) {
      sum += jaccard(grams[i], grams[j]);
      pairs++;
    }
  }
  const mean_bigram_jaccard = pairs ? sum / pairs : 0;

  const insufficient = norm.length < MIN_VIDEOS;
  // Thresholds: half the titles on one 3-word frame, or titles sharing a third of their bigrams on average,
  // reads as a fill-in-the-blank template. A recurring series tag on ~30% of titles is "medium".
  let flag: Flag = "low";
  if (!insufficient) {
    if (top_pattern_share >= 0.5 || mean_bigram_jaccard >= 0.35) flag = "high";
    else if (top_pattern_share >= 0.3 || mean_bigram_jaccard >= 0.2) flag = "medium";
  }

  return {
    count: norm.length,
    insufficient,
    top_prefix: top_prefix_count >= 2 ? top_prefix : null,
    top_prefix_count: top_prefix_count >= 2 ? top_prefix_count : 0,
    top_suffix: top_suffix_count >= 2 ? top_suffix : null,
    top_suffix_count: top_suffix_count >= 2 ? top_suffix_count : 0,
    top_pattern_share: round(top_pattern_share),
    mean_bigram_jaccard: round(mean_bigram_jaccard),
    flag,
  };
}

// ---------- durations ----------

/** "12:41" → 761, "1:02:03" → 3723. Returns null for anything else (e.g. "LIVE", "SHORTS"). */
export function parseDuration(text: string | null): number | null {
  if (!text) return null;
  const m = text.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const [, h, mm, ss] = m;
  if (Number(ss) >= 60 || (h !== undefined && Number(mm) >= 60)) return null;
  return Number(h ?? 0) * 3600 + Number(mm) * 60 + Number(ss);
}

export interface DurationSignals {
  count: number;
  insufficient: boolean;
  median_seconds: number | null;
  coefficient_of_variation: number | null;
  share_within_10pct_of_median: number | null;
  flag: Flag;
}

export function durationSignals(texts: (string | null)[]): DurationSignals {
  const secs = texts.map(parseDuration).filter((s): s is number => s !== null && s > 0);
  const insufficient = secs.length < MIN_VIDEOS;
  if (!secs.length) {
    return {
      count: 0,
      insufficient: true,
      median_seconds: null,
      coefficient_of_variation: null,
      share_within_10pct_of_median: null,
      flag: "low",
    };
  }
  const mean = secs.reduce((a, b) => a + b, 0) / secs.length;
  const sd = Math.sqrt(secs.reduce((a, b) => a + (b - mean) ** 2, 0) / secs.length);
  const cv = sd / mean;
  const med = median(secs);
  const within = secs.filter((s) => Math.abs(s - med) <= med * 0.1).length / secs.length;

  // Thresholds: hand-made videos rarely land within ±10% of each other. CV under 0.1 (or 70% of videos within ±10%
  // of the median) suggests a fixed template length; CV under 0.2 (or half within ±10%) is worth a mention.
  let flag: Flag = "low";
  if (!insufficient) {
    if (cv < 0.1 || within >= 0.7) flag = "high";
    else if (cv < 0.2 || within >= 0.5) flag = "medium";
  }
  return {
    count: secs.length,
    insufficient,
    median_seconds: med,
    coefficient_of_variation: round(cv),
    share_within_10pct_of_median: round(within),
    flag,
  };
}

// ---------- cadence ----------

export interface ParsedAge {
  days: number;
  /** Day-level precision (seconds/minutes/hours/days). Weeks and longer are too coarse to detect bursts. */
  precise: boolean;
}

const UNIT_DAYS: Record<string, number> = {
  second: 1 / 86400,
  minute: 1 / 1440,
  hour: 1 / 24,
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

/** "3 days ago", "Streamed 2 weeks ago", "1 hour ago", "an hour ago" → approximate days ago. */
export function parseAge(text: string | null): ParsedAge | null {
  if (!text) return null;
  const m = text.toLowerCase().match(/(\d+|an?|one)\s+(second|minute|hour|day|week|month|year)s?\s+ago/);
  if (!m) return null;
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : 1;
  const unit = m[2];
  return { days: n * UNIT_DAYS[unit], precise: UNIT_DAYS[unit] <= 1 };
}

export interface CadenceSignals {
  count: number;
  insufficient: boolean;
  oldest_days_ago: number | null;
  est_uploads_per_week: number | null;
  burst_days: number; // calendar days (within day-precise ages) with ≥ 3 uploads
  flag: Flag;
}

export function cadenceSignals(ageTexts: (string | null)[]): CadenceSignals {
  const ages = ageTexts.map(parseAge).filter((a): a is ParsedAge => a !== null);
  const insufficient = ages.length < MIN_VIDEOS;
  if (!ages.length) {
    return { count: 0, insufficient: true, oldest_days_ago: null, est_uploads_per_week: null, burst_days: 0, flag: "low" };
  }
  const oldest = Math.max(...ages.map((a) => a.days));
  // The Videos tab shows the newest uploads first, so the visible count over the visible window approximates the rate.
  // Floor the window at one day so a handful of same-day uploads doesn't divide by ~0.
  const perWeek = (ages.length / Math.max(oldest, 1)) * 7;

  const perDay = new Map<number, number>();
  for (const a of ages) {
    if (!a.precise) continue;
    const d = Math.floor(a.days);
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }
  const burst_days = [...perDay.values()].filter((n) => n >= 3).length;

  // Thresholds: 15+/week (2+ a day) is mass-production territory; 7+/week or any 3-in-a-day burst is "medium".
  let flag: Flag = "low";
  if (!insufficient) {
    if (perWeek >= 15 || burst_days >= 2) flag = "high";
    else if (perWeek >= 7 || burst_days >= 1) flag = "medium";
  }
  return {
    count: ages.length,
    insufficient,
    oldest_days_ago: round(oldest, 1),
    est_uploads_per_week: round(perWeek, 1),
    burst_days,
    flag,
  };
}

// ---------- scripts ----------

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Counts whole-phrase occurrences (word boundaries; apostrophes normalized). */
export function countPhrases(text: string, phrases: readonly string[]): number {
  const t = text.toLowerCase().replace(/[’‘]/g, "'");
  let n = 0;
  for (const p of phrases) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(p)}(?![\\p{L}\\p{N}])`, "gu");
    n += t.match(re)?.length ?? 0;
  }
  return n;
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Sentences of 5+ words, normalized for comparison. Short sentences ("Let's go.") repeat naturally. */
export function sentences(text: string): string[] {
  return text
    .replace(/[’‘]/g, "'")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.toLowerCase().replace(/[^\p{L}\p{N}'\s]/gu, " ").replace(/\s+/g, " ").trim())
    .filter((s) => words(s).length >= 5);
}

export interface ScriptSignal {
  words: number;
  opinion_per_1k: number;
  ai_phrase_hits: number;
  ai_phrases_per_1k: number;
}

export interface ScriptSignals {
  count: number;
  per_script: ScriptSignal[];
  total_words: number;
  opinion_per_1k: number;
  ai_phrases_per_1k: number;
  /** Share of sentences that have an identical or near-identical sentence in another script (0–1). */
  cross_script_overlap: number | null;
  same_intro: boolean; // first sentences near-identical across 2+ scripts
  same_outro: boolean; // last sentences near-identical across 2+ scripts
  opinion_flag: Flag;
  ai_phrase_flag: Flag;
  overlap_flag: Flag;
}

/** Near-identical: word-set Jaccard ≥ 0.8 (catches swapped nouns in an otherwise fixed sentence). */
const NEAR_IDENTICAL = 0.8;

function similar(a: string, b: string): boolean {
  return a === b || jaccard(new Set(words(a)), new Set(words(b))) >= NEAR_IDENTICAL;
}

export function scriptSignals(scripts: string[]): ScriptSignals {
  const filled = scripts.filter((s) => s.trim());
  const per_script = filled.map((s): ScriptSignal => {
    const w = wordCount(s);
    const hits = countPhrases(s, GENERIC_AI_PHRASES);
    return {
      words: w,
      opinion_per_1k: round((countPhrases(s, OPINION_MARKERS) / Math.max(w, 1)) * 1000, 1),
      ai_phrase_hits: hits,
      ai_phrases_per_1k: round((hits / Math.max(w, 1)) * 1000, 1),
    };
  });
  const total = per_script.reduce((a, s) => a + s.words, 0);
  const opinion = filled.reduce((a, s) => a + countPhrases(s, OPINION_MARKERS), 0);
  const ai = per_script.reduce((a, s) => a + s.ai_phrase_hits, 0);
  const opinion_per_1k = total ? (opinion / total) * 1000 : 0;
  const ai_per_1k = total ? (ai / total) * 1000 : 0;

  let cross: number | null = null;
  let same_intro = false;
  let same_outro = false;
  if (filled.length >= 2) {
    const sents = filled.map(sentences);
    let matched = 0;
    let all = 0;
    for (let i = 0; i < sents.length; i++) {
      for (const s of sents[i]) {
        all++;
        if (sents.some((other, j) => j !== i && other.some((o) => similar(s, o)))) matched++;
      }
    }
    cross = all ? matched / all : 0;
    const firsts = sents.filter((s) => s.length).map((s) => s[0]);
    const lasts = sents.filter((s) => s.length).map((s) => s[s.length - 1]);
    const anyPair = (xs: string[]) => xs.some((a, i) => xs.some((b, j) => j > i && similar(a, b)));
    same_intro = anyPair(firsts);
    same_outro = anyPair(lasts);
  }

  // Thresholds (per 1,000 words; a 10-minute narration is ~1,500 words):
  // - opinion: 3+ markers/1k means the creator's voice shows up regularly (low risk); under 1/1k is generic narration.
  // - AI stock phrases: 3+/1k is heavy; 1+/1k is noticeable.
  // - overlap: 20%+ of sentences reused across scripts, or a shared intro AND outro, is a template.
  const none = filled.length === 0;
  const opinion_flag: Flag = none ? "low" : opinion_per_1k >= 3 ? "low" : opinion_per_1k >= 1 ? "medium" : "high";
  const ai_phrase_flag: Flag = none ? "low" : ai_per_1k >= 3 ? "high" : ai_per_1k >= 1 ? "medium" : "low";
  let overlap_flag: Flag = "low";
  if (cross !== null) {
    if (cross >= 0.2 || (same_intro && same_outro)) overlap_flag = "high";
    else if (cross >= 0.08 || same_intro || same_outro) overlap_flag = "medium";
  }

  return {
    count: filled.length,
    per_script,
    total_words: total,
    opinion_per_1k: round(opinion_per_1k, 1),
    ai_phrases_per_1k: round(ai_per_1k, 1),
    cross_script_overlap: cross === null ? null : round(cross),
    same_intro,
    same_outro,
    opinion_flag,
    ai_phrase_flag,
    overlap_flag,
  };
}

// ---------- all together ----------

export interface Signals {
  titles: TitleSignals;
  durations: DurationSignals;
  cadence: CadenceSignals;
  scripts: ScriptSignals;
}

export function computeSignals(videos: VideoInput[], scripts: string[]): Signals {
  return {
    titles: titleSignals(videos.map((v) => v.title).filter((t): t is string => !!t)),
    durations: durationSignals(videos.map((v) => v.duration_text)),
    cadence: cadenceSignals(videos.map((v) => v.age_text)),
    scripts: scriptSignals(scripts),
  };
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Short plain-English lines for the judge prompt. A small model leans on these, so keep them unambiguous. */
export function describeSignals(s: Signals): string[] {
  const out: string[] = [];
  const t = s.titles;
  if (t.insufficient) out.push(`Titles: only ${t.count} readable, too few to judge templating [insufficient]`);
  else {
    const pattern = t.top_prefix_count >= t.top_suffix_count
      ? t.top_prefix && `starts with "${t.top_prefix}"`
      : t.top_suffix && `ends with "${t.top_suffix}"`;
    out.push(
      `Title templating [${t.flag} risk]: ${pct(t.top_pattern_share)} of ${t.count} titles share one 3-word frame` +
        (pattern ? ` (${pattern}; # = a number)` : "") +
        `; average word-pair overlap between titles ${pct(t.mean_bigram_jaccard)}`,
    );
  }
  const d = s.durations;
  if (d.insufficient) out.push(`Durations: only ${d.count} readable, too few to judge [insufficient]`);
  else {
    out.push(
      `Duration uniformity [${d.flag} risk]: median ${mmss(d.median_seconds!)}, ` +
        `${pct(d.share_within_10pct_of_median!)} of videos within ±10% of it, variation coefficient ${d.coefficient_of_variation}`,
    );
  }
  const c = s.cadence;
  if (c.insufficient) out.push(`Upload rhythm: only ${c.count} readable upload ages, too few to judge [insufficient]`);
  else {
    out.push(
      `Upload rhythm [${c.flag} risk]: about ${c.est_uploads_per_week} uploads/week over the visible ${c.oldest_days_ago} days` +
        (c.burst_days ? `; ${c.burst_days} day(s) with 3+ uploads` : ""),
    );
  }
  const sc = s.scripts;
  if (!sc.count) out.push("Scripts: none provided, so originality can't be checked from narration [insufficient]");
  else {
    out.push(
      `Creator's own opinion/analysis markers [${sc.opinion_flag} risk]: ${sc.opinion_per_1k} per 1,000 words across ${sc.count} script(s), ${sc.total_words} words`,
    );
    out.push(`Generic AI stock phrases [${sc.ai_phrase_flag} risk]: ${sc.ai_phrases_per_1k} per 1,000 words`);
    if (sc.cross_script_overlap !== null) {
      out.push(
        `Reused sentences across scripts [${sc.overlap_flag} risk]: ${pct(sc.cross_script_overlap)} of sentences repeat in another script` +
          (sc.same_intro ? "; intros near-identical" : "") +
          (sc.same_outro ? "; outros near-identical" : ""),
      );
    }
  }
  return out;
}
