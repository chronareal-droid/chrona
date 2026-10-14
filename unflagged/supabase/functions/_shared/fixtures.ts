// Test fixtures shared by the *_test.ts files.
import type { Report } from "./schemas.ts";

export const TITLES = [
  "Top 10 Scariest Places in Japan",
  "Top 10 Scariest Places in Mexico",
  "Top 10 Scariest Places in Brazil",
  "Top 10 Scariest Places in Canada",
  "The Lost City Nobody Talks About",
];

export const SCRIPT =
  "In today's video we delve into the scariest places in Japan. Buckle up, because this list is a testament to fear. " +
  "Number ten is a tunnel that locals refuse to enter after dark.";

export function sampleReport(over: Partial<Report> = {}): Report {
  return {
    overall: "high",
    headline: "Your uploads match the template pattern the policy describes.",
    categories: [
      {
        key: "generic_repetitive",
        level: "high",
        summary: "Titles follow one frame.",
        evidence: ['"Top 10 Scariest Places in Japan" and "Top 10 Scariest Places in Mexico" differ by one word'],
        fixes: ["Rewrite titles around a specific story."],
      },
      { key: "off_putting", level: "low", summary: "Nothing shocking.", evidence: [], fixes: [] },
      { key: "ai_persona_sensitive", level: "low", summary: "No sensitive topics.", evidence: [], fixes: [] },
      {
        key: "reused",
        level: "elevated",
        summary: "Narration is generic.",
        evidence: ['Script 1 opens with "In today\'s video we delve into the scariest places"', 'You say "I filmed this myself in Osaka"'],
        fixes: ["Add your own commentary."],
      },
    ],
    top_findings: [
      { title: "Template titles", evidence: '"Top 10 Scariest Places in Brazil"', why_it_matters: "w", fix: 'Retitle to "The tunnel Tokyo forgot"' },
      { title: "Stock narration", evidence: '"Buckle up, because this list is a testament to fear"', why_it_matters: "w", fix: "f" },
      { title: "Invented quote", evidence: '"we went there ourselves last summer"', why_it_matters: "w", fix: "f" },
      { title: "Paid finding", evidence: "Durations are near-identical.", why_it_matters: "w", fix: "f" },
    ],
    videos_to_review: [
      { title: "top 10 scariest places in japan", reason: "most generic" },
      { title: "Top 10 Scariest Places in Narnia", reason: "invented" },
      { title: "Top 10 Scariest Places in Japan", reason: "duplicate" },
    ],
    action_plan_7_days: ["Day 1: a", "Day 2: b", "Day 3: c", "Day 4: d", "Day 5: e", "Day 6: f", "Day 7: g"],
    before_you_apply_checklist: ["PAID-CHECKLIST-ITEM"],
    confidence_note: "We could not see descriptions.",
    ...over,
  };
}
