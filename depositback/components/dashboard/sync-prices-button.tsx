"use client";

import { useState } from "react";

export function SyncPricesButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/config/sync-prices", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const count = Object.keys(data.synced).length;
        setResult(
          count > 0
            ? `Synced prices for ${count} plan(s).`
            : "No plan IDs configured to sync."
        );
      } else {
        setResult("Failed to sync prices.");
      }
    } catch {
      setResult("Failed to sync prices.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className="cursor-pointer rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface)] disabled:opacity-40"
      >
        {syncing ? "Syncing..." : "Refresh Prices from Whop"}
      </button>
      {result && (
        <p className="mt-2 text-xs text-[var(--muted)]">{result}</p>
      )}
    </div>
  );
}
