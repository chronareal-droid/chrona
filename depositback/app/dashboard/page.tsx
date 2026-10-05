import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/db";
import { DEFAULT_PLAN, FIRST_PAID_PLAN, PLAN_METADATA } from "@/lib/constants";
import { toCaseRecord } from "@/lib/cases";
import { assessCase, formatUsd, type CaseStatus } from "@/lib/deposit-laws";
import { CountUp } from "@/components/ui/count-up";
import { ButtonLink, Arrow } from "@/components/ui/button";
import { Stamp } from "@/components/ui/stamp";
import { DeadlineRuler } from "@/components/cases/deadline-ruler";
import { CaseStatusLabel } from "@/components/cases/case-status";
import { NewCaseShortcut } from "@/components/cases/new-case-shortcut";
import { ActivityFeed, ActivityFeedSkeleton } from "@/components/dashboard/activity-feed";

export const metadata: Metadata = {
  title: "Overview",
};

const URGENCY: Record<CaseStatus, number> = { overdue: 0, withheld: 1, waiting: 2, returned: 3 };

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = session.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl">
      <NewCaseShortcut />
      <p className="eyebrow animate-fade-in">{firstName ? `Hi, ${firstName}` : "Overview"}</p>
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview userId={session.userId} isFree={session.plan === DEFAULT_PLAN} />
      </Suspense>

      <section className="mt-20">
        <Suspense fallback={<ActivityFeedSkeleton />}>
          <ActivityFeed userId={session.userId} />
        </Suspense>
      </section>
    </div>
  );
}

async function Overview({ userId, isFree }: { userId: string; isFree: boolean }) {
  const rows = await prisma.depositCase.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  const cases = rows
    .map((r) => {
      const c = toCaseRecord(r);
      return { c, a: assessCase(c) };
    })
    .filter((x): x is { c: typeof x.c; a: NonNullable<typeof x.a> } => x.a !== null);

  if (cases.length === 0) {
    return (
      <div className="mt-3">
        <h1 className="display animate-rise text-[3rem] sm:text-[4.5rem]">
          Let&apos;s find out what <span className="italic text-[var(--accent)]">you&apos;re owed.</span>
        </h1>
        <p className="animate-slide-up delay-200 mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-[var(--muted)]">
          Open a case for the deposit you want back. We&apos;ll check your state&apos;s deadline and penalty, then help
          you demand it in writing.
        </p>
        <div className="animate-slide-up delay-300 mt-8 flex items-center gap-4">
          <ButtonLink href="/dashboard/cases/new" size="lg" magnetic>
            Open a case <Arrow />
          </ButtonLink>
          <span className="eyebrow !normal-case !tracking-normal">or press N</span>
        </div>
      </div>
    );
  }

  const owed = cases.reduce((sum, x) => sum + x.a.withheld, 0);
  const recoverable = cases.reduce((sum, x) => sum + x.a.maxRecovery, 0);
  const overdue = cases.filter((x) => x.a.status === "overdue").length;
  const urgent = [...cases].sort((x, y) => URGENCY[x.a.status] - URGENCY[y.a.status] || y.a.withheld - x.a.withheld)[0];

  return (
    <>
      <h1 className="display animate-rise mt-3 text-[3rem] sm:text-[4.75rem]">
        You&apos;re owed{" "}
        <CountUp value={owed} className={owed > 0 ? "italic text-[var(--accent)]" : undefined} />.
      </h1>
      <dl className="animate-slide-up delay-200 mt-8 grid max-w-2xl grid-cols-3 border-y border-[var(--border)] py-5">
        <Stat label="Open cases" value={String(cases.length)} />
        <Stat label="Past deadline" value={String(overdue)} tone={overdue > 0 ? "stamp" : undefined} />
        <Stat label="Recoverable up to" value={formatUsd(recoverable)} />
      </dl>

      {urgent && urgent.a.status !== "returned" && (
        <section className="animate-slide-up delay-300 mt-14">
          <div className="mb-4 flex items-center justify-between">
            <p className="eyebrow">Needs you next</p>
            <Link href="/dashboard/cases" className="eyebrow transition-colors hover:text-[var(--foreground)]">
              All cases →
            </Link>
          </div>
          <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sheet)] sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CaseStatusLabel status={urgent.a.status} />
                <h2 className="display mt-3 truncate text-[2rem] sm:text-[2.4rem]">{urgent.c.rentalAddress}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {urgent.c.landlordName} owes you <span className="figure text-[var(--foreground)]">{formatUsd(urgent.a.withheld)}</span>
                </p>
              </div>
              {urgent.a.status === "overdue" && <Stamp className="shrink-0 self-start" delay={500}>Past due</Stamp>}
            </div>
            <div className="mt-6">
              <DeadlineRuler
                moveOutDate={urgent.c.moveOutDate}
                deadline={urgent.a.deadline}
                approximate={urgent.a.law.clockStartsOnForwardingAddress}
              />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
              <ButtonLink href={`/dashboard/cases/${urgent.c.id}`} magnetic>
                {urgent.c.letter ? "Open your letter" : "Write the demand letter"} <Arrow />
              </ButtonLink>
              {isFree && !urgent.c.letter && (
                <span className="text-xs text-[var(--muted)]">
                  Part of the {PLAN_METADATA[FIRST_PAID_PLAN].name}, one-time.
                </span>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "stamp" }) {
  return (
    <div className="border-l border-[var(--border)] pl-4 first:border-l-0 first:pl-0 sm:pl-6">
      <dt className="eyebrow !text-[10px]">{label}</dt>
      <dd className="figure mt-1.5 text-xl sm:text-2xl" style={tone ? { color: "var(--stamp)" } : undefined}>
        {value}
      </dd>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="mt-4 space-y-6">
      <div className="skeleton h-16 w-3/4 rounded-lg" />
      <div className="skeleton h-12 w-1/2 rounded-lg" />
      <div className="skeleton mt-10 h-64 w-full rounded-2xl" />
    </div>
  );
}
