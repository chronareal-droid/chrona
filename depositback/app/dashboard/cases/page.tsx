import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/db";
import { toCaseRecord } from "@/lib/cases";
import { assessCase, formatUsd, type CaseStatus } from "@/lib/deposit-laws";

export const metadata: Metadata = {
  title: "My cases",
};

const STATUS_LABEL: Record<CaseStatus, { text: string; className: string }> = {
  overdue: { text: "Landlord is late", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
  withheld: { text: "Money withheld", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  waiting: { text: "Waiting on landlord", className: "bg-[var(--surface)] text-[var(--muted)]" },
  returned: { text: "Fully returned", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
};

export default async function CasesPage() {
  const session = await requireSession();
  const rows = await prisma.depositCase.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });
  const cases = rows.map(toCaseRecord);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">My cases</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">One case per deposit you want back.</p>
        </div>
        <Link
          href="/dashboard/cases/new"
          className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80"
        >
          New case
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="animate-slide-up delay-100 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <h2 className="text-sm font-semibold">No cases yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--muted)]">
            Add the deposit you&apos;re owed. We&apos;ll check your state&apos;s deadline and penalties, then help you
            demand it back.
          </p>
          <Link
            href="/dashboard/cases/new"
            className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80"
          >
            Start a case
          </Link>
        </div>
      ) : (
        <div className="animate-slide-up delay-100 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--card)]">
          {cases.map((c) => {
            const a = assessCase(c);
            const status = a ? STATUS_LABEL[a.status] : null;
            return (
              <Link
                key={c.id}
                href={`/dashboard/cases/${c.id}`}
                className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-[var(--surface)]"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium">{c.rentalAddress}</h3>
                  <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                    {c.landlordName} · {a ? `${formatUsd(a.withheld)} owed` : c.state}
                    {c.letter ? " · letter ready" : ""}
                  </p>
                </div>
                {status && (
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${status.className}`}>
                    {status.text}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
