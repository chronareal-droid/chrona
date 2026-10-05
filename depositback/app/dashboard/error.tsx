"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="max-w-xs text-center">
        <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
          <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-sm font-semibold">Something went wrong</h1>
        <p className="mt-1 text-xs text-[var(--muted)]">
          An error occurred loading this page.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={reset}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface)]"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
