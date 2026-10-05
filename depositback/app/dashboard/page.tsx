import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/db";
import { DEFAULT_PLAN } from "@/lib/constants";
import { toCaseRecord } from "@/lib/cases";
import { assessCase, formatUsd } from "@/lib/deposit-laws";
import { UpgradeBanner } from "@/components/dashboard/upgrade-banner";
import { ActivityFeed, ActivityFeedSkeleton } from "@/components/dashboard/activity-feed";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="animate-slide-up">
        <h1 className="text-lg font-semibold tracking-tight">
          Welcome back{session.name ? `, ${session.name}` : ""}
        </h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Let&apos;s get your deposit back.</p>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <CaseStats userId={session.userId} />
      </Suspense>

      {session.plan === DEFAULT_PLAN && (
        <div className="animate-slide-up delay-200">
          <UpgradeBanner />
        </div>
      )}

      <Suspense fallback={<ActivityFeedSkeleton />}>
        <div className="animate-slide-up delay-300">
          <ActivityFeed userId={session.userId} />
        </div>
      </Suspense>
    </div>
  );
}

async function CaseStats({ userId }: { userId: string }) {
  const rows = await prisma.depositCase.findMany({ where: { userId } });
  const assessments = rows.map((r) => assessCase(toCaseRecord(r))).filter((a) => a !== null);
  const owed = assessments.reduce((sum, a) => sum + a.withheld, 0);
  const overdue = assessments.filter((a) => a.status === "overdue").length;

  if (rows.length === 0) {
    return (
      <div className="animate-slide-up delay-100 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-sm font-semibold">Start your first case</h2>
        <p className="mt-1 max-w-md text-xs text-[var(--muted)] leading-relaxed">
          Tell us about the deposit you&apos;re owed. We&apos;ll check your state&apos;s deadline, show what your
          landlord may owe you, and help you demand it back.
        </p>
        <Link
          href="/dashboard/cases/new"
          className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80"
        >
          Start a case
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-slide-up delay-100 grid gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
      <StatCard label="Open cases" value={String(rows.length)} href="/dashboard/cases" />
      <StatCard label="Still owed to you" value={formatUsd(owed)} />
      <StatCard label="Landlords past deadline" value={String(overdue)} />
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </p>
    </>
  );
  return href ? (
    <Link href={href} className="bg-[var(--card)] p-5 transition-colors hover:bg-[var(--surface)]">
      {body}
    </Link>
  ) : (
    <div className="bg-[var(--card)] p-5">{body}</div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[var(--card)] p-5">
          <div className="h-3 w-20 rounded bg-[var(--surface)] animate-pulse" />
          <div className="mt-2 h-6 w-12 rounded bg-[var(--surface)] animate-pulse" />
        </div>
      ))}
    </div>
  );
}
