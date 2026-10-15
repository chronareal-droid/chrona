import { assert, assertEquals } from "@std/assert";
import { applyGuards, quoteIsGrounded, quotesIn, reportIssues } from "./guards.ts";
import { sampleReport, SCRIPT, TITLES } from "./fixtures.ts";

Deno.test("quotesIn finds straight and curly quotes", () => {
  assertEquals(quotesIn(`He said "one two three" and “four five six”.`), ["one two three", "four five six"]);
});

Deno.test("quoteIsGrounded ignores punctuation/case, splits on ellipses, skips short scare quotes", () => {
  const corpus = " in today s video we delve into the scariest places | top 10 scariest places in japan ";
  assert(quoteIsGrounded("In today’s video, we DELVE into", corpus));
  assert(quoteIsGrounded("in today's video... the scariest places", corpus));
  assert(quoteIsGrounded("safe", corpus)); // < 3 words: not checked
  assert(!quoteIsGrounded("we filmed this ourselves", corpus));
});

Deno.test("applyGuards drops invented titles/quotes and canonicalizes titles", () => {
  const { report, dropped } = applyGuards(sampleReport(), { titles: TITLES, scripts: [SCRIPT] });
  assertEquals(report.videos_to_review, [{ title: "Top 10 Scariest Places in Japan", reason: "most generic" }]);
  assertEquals(dropped.videos, 2);
  // The invented "I filmed this myself in Osaka" evidence line is gone; the real one stays.
  const reused = report.categories.find((c) => c.key === "reused")!;
  assertEquals(reused.evidence.length, 1);
  assertEquals(dropped.evidence, 1);
  // The finding quoting text that isn't in the inputs is dropped; a fix quoting a NEW title is fine.
  assertEquals(report.top_findings.map((f) => f.title), ["Template titles", "Stock narration", "Paid finding"]);
  assertEquals(dropped.findings, 1);
});

Deno.test("single-quoted and curly-quoted spans are checked; apostrophes are not quotes", () => {
  assertEquals(quotesIn("Your title 'Top 10 Scariest Places' and ‘they’re making it’ but don't"), [
    "they’re making it",
    "Top 10 Scariest Places",
  ]);
  const corpus = " top 10 scariest places in japan | the best of rome ";
  assert(quoteIsGrounded("Top 10 Scariest Places", corpus));
  assert(!quoteIsGrounded("he best of", corpus)); // whole words only
});

Deno.test("ungrounded quotes in fields that can't be dropped are reported", () => {
  const r = sampleReport({ headline: 'Titles like "my secret night in Paris" repeat.' });
  const { ungrounded } = applyGuards(r, { titles: TITLES, scripts: [SCRIPT] });
  assertEquals(ungrounded, ["headline"]);
});

Deno.test("the creator's answers can be quoted when they are in the corpus", () => {
  const r = sampleReport();
  r.top_findings[0].evidence = 'You answered "Clips from other creators/media".';
  const without = applyGuards(r, { titles: TITLES, scripts: [SCRIPT] });
  const withAnswers = applyGuards(r, { titles: TITLES, scripts: [SCRIPT], otherText: ["Clips from other creators/media"] });
  assertEquals(without.report.top_findings[0]?.title === r.top_findings[0].title, false);
  assertEquals(withAnswers.report.top_findings[0].title, r.top_findings[0].title);
});

Deno.test("reportIssues flags banned wording and paid content in free fields", () => {
  assertEquals(reportIssues(sampleReport()), []);
  assert(reportIssues(sampleReport({ headline: "Your channel looks safe to apply." }))[0].includes("guaranteed"));
  assert(reportIssues(sampleReport({ headline: "You will be approved soon." })).length === 1);
  const plan = ["Day 1: retitle the three newest list videos around one story", "Day 2: b", "Day 3: c", "Day 4: d", "Day 5: e", "Day 6: f", "Day 7: g"];
  const leaky = sampleReport({ action_plan_7_days: plan, confidence_note: "Day 1: retitle the three newest list videos around one story, then Day 2: b" });
  assert(reportIssues(leaky).some((m) => m.includes("7-day plan")));
});

Deno.test("an elision ('90s, 'til) doesn't pair with a plural possessive into a bogus quote", () => {
  assertEquals(quotesIn("Your '90s recap titles lean on other creators' clips."), []);
  assertEquals(quotesIn("Wait 'til the end, then 'em all."), []);
  assertEquals(quotesIn("Your title 'Top 10 Scariest Places' repeats."), ["Top 10 Scariest Places"]);
});

const SERIES = ["Minecraft Hardcore Day 5", "Minecraft Hardcore Day 6", "Is Mexico City Safe for Tourists?"];
const OUTRO = "Stay safe out there and I will see you in the next one.";
const series = { titles: SERIES, scripts: [OUTRO] };

Deno.test("the plan-leak check ignores a single Day N and the creator's own numbered titles", () => {
  const one = sampleReport({ headline: "Your Day 3 upload repeats the template." });
  assertEquals(reportIssues(one), []);
  const quoted = sampleReport();
  quoted.top_findings[0].evidence = '"Minecraft Hardcore Day 5" and "Minecraft Hardcore Day 6" differ only by the number.';
  assertEquals(reportIssues(quoted, series), []);
  // The model's own Day-by-Day text in a free field is still a leak.
  const leak = sampleReport({ confidence_note: "Start with Day 1: retitle, then Day 2: rewrite the intro." });
  assert(reportIssues(leak, series).some((m) => m.includes("7-day plan")));
});

Deno.test("banned wording is the model's own: quoted creator lines and titles don't count", () => {
  const r = sampleReport();
  r.categories[3].evidence = [`Every script ends with "${OUTRO}"`];
  r.top_findings[1].evidence = 'Titles like "Is Mexico City Safe for Tourists?" follow one frame.';
  assertEquals(reportIssues(r, series), []);
  assert(reportIssues(r).length === 1, "without the inputs it can't tell, so it flags");
  // A scare-quoted single word is the model's word even if the creator once said it.
  const scare = sampleReport({ headline: 'Your channel looks "safe" for now.' });
  assert(reportIssues(scare, series)[0].includes("guaranteed"));
});

Deno.test("a long title quoted in a free and a later finding is not a paid leak", () => {
  const title = "The Most Terrifying Places on Earth That Scientists Cannot Explain";
  const inputs = { titles: [title, ...TITLES], scripts: [SCRIPT] };
  const r = sampleReport();
  r.top_findings[0].evidence = `"${title}" and others follow one frame.`;
  r.top_findings[3].evidence = `"${title}" is also the longest video.`;
  assertEquals(reportIssues(r, inputs), []);
  // The model's own later-finding wording copied into a free field is still caught.
  r.top_findings[3].fix = "Record a two minute personal intro for each of your list videos this week";
  r.top_findings[0].fix = "Record a two minute personal intro for each of your list videos this week";
  assert(reportIssues(r, inputs).some((m) => m.includes("later findings")));
});
