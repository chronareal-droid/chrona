import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 animate-slide-up">
        <div className="min-w-0">
          <Link href="/dashboard/cases" className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
            &larr; My cases
          </Link>
          <h1 className="mt-1 truncate text-lg font-semibold tracking-tight">{c.rentalAddress}</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {c.landlordName} · moved out {formatLongDate(c.moveOutDate)} · {formatUsd(c.depositAmount)} deposit
          </p>
        </div>
        <Link
          href={`/dashboard/cases/${c.id}/edit`}
          className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface)]"
        >
          Edit details
        </Link>
      </div>

      <div className="animate-slide-up delay-100">
        <AssessmentCard assessment={assessment} />
      </div>

      {owed && (
        <div className="animate-slide-up delay-200">
          <PlanGate
            plan={session.plan}
            minimum={FIRST_PAID_PLAN}
            fallback={
              <div className="rounded-xl border border-[var(--accent)] bg-[var(--card)] p-5">
                <h2 className="text-sm font-semibold">Get your demand letter</h2>
                <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                  The {PLAN_METADATA[FIRST_PAID_PLAN].name} writes a letter that cites {assessment.law.name} law, the
                  deadline your landlord missed, and the penalty they risk, and argues against each deduction. Pay
                  once, use it for every case.
                </p>
                <Link
                  href="/pricing"
                  className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80"
                >
                  Unlock the Recovery Kit
                </Link>
              </div>
            }
          >
            <LetterPanel caseId={c.id} letter={c.letter} generatedAt={c.letterGeneratedAt} />
          </PlanGate>
        </div>
      )}

      {owed && (
        <div className="animate-slide-up delay-300 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-semibold">What to do next</h2>
          <ol className="mt-4 space-y-3">
            <Step n={1} title="Send the letter by certified mail with return receipt">
              Keep the receipt and a copy of the letter. It proves when your landlord got it. Email a copy too if you
              usually talk by email.
            </Step>
            <Step n={2} title={`Wait ${RESPONSE_DAYS} days`}>
              Many landlords pay once they see the statute and the penalty in writing.
            </Step>
            <Step n={3} title="If they don't pay, file in small claims court">
              File in the county where the rental is. Filing fees are usually modest and you don&apos;t need a lawyer.
              Bring your lease, move-out photos, this letter, the certified mail receipt, and any messages with your
              landlord. Search &ldquo;{assessment.law.name} small claims court&rdquo; for your court&apos;s forms and
              fees.
            </Step>
            <Step n={4} title="Get free help if you need it">
              Local tenant-rights groups and legal aid offices can review your case for free.
            </Step>
          </ol>
        </div>
      )}

      <div className="flex justify-end">
        <DeleteCaseButton caseId={c.id} />
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--surface)] text-xs font-medium text-[var(--muted)]">
        {n}
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-[var(--muted)] leading-relaxed">{children}</p>
      </div>
    </li>
  );
}
