// What get-scan is allowed to send to the browser. Paid fields are removed HERE, on the server,
// for unpaid scans (non-negotiable #7) — the frontend never receives them to hide.
import type { Report } from "./schemas.ts";

export const FREE_FINDINGS = 2;
export const RESCAN_WINDOW_DAYS = 30;
/**
 * Re-scans that fail on the creator's side (anything but capacity/timeout/internal) before the included re-scan is
 * used up; 3× this many attempts in all also use it, and so does the first that succeeds or is still running.
 */
export const RESCAN_ATTEMPTS = 5;
/** A scan still processing after this long has lost its worker (the pipeline's budget is 130 s). */
export const STALE_PROCESSING_MS = 170_000;
export const STALE_SECONDS = STALE_PROCESSING_MS / 1000;

export interface ScanRow {
  id: string;
  created_at: string;
  status: "processing" | "done" | "error";
  stage: string | null;
  error_code: string | null;
  extracted: { videos?: unknown[] } | null;
  report: Report | null;
  paid: boolean;
  paid_at: string | null;
  rescan_of: string | null;
}

export interface FreeReport {
  overall: Report["overall"];
  headline: string;
  categories: { key: Report["categories"][number]["key"]; level: Report["overall"]; summary: string }[];
  top_findings: Report["top_findings"];
  confidence_note: string;
}

export interface LockedCounts {
  more_findings: number;
  videos_to_review: number;
  plan_days: number;
  checklist_items: number;
}

export interface PublicScan {
  id: string;
  created_at: string;
  status: ScanRow["status"];
  stage: string | null;
  error_code: string | null;
  paid: boolean;
  videos_read: number | null;
  free?: FreeReport;
  locked?: LockedCounts;
  report?: Report;
  rescan?: { available: boolean; until: string | null };
}

export function freeView(r: Report): { free: FreeReport; locked: LockedCounts } {
  return {
    free: {
      overall: r.overall,
      headline: r.headline,
      categories: r.categories.map(({ key, level, summary }) => ({ key, level, summary })),
      top_findings: r.top_findings.slice(0, FREE_FINDINGS),
      confidence_note: r.confidence_note,
    },
    locked: {
      more_findings: Math.max(0, r.top_findings.length - FREE_FINDINGS),
      videos_to_review: r.videos_to_review.length,
      plan_days: r.action_plan_7_days.length,
      checklist_items: r.before_you_apply_checklist.length,
    },
  };
}

/** A paid, original (not itself a re-scan) report gets one re-scan within 30 days of payment. */
export function rescanWindow(row: ScanRow, rescanUsed: boolean, now = Date.now()): PublicScan["rescan"] {
  if (!row.paid || row.rescan_of || !row.paid_at) return { available: false, until: null };
  const until = new Date(new Date(row.paid_at).getTime() + RESCAN_WINDOW_DAYS * 86_400_000);
  return { available: !rescanUsed && until.getTime() > now, until: until.toISOString() };
}

export function toPublicView(row: ScanRow, rescanUsed = false): PublicScan {
  const base: PublicScan = {
    id: row.id,
    created_at: row.created_at,
    status: row.status,
    stage: row.stage,
    error_code: row.error_code,
    paid: row.paid,
    videos_read: Array.isArray(row.extracted?.videos) ? row.extracted!.videos!.length : null,
  };
  if (row.status !== "done" || !row.report) return base;
  if (row.paid) return { ...base, report: row.report, rescan: rescanWindow(row, rescanUsed) };
  return { ...base, ...freeView(row.report) };
}
