import { assert, assertEquals } from "@std/assert";
import { applyGuards, quoteIsGrounded, quotesIn } from "./guards.ts";
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
