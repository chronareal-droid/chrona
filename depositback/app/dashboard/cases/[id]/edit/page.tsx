import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/db";
import { toCaseRecord } from "@/lib/cases";
import { CaseForm } from "@/components/cases/case-form";
import type { CaseFormValues } from "@/lib/case-form-values";

export const metadata: Metadata = {
  title: "Edit case",
};

export default async function EditCasePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const row = await prisma.depositCase.findFirst({ where: { id, userId: session.userId } });
  if (!row) notFound();
  const c = toCaseRecord(row);

  const initial: CaseFormValues = {
    ...c,
    depositAmount: String(c.depositAmount),
    amountReturned: c.amountReturned ? String(c.amountReturned) : "",
    deductions: c.deductions.map((d) => ({ ...d, amount: String(d.amount) })),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="animate-slide-up">
        <h1 className="text-lg font-semibold tracking-tight">Edit case</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">
          Saving changes clears your current letter so you can generate a fresh one.
        </p>
      </div>
      <div className="animate-slide-up delay-100">
        <CaseForm initial={initial} caseId={c.id} />
      </div>
    </div>
  );
}
