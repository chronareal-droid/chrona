import Link from "next/link";
import { FIRST_PAID_PLAN, PLAN_METADATA } from "@/lib/constants";

export function UpgradeBanner() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Get the {PLAN_METADATA[FIRST_PAID_PLAN].name}</h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Demand letters that cite your state&apos;s law and penalties. Pay once, use it for every case.
          </p>
        </div>
        <Link
          href="/pricing"
          className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80"
        >
          Unlock
        </Link>
      </div>
    </div>
  );
}
