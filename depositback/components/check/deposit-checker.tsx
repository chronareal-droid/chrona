"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { assessCase } from "@/lib/deposit-laws";
import { AssessmentCard } from "@/components/cases/assessment-card";
import { StateSelect } from "@/components/cases/state-select";

/**
 * Free deposit check: state, amounts, move-out date → deadline and what the
 * landlord may owe. Runs entirely in the browser; nothing is saved until the
 * renter opens a case.
 */
export function DepositChecker() {
  const [state, setState] = useState("");
  const [deposit, setDeposit] = useState("");
  const [returned, setReturned] = useState("");
  const [moveOut, setMoveOut] = useState("");
  const [itemized, setItemized] = useState(false);

  const depositNum = Number(deposit);
  const returnedNum = Number(returned || 0);

  const assessment = useMemo(() => {
    if (!state || !moveOut || !(depositNum > 0) || returnedNum < 0 || returnedNum > depositNum) return null;
    return assessCase({
      state,
      depositAmount: depositNum,
      amountReturned: returnedNum,
      moveOutDate: moveOut,
      itemizedListReceived: itemized,
    });
  }, [state, moveOut, depositNum, returnedNum, itemized]);

  const prefill = new URLSearchParams({
    state,
    deposit: String(depositNum || ""),
    returned: String(returnedNum || 0),
    moveOut,
    itemized: itemized ? "1" : "0",
  });
  const caseHref = `/dashboard/cases/new?${prefill.toString()}`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
        onSubmit={(e) => e.preventDefault()}
      >
        <Field label="State the rental is in" htmlFor="check-state">
          <StateSelect id="check-state" value={state} onChange={setState} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Deposit you paid" htmlFor="check-deposit">
            <MoneyInput id="check-deposit" value={deposit} onChange={setDeposit} placeholder="1500" />
          </Field>
          <Field label="Amount returned so far" htmlFor="check-returned">
            <MoneyInput id="check-returned" value={returned} onChange={setReturned} placeholder="0" />
          </Field>
        </div>
        {returnedNum > depositNum && depositNum > 0 && (
          <p className="text-xs text-red-600">The amount returned can&apos;t be more than the deposit.</p>
        )}
        <Field label="Move-out date" htmlFor="check-moveout">
          <input
            id="check-moveout"
            type="date"
            className="field"
            value={moveOut}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setMoveOut(e.target.value)}
          />
        </Field>
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
            checked={itemized}
            onChange={(e) => setItemized(e.target.checked)}
          />
          <span>
            My landlord sent a written, itemized list of deductions
            <span className="block text-xs text-[var(--muted)]">A list of what they charged for and how much.</span>
          </span>
        </label>
      </form>

      <div className="space-y-4">
        {assessment ? (
          <>
            <AssessmentCard assessment={assessment} />
            {assessment.status !== "returned" && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <h3 className="text-sm font-semibold">Ask for it back the right way</h3>
                <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                  Most landlords pay once they get a demand letter that cites the law and the penalty. Keepsit writes
                  yours in about two minutes.
                </p>
                <Link
                  href={caseHref}
                  className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80"
                >
                  Write my demand letter &rarr;
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
            <p className="max-w-xs text-sm text-[var(--muted)]">
              Fill in your details to see your state&apos;s deadline and what your landlord may owe you.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

export function MoneyInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">$</span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        className="field pl-6"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
