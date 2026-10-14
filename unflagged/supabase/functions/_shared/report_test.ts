import { assert, assertEquals } from "@std/assert";
import { type ScanRow, toPublicView } from "./report.ts";
import { sampleReport } from "./fixtures.ts";

const row = (over: Partial<ScanRow> = {}): ScanRow => ({
  id: "00000000-0000-4000-8000-000000000001",
  created_at: "2026-10-01T00:00:00Z",
  status: "done",
  stage: null,
  error_code: null,
  extracted: { videos: [1, 2, 3] },
  report: sampleReport(),
  paid: false,
  paid_at: null,
  rescan_of: null,
  ...over,
});

Deno.test("unpaid view carries no paid content at all", () => {
  const v = toPublicView(row());
  assertEquals(v.report, undefined);
  assertEquals(v.free!.top_findings.length, 2);
  assertEquals(v.locked, { more_findings: 2, videos_to_review: 3, plan_days: 7, checklist_items: 1 });
  const wire = JSON.stringify(v);
  for (const secret of ["PAID-CHECKLIST-ITEM", "Paid finding", "Day 1: a", "most generic", "Rewrite titles around"]) {
    assert(!wire.includes(secret), `leaked: ${secret}`);
  }
  // Category cards are level + summary only.
  assertEquals(Object.keys(v.free!.categories[0]).sort(), ["key", "level", "summary"]);
});

Deno.test("paid view returns the full report and the re-scan window", () => {
  const paidAt = new Date().toISOString();
  const v = toPublicView(row({ paid: true, paid_at: paidAt }));
  assertEquals(v.report!.before_you_apply_checklist, ["PAID-CHECKLIST-ITEM"]);
  assertEquals(v.free, undefined);
  assert(v.rescan!.available);
  assertEquals(toPublicView(row({ paid: true, paid_at: paidAt }), true).rescan!.available, false);
  assertEquals(toPublicView(row({ paid: true, paid_at: "2020-01-01T00:00:00Z" })).rescan!.available, false);
  assertEquals(toPublicView(row({ paid: true, paid_at: paidAt, rescan_of: "x" })).rescan!.available, false);
});

Deno.test("processing and error views carry no report", () => {
  const p = toPublicView(row({ status: "processing", stage: "judge", report: null, extracted: null }));
  assertEquals([p.free, p.report, p.videos_read, p.stage], [undefined, undefined, null, "judge"]);
  const e = toPublicView(row({ status: "error", error_code: "capacity", report: null }));
  assertEquals(e.error_code, "capacity");
});
