"use client";

import { Info } from "lucide-react";
import { formatUsd, type CaseAssessment } from "@/lib/deposit-laws";
import { LEGAL_DISCLAIMER } from "@/lib/constants";
import { CountUp } from "@/components/ui/count-up";
import { Stamp } from "@/components/ui/stamp";
import { Tooltip } from "@/components/ui/tooltip";
import { DeadlineRuler } from "./deadline-ruler";
import { cn } from "@/lib/utils";

function headline(a: CaseAssessment): { text: string; stamp?: { label: string; tone: "stamp" | "accent" | "caution" } } {
  switch (a.status) {
    case "overdue":
      return a.law.clockStartsOnForwardingAddress
        ? { text: "Your landlord may be past the deadline.", stamp: { label: "Likely past due", tone: "caution" } }
        : {
            text: `Your landlord is ${a.daysOverdue} day${a.daysOverdue === 1 ? "" : "s"} late.`,
            stamp: { label: "Past due", tone: "stamp" },
          };
    case "withheld":
      return { text: `Your landlord kept ${formatUsd(a.withheld)}.`, stamp: { label: "Disputed", tone: "caution" } };
    case "waiting":
      return { text: `${a.daysLeft} day${a.daysLeft === 1 ? "" : "s"} left on the clock.` };
    case "returned":
      return { text: "Paid in full. Nice.", stamp: { label: "Settled", tone: "accent" } };
  }
}

/**
 * The ledger: the renter's situation as one composed statement.
 * Headline → the two numbers that matter → the deadline ruler → the fine print.
 */
export function AssessmentCard({
  assessment,
  moveOutDate,
  compact = false,
  className,
}: {
  assessment: CaseAssessment;
  moveOutDate: string;
  compact?: boolean;
  className?: string;
}) {
  const { law } = assessment;
  const h = headline(assessment);
  const hasPenalty = law.multiplier > 1 || !!law.flatPenalty;
  const owed = assessment.status !== "returned";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sheet)]",
        className,
      )}
      aria-live="polite"
    >
      <div className={cn(compact ? "p-5" : "p-6 sm:p-8")}>
        <div className="flex items-start justify-between gap-4">
          <p className="eyebrow">
            {law.name} · {law.returnDays}-day rule
          </p>
          {h.stamp && (
            <Stamp key={`${assessment.status}-${law.code}`} tone={h.stamp.tone} className="-mt-1 shrink-0" delay={250}>
              {h.stamp.label}
            </Stamp>
          )}
        </div>

        <h3
          key={h.text}
          className={cn("display animate-rise mt-3 text-balance", compact ? "text-[1.75rem]" : "text-[2.1rem] sm:text-[2.6rem]")}
        >
          {h.text}
        </h3>

        {owed && (
          <dl className={cn("grid grid-cols-2 border-t border-[var(--border)]", compact ? "mt-5 pt-4" : "mt-7 pt-5")}>
            <div>
              <dt className="eyebrow">Still owed</dt>
              <dd className={cn("figure mt-1.5 font-medium", compact ? "text-2xl" : "text-[2rem] sm:text-[2.4rem]")}>
                <CountUp value={assessment.withheld} />
              </dd>
            </div>
            <div className="border-l border-[var(--border)] pl-5">
              <dt className="eyebrow flex items-center gap-1.5">
                {hasPenalty ? "Recoverable up to" : "You can sue for"}
                <Tooltip content={law.penaltySummary}>
                  <button type="button" className="text-[var(--faint)] hover:text-[var(--foreground)]" aria-label="How this is calculated">
                    <Info className="h-3 w-3" aria-hidden="true" />
                  </button>
                </Tooltip>
              </dt>
              <dd
                className={cn(
                  "figure mt-1.5 font-medium",
                  hasPenalty && "text-[var(--accent)]",
                  compact ? "text-2xl" : "text-[2rem] sm:text-[2.4rem]",
                )}
              >
                <CountUp value={assessment.maxRecovery} />
              </dd>
            </div>
          </dl>
        )}

        <div className={cn(compact ? "mt-4" : "mt-8")}>
          <DeadlineRuler
            moveOutDate={moveOutDate}
            deadline={assessment.deadline}
            approximate={law.clockStartsOnForwardingAddress}
            compact={compact}
          />
        </div>
      </div>

      {!compact && (
        <div className="border-t border-dashed border-[var(--border-strong)] bg-[var(--background)]/50 px-6 py-5 sm:px-8">
          <ul className="space-y-2.5 text-[13px] leading-relaxed text-[var(--muted)]">
            {law.deadlineNote && <Note>{law.deadlineNote}</Note>}
            {assessment.missingItemization && (
              <Note strong>
                You haven&apos;t received an itemized list of deductions. In many states, a landlord who misses the
                deadline without sending one loses the right to keep any of the deposit.
              </Note>
            )}
            {owed && <Note>{law.penaltySummary}</Note>}
          </ul>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-[var(--muted)]">
            <span className="text-[var(--foreground)]">{law.statute}</span>
            {!law.verified && (
              <span className="rounded-full border border-[var(--border-strong)] px-1.5 py-px text-[10px] uppercase tracking-wider">
                Pending review
              </span>
            )}
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--faint)]">{LEGAL_DISCLAIMER}</p>
        </div>
      )}
    </section>
  );
}

function Note({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <li className={cn("flex gap-3", strong && "text-[var(--foreground)]")}>
      <span className="mt-[0.6em] h-px w-3 shrink-0 bg-current opacity-40" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
