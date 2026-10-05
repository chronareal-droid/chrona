import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/db";
import { toCaseRecord } from "@/lib/cases";
import { assessCase, formatLongDate, formatUsd } from "@/lib/deposit-laws";
import { FIRST_PAID_PLAN, PLAN_METADATA } from "@/lib/constants";
import { RESPONSE_DAYS } from "@/lib/letter";
import { PlanGate } from "@/components/plan-gate";
import { AssessmentCard } from "@/components/cases/assessment-card";
import { LetterPanel } from "@/components/cases/letter-panel";
import { DeleteCaseButton } from "@/components/cases/delete-case-button";
import { Tabs } from "@/components/ui/tabs";
import { ButtonLink, Arrow } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Case",
};

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const row = await prisma.depositCase.findFirst({ where: { id, userId: session.userId } });
  if (!row) notFound();

  const c = toCaseRecord(row);
  const assessment = assessCase(c);
  if (!assessment) notFound();
  const owed = assessment.withheld > 0;

  const letterTab = (
    <PlanGate
      plan={session.plan}
      minimum={FIRST_PAID_PLAN}
      fallback={
        <div className="grid gap-8 overflow-hidden rounded-2xl bg-[var(--foreground)] p-8 text-[var(--background)] sm:p-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] opacity-60">{PLAN_METADATA[FIRST_PAID_PLAN].name}</p>
            <p className="display mt-3 text-[2.5rem] sm:text-[3rem]">Make it official.</p>
            <p className="mt-3 max-w-md text-sm leading-relaxed opacity-70">
              A demand letter citing {assessment.law.name} law, the deadline, and the penalty your landlord risks,
              with a rebuttal for every deduction. Pay once, use it for every case.
            </p>
          </div>
          <ButtonLink href="/pricing" size="lg" magnetic>
            Unlock the letter <Arrow />
          </ButtonLink>
        </div>
      }
    >
      <LetterPanel caseId={c.id} letter={c.letter} generatedAt={c.letterGeneratedAt} stateName={assessment.law.name} />
    </PlanGate>
  );

  const steps = [
    {
      title: "Mail it certified, return receipt",
      body: "Keep the receipt and a copy. It proves when your landlord got it. Email a copy too if that's how you usually talk.",
    },
    { title: `Give them ${RESPONSE_DAYS} days`, body: "Most landlords pay once the statute and the penalty are in writing." },
    {
      title: "No payment? File in small claims",
      body: `File in the county where the rental is. Fees are modest and you don't need a lawyer. Bring the lease, move-out photos, this letter and the mail receipt. Search "${assessment.law.name} small claims court" for forms.`,
    },
    { title: "Get free help if you want it", body: "Tenant-rights groups and legal aid offices will often review a case for free." },
  ];

  const nextStepsTab = (
    <ol className="relative max-w-2xl">
      <span aria-hidden="true" className="absolute top-3 bottom-3 left-[11px] w-px bg-[var(--border-strong)]" />
      {steps.map((s, i) => (
        <li key={s.title} className="relative grid grid-cols-[1.5rem_1fr] gap-5 pb-9 last:pb-0">
          <span className="figure relative z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--background)] text-[10px] text-[var(--muted)]">
            {i + 1}
          </span>
          <div>
            <h3 className="text-[0.9375rem] font-medium">{s.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard/cases"
        className="eyebrow animate-fade-in inline-flex items-center gap-1 transition-colors hover:text-[var(--foreground)]"
      >
        <ChevronLeft className="h-3 w-3" aria-hidden="true" /> All cases
      </Link>

      <header className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="display animate-rise text-[2.5rem] leading-[1.02] sm:text-[3.25rem]">{c.rentalAddress}</h1>
          <p className="animate-slide-up delay-100 mt-3 font-mono text-xs text-[var(--muted)]">
            {c.landlordName} · out {formatLongDate(c.moveOutDate)} · {formatUsd(c.depositAmount)} deposit
          </p>
        </div>
        <ButtonLink href={`/dashboard/cases/${c.id}/edit`} variant="secondary" size="sm" className="shrink-0 self-start sm:self-auto">
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit facts
        </ButtonLink>
      </header>

      <div className="animate-slide-up delay-200 mt-10">
        <Tabs
          initial={c.letter ? "letter" : "ledger"}
          items={[
            {
              id: "ledger",
              label: "Ledger",
              content: <AssessmentCard assessment={assessment} moveOutDate={c.moveOutDate} />,
            },
            ...(owed
              ? [
                  {
                    id: "letter",
                    label: "Letter",
                    badge: c.letter ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-label="ready" />
                    ) : undefined,
                    content: letterTab,
                  },
                  { id: "next", label: "Next steps", content: nextStepsTab },
                ]
              : []),
          ]}
        />
      </div>

      <div className="mt-16 flex justify-end border-t border-[var(--border)] pt-6">
        <DeleteCaseButton caseId={c.id} />
      </div>
    </div>
  );
}
