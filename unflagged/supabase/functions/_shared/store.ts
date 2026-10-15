// Database access used by the functions, behind a small interface so handlers can be tested without Postgres.
import type { SupabaseClient } from "@supabase/supabase-js";
import { ATTEMPTS_PER_IP_PER_DAY, SCANS_PER_IP_PER_DAY } from "./ip.ts";
import type { ScanPatch } from "./pipeline.ts";
import { RESCAN_ATTEMPTS, RESCAN_WINDOW_DAYS, STALE_SECONDS } from "./report.ts";

export interface NewScan {
  ip_hash: string;
  answers: unknown;
  email: string | null;
  niche: string | null;
  src: string | null;
}

export type CreateResult = { id: string } | { error: "rate_limited" | "rescan_unavailable" | "rescan_used" };

export interface ScanStore {
  /** Atomically checks the per-IP limits and inserts (see migration create_scan). */
  createScan(scan: NewScan): Promise<CreateResult>;
  /** Atomically claims a paid report's included re-scan and inserts it (see migration create_rescan). */
  createRescan(parentId: string, scan: NewScan): Promise<CreateResult>;
  update(id: string, patch: ScanPatch): Promise<void>;
  /** Marks a scan failed (timeout) only if it is still processing, so it can't overwrite a result that just landed. */
  failIfProcessing(id: string): Promise<void>;
}

const KNOWN = new Set(["rate_limited", "rescan_unavailable", "rescan_used"]);

export function supabaseStore(supabase: SupabaseClient): ScanStore {
  const call = async (fn: string, args: Record<string, unknown>): Promise<CreateResult> => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
      if (KNOWN.has(error.message)) return { error: error.message as "rate_limited" };
      if (error.code === "23505") return { error: "rescan_used" }; // unique index raced
      throw error;
    }
    return { id: data as string };
  };
  const args = (s: NewScan) => ({ p_ip_hash: s.ip_hash, p_answers: s.answers, p_email: s.email, p_niche: s.niche, p_src: s.src });
  return {
    createScan: (s) =>
      call("create_scan", {
        ...args(s),
        p_limit: SCANS_PER_IP_PER_DAY,
        p_attempt_limit: ATTEMPTS_PER_IP_PER_DAY,
        p_stale_seconds: STALE_SECONDS,
      }),
    createRescan: (parent, s) =>
      call("create_rescan", {
        p_parent: parent,
        ...args(s),
        p_window_days: RESCAN_WINDOW_DAYS,
        p_attempt_limit: RESCAN_ATTEMPTS,
        p_stale_seconds: STALE_SECONDS,
      }),
    update: async (id, patch) => {
      const { error } = await supabase.from("scans").update(patch).eq("id", id);
      if (error) throw error;
    },
    failIfProcessing: async (id) => {
      const { error } = await supabase
        .from("scans")
        .update({ status: "error", error_code: "timeout", stage: null })
        .eq("id", id)
        .eq("status", "processing");
      if (error) throw error;
    },
  };
}
