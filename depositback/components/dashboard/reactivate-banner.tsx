"use client";

import { useState } from "react";

export function ReactivateBanner() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/30 bg-[var(--card)] p-5">
        <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Subscription reactivated
        </h3>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          Your subscription will continue as normal. No further action needed.
        </p>
      </div>
    );
  }

  async function handleReactivate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/uncancel", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to reactivate");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-900/30 bg-[var(--card)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            Your subscription is ending
          </h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Your plan will be downgraded at the end of the current billing
            period. Reactivate to keep your access.
          </p>
          {error && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleReactivate}
          disabled={loading}
          className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {loading ? "Reactivating..." : "Reactivate"}
        </button>
      </div>
    </div>
  );
}
