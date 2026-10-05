import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { getDepositLaw } from "@/lib/deposit-laws";
import { CaseForm } from "@/components/cases/case-form";
import { EMPTY_CASE, type CaseFormValues } from "@/lib/case-form-values";

export const metadata: Metadata = {
  title: "New case",
};

/** Accepts prefill from the free check: ?state=TX&deposit=1500&returned=0&moveOut=2026-08-01&itemized=0 */
export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSession();
  const q = await searchParams;

  const initial: CaseFormValues = {
    ...EMPTY_CASE,
    state: q.state && getDepositLaw(q.state) ? q.state.toUpperCase() : "",
    depositAmount: q.deposit && Number(q.deposit) > 0 ? q.deposit : "",
    amountReturned: q.returned && Number(q.returned) > 0 ? q.returned : "",
    moveOutDate: q.moveOut && /^\d{4}-\d{2}-\d{2}$/.test(q.moveOut) ? q.moveOut : "",
    itemizedListReceived: q.itemized === "1",
    tenantName: session.name ?? "",
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-12 max-w-2xl">
        <p className="eyebrow animate-fade-in">New case</p>
        <h1 className="display animate-rise mt-3 text-[2.75rem] sm:text-[3.5rem]">
          Let&apos;s get it <span className="italic text-[var(--accent)]">back.</span>
        </h1>
        <p className="animate-slide-up delay-200 mt-3 text-[0.9375rem] text-[var(--muted)]">
          About two minutes. You can change anything later.
        </p>
      </header>
      <div className="animate-slide-up delay-300">
        <CaseForm initial={initial} />
      </div>
    </div>
  );
}
