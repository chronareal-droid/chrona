import type { CaseStatus } from "@/lib/deposit-laws";
import { cn } from "@/lib/utils";

export const STATUS: Record<CaseStatus, { text: string; color: string }> = {
  overdue: { text: "Past due", color: "var(--stamp)" },
  withheld: { text: "Disputed", color: "var(--caution)" },
  waiting: { text: "Clock running", color: "var(--muted)" },
  returned: { text: "Settled", color: "var(--accent)" },
};

export function CaseStatusLabel({ status, className }: { status: CaseStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em]", className)} style={{ color: s.color }}>
      <span
        className={cn("h-1.5 w-1.5 rounded-full bg-current", status === "overdue" && "animate-pulse-dot")}
        aria-hidden="true"
      />
      {s.text}
    </span>
  );
}
