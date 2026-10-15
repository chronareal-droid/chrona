// Hallucination and policy guards (spec 3.5 + non-negotiables). Run on every validated report before it's stored.
import type { Report } from "./schemas.ts";
import { titleKey } from "./signals.ts";

/** Lowercase, letters/digits only, single spaces: makes quote matching robust to punctuation and curly quotes. */
export function looseNormalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Quoted spans in a piece of model text: "double", “curly double”, ‘curly single’ and 'straight single' quotes.
 * Apostrophes inside words (don't, they’re, Sam's) are not quote marks, and neither is an elision ('90s, '24, 'til,
 * 'em), which would otherwise pair with a plural possessive (creators') into a bogus quote. A title that starts with a
 * number ('10 Places You Should Never Visit') is still a quote.
 */
const QUOTE_PATTERNS = [
  /["“”]([^"“”]+)["“”]/g,
  /‘(?!\d\ds\b)([^"“”]+?)’(?![\p{L}\p{N}])/gu,
  /(?<![\p{L}\p{N}])'(?!\d\ds\b|\d\d\b(?!\s\p{Lu})|(?:til|em|cause|bout|n)\b)([^"“”]+?)'(?![\p{L}\p{N}])/gu,
];

export function quotesIn(text: string): string[] {
  return QUOTE_PATTERNS.flatMap((re) => [...text.matchAll(re)].map((m) => m[1]));
}

/**
 * Quotes of 3+ words must appear in the inputs, as whole words. Shorter quotes are usually scare quotes
 * ("safe", "Top 10") and can't be checked meaningfully. An ellipsis splits a quote into pieces checked separately.
 */
export function quoteIsGrounded(quote: string, corpus: string): boolean {
  const pieces = quote.split(/\.\.\.|…/).map(looseNormalize).filter(Boolean);
  return pieces.every((p) => p.split(" ").length < 3 || corpus.includes(` ${p} `));
}

export function textIsGrounded(text: string, corpus: string): boolean {
  return quotesIn(text).every((q) => quoteIsGrounded(q, corpus));
}

export interface GuardInputs {
  titles: string[];
  scripts: string[];
  /** The creator's own words besides titles and scripts: thumbnail text overlays, their niche. */
  creatorText?: string[];
  /** Everything else the judge is shown and may quote: video details, signals, answers, niche, the policy brief. */
  otherText?: string[];
}

export interface GuardResult {
  report: Report;
  dropped: { videos: number; evidence: number; findings: number };
  /** Fields that quote text not found in the inputs and can't simply be dropped (headline, summaries, note). */
  ungrounded: string[];
}

export function buildCorpus(inputs: GuardInputs): string {
  return ` ${[...creatorTexts(inputs), ...(inputs.otherText ?? [])].map(looseNormalize).join(" | ")} `;
}

const creatorTexts = (inputs: GuardInputs) => [...inputs.titles, ...inputs.scripts, ...(inputs.creatorText ?? [])];

/**
 * The text with the creator's own quoted words swapped out, so the checks below judge only what the model wrote.
 * A quote counts as the creator's if it is a whole title, or if it appears in their material (titles, scripts,
 * thumbnail text, niche) with at least `minWords` words in one piece (an ellipsis splits a quote into pieces, as in
 * grounding). Short quotes otherwise stay, so a scare-quoted "safe" is still the model's word. Each different quote
 * becomes its own placeholder, so two sentences that differ only in the title they quote still differ.
 */
export function creatorQuoteStripper(inputs?: GuardInputs): (text: string, minWords: number) => string {
  if (!inputs) return (text) => text;
  const corpus = ` ${creatorTexts(inputs).map(looseNormalize).join(" | ")} `; // built once per report
  const titles = new Set(inputs.titles.map(titleKey));
  const tokens = new Map<string, string>();
  const token = (normalized: string) => {
    let t = tokens.get(normalized);
    if (!t) tokens.set(normalized, (t = ` qz${tokens.size}qz `));
    return t;
  };
  const isCreators = (q: string, minWords: number) => {
    if (titles.has(titleKey(q))) return true;
    const pieces = q.split(/\.\.\.|…/).map(looseNormalize).filter(Boolean);
    return pieces.length > 0 && pieces.every((p) => corpus.includes(` ${p} `)) &&
      pieces.some((p) => p.split(" ").length >= minWords);
  };
  return (text, minWords) =>
    QUOTE_PATTERNS.reduce(
      (out, re) => out.replace(re, (span, inner: string) => (isCreators(inner, minWords) ? token(looseNormalize(inner)) : span)),
      text,
    );
}

export function applyGuards(report: Report, inputs: GuardInputs): GuardResult {
  const corpus = buildCorpus(inputs);
  const grounded = (t: string) => textIsGrounded(t, corpus);
  const byKey = new Map(inputs.titles.map((t) => [titleKey(t), t]));
  const dropped = { videos: 0, evidence: 0, findings: 0 };
  const ungrounded: string[] = [];

  const seen = new Set<string>();
  const videos_to_review = report.videos_to_review.flatMap((v) => {
    const key = titleKey(v.title);
    const canonical = byKey.get(key);
    if (!canonical || seen.has(key) || !grounded(v.reason)) {
      dropped.videos++;
      return [];
    }
    seen.add(key);
    return [{ title: canonical, reason: v.reason }];
  });

  const categories = report.categories.map((c) => {
    const evidence = c.evidence.filter(grounded);
    dropped.evidence += c.evidence.length - evidence.length;
    if (!grounded(c.summary)) ungrounded.push(`categories.${c.key}.summary`);
    return { ...c, evidence };
  });

  // Fixes aren't checked: they legitimately quote text that doesn't exist yet ("retitle it to \"...\"").
  const top_findings = report.top_findings.filter((f) => {
    const ok = grounded(f.title) && grounded(f.evidence) && grounded(f.why_it_matters);
    if (!ok) dropped.findings++;
    return ok;
  });

  if (!grounded(report.headline)) ungrounded.push("headline");
  if (!grounded(report.confidence_note)) ungrounded.push("confidence_note");

  return { report: { ...report, categories, top_findings, videos_to_review }, dropped, ungrounded };
}

/** Wording the product must never use (non-negotiable #1), whoever writes it. */
export const FORBIDDEN = /\bguarantee(?:s|d)?\b|\bsafe\b|youtube[\s-]?approved|\bwill\s+(?:get|be)\s+(?:approved|monetized|monetised)\b/i;

/** Every piece of report text a reader sees. */
export function reportTexts(r: Report): string[] {
  return [
    r.headline,
    r.confidence_note,
    ...r.categories.flatMap((c) => [c.summary, ...c.evidence, ...c.fixes]),
    ...r.top_findings.flatMap((f) => [f.title, f.evidence, f.why_it_matters, f.fix]),
    ...r.videos_to_review.map((v) => v.reason),
    ...r.action_plan_7_days,
    ...r.before_you_apply_checklist,
  ];
}

/** How many different "Day N" (1–7) a text mentions: two or more reads like the 7-day plan. */
function planDays(normalized: string): number {
  return new Set([...normalized.matchAll(/\bday\s*([1-7])\b/g)].map((m) => m[1])).size;
}

/**
 * Problems that send the report back for its one retry. Both checks look only at the model's own words: the creator's
 * titles and script lines it quotes as evidence ("Stay safe out there", "Minecraft Day 5") don't count.
 * - forbidden wording anywhere;
 * - paid content (plan, checklist, later findings) copied into the fields the free view shows — whatever the
 *   uploaded scripts asked the model to do, the free view must not carry the paid report.
 */
export function reportIssues(r: Report, inputs?: GuardInputs, freeFindings = 2): string[] {
  const issues: string[] = [];
  const withoutCreatorQuotes = creatorQuoteStripper(inputs);
  const bad = reportTexts(r).find((t) => FORBIDDEN.test(withoutCreatorQuotes(t, 3)));
  if (bad) issues.push(`do not promise outcomes or call anything safe/guaranteed/approved (found: "${bad.slice(0, 80)}")`);

  const own = (t: string) => looseNormalize(withoutCreatorQuotes(t, 2));
  const free = [
    r.headline,
    r.confidence_note,
    ...r.categories.map((c) => c.summary),
    ...r.top_findings.slice(0, freeFindings).flatMap((f) => [f.title, f.evidence, f.why_it_matters, f.fix]),
  ].map(own);
  const paid = [
    ...r.action_plan_7_days,
    ...r.before_you_apply_checklist,
    ...r.top_findings.slice(freeFindings).flatMap((f) => [f.evidence, f.fix]),
  ]
    .map(own)
    .filter((p) => p.length >= 24);
  const leak = free.some((f) => planDays(f) >= 2) || free.some((f) => paid.some((p) => f.includes(p.slice(0, 40))));
  if (leak) issues.push("headline, summaries, confidence_note and the first findings must not repeat the 7-day plan, checklist or later findings");
  return issues;
}
