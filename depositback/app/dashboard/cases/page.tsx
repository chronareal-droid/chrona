import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/db";
import { toCaseRecord } from "@/lib/cases";
import { assessCase, formatUsd } from "@/lib/deposit-laws";
import { ButtonLink } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { MiniRuler } from "@/components/cases/deadline-ruler";
import { CaseStatusLabel } from "@/components/cases/case-status";
import { NewCaseShortcut } from "@/components/cases/new-case-shortcut";
import { Stamp } from "@/components/ui/stamp";

export const metadata: Metadata = {
  title: "Cases",
};

export default async function CasesPage() {
  const session = await requireSession();
  const rows = await prisma.depositCase.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });
  const cases = rows.map((r) => {
    const c = toCaseRecord(r);
    return { c, a: assessCase(c) };
  });

  return (
    <div className="mx-auto max-w-5xl">
      <NewCaseShortcut />
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow animate-fade-in">Cases</p>
          <h1 className="display animate-rise mt-3 text-[2.75rem] sm:text-[3.5rem]">Every deposit you&apos;re owed.</h1>
        </div>
        <Tooltip content={<>New case · press <kbd className="font-mono">N</kbd></>} side="bottom">
          <ButtonLink href="/dashboard/cases/new" variant="ink" size="md" className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">New case</span>
          </ButtonLink>
        </Tooltip>
      </header>

      {cases.length === 0 ? (
        <div className="animate-slide-up delay-200 mt-12 flex flex-col items-center rounded-2xl border border-dashed border-[var(--border-strong)] px-6 py-16 text-center">
          <Stamp tone="accent" delay={300}>Nothing filed yet</Stamp>
          <p className="display mt-6 max-w-md text-[2rem]">Start with the deposit you want back.</p>
          <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">
            Two minutes to fill in. We&apos;ll check the deadline and the penalty for your state.
          </p>
          <ButtonLink href="/dashboard/cases/new" size="lg" className="mt-8" magnetic>
            Open a case
          </ButtonLink>
        </div>
      ) : (
        <div className="animate-slide-up delay-200 mt-12">
          <div className="eyebrow hidden grid-cols-[minmax(0,1fr)_9rem_8rem_8rem] gap-6 border-b border-[var(--border)] pb-3 md:grid">
            <span>Rental</span>
            <span>Deadline</span>
            <span className="text-right">Owed</span>
            <span className="text-right">Status</span>
          </div>
          <ul>
            {cases.map(({ c, a }) => (
              <li key={c.id} className="border-b border-[var(--border)]">
                <Link
                  href={`/dashboard/cases/${c.id}`}
                  className="group -mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-3 rounded-xl px-3 py-5 transition-colors hover:bg-[var(--card)] md:grid-cols-[minmax(0,1fr)_9rem_8rem_8rem]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium transition-colors group-hover:text-[var(--accent)]">{c.rentalAddress}</p>
                    <p className="mt-1 truncate text-xs text-[var(--muted)]">
                      {c.landlordName} · {c.state}
                      {c.letter && <span className="text-[var(--accent)]"> · letter ready</span>}
                    </p>
                  </div>
                  <div className="col-span-2 md:col-span-1">{a && <MiniRuler moveOutDate={c.moveOutDate} deadline={a.deadline} />}</div>
                  <p className="figure row-start-1 text-right text-lg md:row-start-auto">{a ? formatUsd(a.withheld) : "—"}</p>
                  <div className="hidden text-right md:block">{a && <CaseStatusLabel status={a.status} />}</div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
