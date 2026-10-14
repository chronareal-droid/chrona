// Hallucination guards (section 3.5). Run on every validated report before it's stored.
import type { Report } from "./schemas.ts";
import { normalizeTitle } from "./signals.ts";

/** Lowercase, letters/digits only, single spaces: makes quote matching robust to punctuation and curly quotes. */
export function looseNormalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Text between double quotes (straight or curly). */
export function quotesIn(text: string): string[] {
  return [...text.matchAll(/["“”]([^"“”]+)["“”]/g)].map((m) => m[1]);
}

/**
 * Quotes of 3+ words must appear in the inputs. Shorter quotes are usually scare quotes ("safe", "Top 10")
 * and can't be checked meaningfully. An ellipsis inside a quote splits it into pieces checked separately.
 */
export function quoteIsGrounded(quote: string, corpus: string): boolean {
  const pieces = quote.split(/\.\.\.|…/).map(looseNormalize).filter(Boolean);
  return pieces.every((p) => p.split(" ").length < 3 || corpus.includes(p));
}

export function textIsGrounded(text: string, corpus: string): boolean {
  return quotesIn(text).every((q) => quoteIsGrounded(q, corpus));
}

export interface GuardInputs {
  titles: string[];
  scripts: string[];
  /** Other visible text the model may legitimately quote (thumbnail overlays). */
  otherText?: string[];
}

export interface GuardResult {
  report: Report;
  dropped: { videos: number; evidence: number; findings: number };
}

export function applyGuards(report: Report, inputs: GuardInputs): GuardResult {
  const corpus = ` ${[...inputs.titles, ...inputs.scripts, ...(inputs.otherText ?? [])].map(looseNormalize).join(" | ")} `;
  const byNorm = new Map(inputs.titles.map((t) => [normalizeTitle(t), t]));
  const dropped = { videos: 0, evidence: 0, findings: 0 };

  const seen = new Set<string>();
  const videos_to_review = report.videos_to_review.flatMap((v) => {
    const key = normalizeTitle(v.title);
    const canonical = byNorm.get(key);
    if (!canonical || seen.has(key)) {
      dropped.videos++;
      return [];
    }
    seen.add(key);
    return [{ title: canonical, reason: v.reason }];
  });

  const categories = report.categories.map((c) => {
    const evidence = c.evidence.filter((e) => textIsGrounded(e, corpus));
    dropped.evidence += c.evidence.length - evidence.length;
    return { ...c, evidence };
  });

  // Only evidence is checked: fixes legitimately quote text that doesn't exist yet ("retitle it to \"...\"").
  const top_findings = report.top_findings.filter((f) => {
    const ok = textIsGrounded(f.evidence, corpus);
    if (!ok) dropped.findings++;
    return ok;
  });

  return { report: { ...report, categories, top_findings, videos_to_review }, dropped };
}
