import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import {
  cadenceSignals,
  computeSignals,
  countPhrases,
  describeSignals,
  durationSignals,
  normalizeTitle,
  parseAge,
  parseDuration,
  scriptSignals,
  titleKey,
  titleSignals,
} from "./signals.ts";
import { GENERIC_AI_PHRASES, OPINION_MARKERS } from "./phrases.ts";

Deno.test("normalizeTitle lowercases, maps digits and strips punctuation", () => {
  assertEquals(normalizeTitle("Top 10 SCARIEST Places on Earth!!"), "top # scariest places on earth");
  assertEquals(normalizeTitle("Why Rome Fell — Part 2 (2024)"), "why rome fell part # #");
  assertEquals(normalizeTitle("Napoleon’s Last Stand"), "napoleon s last stand");
});

Deno.test("titleSignals flags a fill-in-the-blank template as high", () => {
  const titles = [
    "Top 10 Scariest Places in Japan",
    "Top 10 Scariest Places in Mexico",
    "Top 10 Scariest Places in Brazil",
    "Top 10 Scariest Places in Canada",
    "Top 10 Scariest Places in Italy",
    "The Lost City Nobody Talks About",
  ];
  const s = titleSignals(titles);
  assertEquals(s.count, 6);
  assertEquals(s.top_prefix, "top # scariest");
  assertEquals(s.top_prefix_count, 5);
  assertAlmostEquals(s.top_pattern_share, 0.83, 0.01);
  assert(s.mean_bigram_jaccard > 0.35);
  assertEquals(s.flag, "high");
});

Deno.test("titleSignals keeps varied titles low", () => {
  const s = titleSignals([
    "How the Library of Alexandria Really Burned",
    "I Read Every Letter Lincoln Wrote in 1863",
    "The Mapmaker Who Invented an Island",
    "Why Medieval Bread Was Grey",
    "Sparta Was Weaker Than You Think",
  ]);
  assertEquals(s.top_prefix, null);
  assertEquals(s.top_pattern_share, 0);
  assertEquals(s.flag, "low");
});

Deno.test("titleSignals marks too few titles insufficient", () => {
  const s = titleSignals(["Top 5 X", "Top 5 Y", "Top 5 Z"]);
  assert(s.insufficient);
  assertEquals(s.flag, "low");
});

Deno.test("parseDuration handles mm:ss and h:mm:ss and rejects junk", () => {
  assertEquals(parseDuration("12:41"), 761);
  assertEquals(parseDuration("0:59"), 59);
  assertEquals(parseDuration("1:02:03"), 3723);
  assertEquals(parseDuration(" 8:05 "), 485);
  assertEquals(parseDuration("LIVE"), null);
  assertEquals(parseDuration("12:61"), null);
  assertEquals(parseDuration("1:61:00"), null);
  assertEquals(parseDuration(null), null);
});

Deno.test("durationSignals flags near-identical lengths as high", () => {
  const s = durationSignals(["10:01", "10:12", "9:58", "10:05", "10:20", "LIVE"]);
  assertEquals(s.count, 5);
  assert(s.coefficient_of_variation! < 0.1);
  assertEquals(s.share_within_10pct_of_median, 1);
  assertEquals(s.flag, "high");
});

Deno.test("durationSignals keeps varied lengths low", () => {
  const s = durationSignals(["4:10", "22:30", "11:02", "1:05:00", "7:45"]);
  assertEquals(s.flag, "low");
  assert(s.coefficient_of_variation! > 0.5);
});

Deno.test("parseAge understands common age strings", () => {
  assertEquals(parseAge("3 days ago"), { days: 3, precise: true });
  assertEquals(parseAge("Streamed 2 weeks ago"), { days: 14, precise: false });
  assertEquals(parseAge("1 month ago"), { days: 30, precise: false });
  assertEquals(parseAge("an hour ago")?.precise, true);
  assertAlmostEquals(parseAge("5 hours ago")!.days, 5 / 24);
  assertEquals(parseAge("2 years ago")?.days, 730);
  assertEquals(parseAge("Premieres tomorrow"), null);
  assertEquals(parseAge(null), null);
});

Deno.test("cadenceSignals flags mass uploading and same-day bursts", () => {
  const s = cadenceSignals([
    "2 hours ago",
    "5 hours ago",
    "9 hours ago",
    "1 day ago",
    "1 day ago",
    "1 day ago",
    "2 days ago",
    "3 days ago",
  ]);
  assertEquals(s.burst_days, 2);
  assert(s.est_uploads_per_week! >= 15);
  assertEquals(s.flag, "high");
});

Deno.test("cadenceSignals keeps a weekly schedule low", () => {
  const s = cadenceSignals(["4 days ago", "1 week ago", "2 weeks ago", "3 weeks ago", "1 month ago"]);
  assertEquals(s.burst_days, 0);
  assert(s.est_uploads_per_week! < 2);
  assertEquals(s.flag, "low");
});

