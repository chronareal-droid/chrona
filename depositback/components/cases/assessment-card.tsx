import { formatLongDate, formatUsd, type CaseAssessment } from "@/lib/deposit-laws";
import { LEGAL_DISCLAIMER } from "@/lib/constants";

const HEADLINES: Record<CaseAssessment["status"], { tone: string; title: (a: CaseAssessment) => string }> = {
  overdue: {
    tone: "border-red-500/30 bg-red-500/[0.06]",
    title: (a) =>
      a.law.clockStartsOnForwardingAddress
        ? "Your landlord may be past the deadline"
        : `Your landlord is ${a.daysOverdue} day${a.daysOverdue === 1 ? "" : "s"} late`,
  },
  withheld: {
    tone: "border-amber-500/30 bg-amber-500/[0.06]",
    title: (a) => `Your landlord kept ${formatUsd(a.withheld)}`,
  },
  waiting: {
    tone: "border-[var(--border)] bg-[var(--card)]",
    title: (a) => `Your landlord has ${a.daysLeft} day${a.daysLeft === 1 ? "" : "s"} left`,
  },
  returned: {
    tone: "border-emerald-500/30 bg-emerald-500/[0.06]",
    title: () => "You got your full deposit back",
  },
};

/** The numbers a renter cares about: deadline, what's missing, what the statute may let them recover. */
export function AssessmentCard({ assessment, compact = false }: { assessment: CaseAssessment; compact?: boolean }) {
  const { law } = assessment;
  const headline = HEADLINES[assessment.status];
  const hasPenalty = law.multiplier > 1 || !!law.flatPenalty;

  return (
    <div className={`rounded-xl border p-5 ${headline.tone}`}>
      <h3 className="text-base font-semibold tracking-tight">{headline.title(assessment)}</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {law.name} gives landlords {law.returnDays} days.{" "}
        {law.clockStartsOnForwardingAddress
          ? `Deadline: ${formatLongDate(assessment.deadline)} at the earliest (counted from when you gave your forwarding address in writing).`
          : `Deadline: ${formatLongDate(assessment.deadline)}.`}
      </p>

      {assessment.status !== "returned" && (
        <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
          <Stat label="Still owed to you" value={formatUsd(assessment.withheld)} />
          <Stat
            label={hasPenalty ? "You may be able to recover up to" : "You can sue for"}
            value={formatUsd(assessment.maxRecovery)}
            accent={hasPenalty}
          />
        </div>
      )}

      {!compact && (
        <ul className="mt-4 space-y-2 text-xs text-[var(--muted)] leading-relaxed">
          {law.deadlineNote && <li>{law.deadlineNote}</li>}
          {assessment.missingItemization && (
            <li className="text-[var(--foreground)]">
              You haven&apos;t received an itemized list of deductions. In many states, a landlord who misses the
              deadline without sending one loses the right to keep any of the deposit.
            </li>
          )}
          {assessment.status !== "returned" && <li>{law.penaltySummary}</li>}
          <li>
            Law: <span className="font-mono">{law.statute}</span>
            {!law.verified && " (pending review: check the statute before relying on it)"}
          </li>
        </ul>
      )}

      {!compact && <p className="mt-4 text-[11px] text-[var(--muted)] leading-relaxed">{LEGAL_DISCLAIMER}</p>}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[var(--card)] p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tracking-tight ${accent ? "text-[var(--accent)]" : ""}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </p>
    </div>
  );
}
