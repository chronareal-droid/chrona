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
    <div className="mx-auto max-w-6xl">
      <header className="mb-12 max-w-2xl">
        <p className="eyebrow animate-fade-in">Edit case</p>
        <h1 className="display animate-rise mt-3 truncate text-[2.75rem] sm:text-[3.5rem]">{c.rentalAddress}</h1>
        <p className="animate-slide-up delay-200 mt-3 text-[0.9375rem] text-[var(--muted)]">
          Saving clears your current letter so you can write a fresh one with the new facts.
        </p>
      </header>
      <div className="animate-slide-up delay-300">
        <CaseForm initial={initial} caseId={c.id} />
      </div>
    </div>
  );
}
