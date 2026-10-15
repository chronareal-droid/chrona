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
 * Apostrophes inside words (don't, they’re, Sam's) are not treated as quote marks.
 */
export function quotesIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/["“”]([^"“”]+)["“”]/g)) out.push(m[1]);
  for (const m of text.matchAll(/‘(.+?)’(?![\p{L}\p{N}])/gu)) out.push(m[1]);
  for (const m of text.matchAll(/(?<![\p{L}\p{N}])'(.+?)'(?![\p{L}\p{N}])/gu)) out.push(m[1]);
  return out;
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
  /** Other text the model may legitimately quote: thumbnail overlays, the creator's answers and niche, the policy brief. */
  otherText?: string[];
}

export interface GuardResult {
  report: Report;
  dropped: { videos: number; evidence: number; findings: number };
  /** Fields that quote text not found in the inputs and can't simply be dropped (headline, summaries, note). */
  ungrounded: string[];
}

export function buildCorpus(inputs: GuardInputs): string {
  return ` ${[...inputs.titles, ...inputs.scripts, ...(inputs.otherText ?? [])].map(looseNormalize).join(" | ")} `;
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

/**
 * Problems that send the report back for its one retry:
 * - forbidden wording anywhere;
 * - paid content (plan, checklist, later findings) copied into the fields the free view shows — whatever the
 *   uploaded scripts asked the model to do, the free view must not carry the paid report.
 */
export function reportIssues(r: Report, freeFindings = 2): string[] {
  const issues: string[] = [];
  const bad = reportTexts(r).find((t) => FORBIDDEN.test(t));
  if (bad) issues.push(`do not promise outcomes or call anything safe/guaranteed/approved (found: "${bad.slice(0, 80)}")`);

  const free = [
    r.headline,
    r.confidence_note,
    ...r.categories.map((c) => c.summary),
    ...r.top_findings.slice(0, freeFindings).flatMap((f) => [f.title, f.evidence, f.why_it_matters, f.fix]),
  ].map(looseNormalize);
  const paid = [
    ...r.action_plan_7_days,
    ...r.before_you_apply_checklist,
    ...r.top_findings.slice(freeFindings).flatMap((f) => [f.evidence, f.fix]),
  ]
    .map(looseNormalize)
    .filter((p) => p.length >= 24);
  const leak = free.some((f) => /\bday\s*[1-7]\b/.test(f) && /\bday\s*[2-7]\b/.test(f)) ||
    free.some((f) => paid.some((p) => f.includes(p.slice(0, 40))));
  if (leak) issues.push("headline, summaries, confidence_note and the first findings must not repeat the 7-day plan, checklist or later findings");
  return issues;
}