Deno.test("countPhrases matches whole phrases only, with curly apostrophes", () => {
  assertEquals(countPhrases("In today’s video we delve into Rome. Delve!", GENERIC_AI_PHRASES), 3);
  // "delved" isn't in the list and "delve" must not match inside it.
  assertEquals(countPhrases("They delved deeper.", ["delve"]), 0);
});

const genericScript = (place: string) =>
  `In today's video we delve into the history of ${place}. Buckle up, because this story is a testament to human ambition. ` +
  `It's important to note that ${place} was shaped by many forces over the centuries. ` +
  `The rich tapestry of ${place} culture still fascinates historians around the world. ` +
  `In conclusion, ${place} remains one of the most interesting places on the planet. ` +
  `Thanks for watching, and do not forget to like and subscribe for more videos like this.`;

const originalScript =
  `I think most people get the fall of Carthage wrong. Here's why: the sources we rely on were written by the winners. ` +
  `When I looked at the grain prices in Polybius, I noticed something odd about the second treaty. ` +
  `In my view the Senate was not acting out of fear at all, it was acting out of greed for the African farmland. ` +
  `If we look at who bought those estates afterwards, the motive becomes much clearer than any speech by Cato.`;

Deno.test("scriptSignals flags templated, phrase-heavy scripts", () => {
  const s = scriptSignals([genericScript("Rome"), genericScript("Egypt"), ""]);
  assertEquals(s.count, 2);
  assertEquals(s.ai_phrase_flag, "high");
  assertEquals(s.opinion_flag, "high");
  assert(s.same_intro && s.same_outro);
  assert(s.cross_script_overlap! >= 0.8);
  assertEquals(s.overlap_flag, "high");
});

Deno.test("scriptSignals keeps opinionated, distinct scripts low", () => {
  const s = scriptSignals([originalScript]);
  assertEquals(s.count, 1);
  assertEquals(s.opinion_flag, "low");
  assertEquals(s.ai_phrase_flag, "low");
  assertEquals(s.cross_script_overlap, null);
  assertEquals(s.overlap_flag, "low");
});

Deno.test("scriptSignals with no scripts is all low", () => {
  const s = scriptSignals(["", "   "]);
  assertEquals(s.count, 0);
  assertEquals([s.opinion_flag, s.ai_phrase_flag, s.overlap_flag], ["low", "low", "low"]);
});

Deno.test("computeSignals + describeSignals produce labeled lines without script text", () => {
  const videos = ["Japan", "Mexico", "Brazil", "Canada"].map((c, i) => ({
    title: `Top 10 Scariest Places in ${c}`,
    duration_text: `10:0${i}`,
    age_text: `${i + 1} days ago`,
  }));
  const sig = computeSignals(videos, [genericScript("Rome"), genericScript("Egypt")]);
  const lines = describeSignals(sig);
  assert(lines.some((l) => l.startsWith("Title templating [high risk]")));
  assert(lines.some((l) => l.startsWith("Duration uniformity [high risk]")));
  assert(lines.some((l) => l.startsWith("Reused sentences across scripts [high risk]")));
  // The stored signals object must never carry script text.
  const json = JSON.stringify(sig);
  assert(!json.includes("tapestry") && !json.includes("Rome"));
});

Deno.test("titleKey keeps digits, so numbered episodes stay separate videos", () => {
  assertEquals(titleKey("Day 1: I Built a Base!"), "day 1 i built a base");
  assert(titleKey("Part 1") !== titleKey("Part 2"));
  assertEquals(titleKey("Top 10 Scariest Places"), titleKey("TOP 10 scariest places!!"));
});

Deno.test("countPhrases counts overlapping list entries once", () => {
  assertEquals(countPhrases("In my view, this matters.", OPINION_MARKERS), 1);
  assertEquals(countPhrases("A rich tapestry of history.", GENERIC_AI_PHRASES), 1);
  assertEquals(countPhrases("Unlock the secrets of Rome.", GENERIC_AI_PHRASES), 1);
});

Deno.test("scriptSignals stays fast on the largest valid input (CPU budget)", () => {
  const vocab = Array.from({ length: 2000 }, (_, i) => `w${i.toString(36)}`);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // 3 × 2,499 words, five words per line: the old all-pairs comparison took ~2.5 s on this.
  const script = () => Array.from({ length: 500 }, () => Array.from({ length: 5 }, () => vocab[Math.floor(rnd() * 2000)]).join(" ")).join("\n");
  const inputs = [script(), script(), script()];
  scriptSignals(inputs); // warm-up (JIT)
  const t0 = performance.now();
  scriptSignals(inputs);
  const ms = performance.now() - t0;
  // ~170 ms on a laptop; the bound leaves room for a slow CI runner and still catches the old 2.5 s behaviour.
  assert(ms < 800, `scriptSignals took ${ms.toFixed(0)} ms`);
});
