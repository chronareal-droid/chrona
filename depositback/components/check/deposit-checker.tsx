"use client";

import { useMemo, useState } from "react";
import { assessCase } from "@/lib/deposit-laws";
import { AssessmentCard } from "@/components/cases/assessment-card";
import { ButtonLink, Arrow } from "@/components/ui/button";
import { Field, MoneyInput, StateSelect } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";

/**
 * Free deposit check: a short worksheet on the left, a live ledger on the
 * right. Runs entirely in the browser; nothing is saved until the renter
 * opens a case.
 */
export function DepositChecker() {
  const [state, setState] = useState("");
  const [deposit, setDeposit] = useState("");
  const [returned, setReturned] = useState("");
  const [moveOut, setMoveOut] = useState("");
  const [itemized, setItemized] = useState(false);

  const depositNum = Number(deposit);
  const returnedNum = Number(returned || 0);
  const returnedTooHigh = depositNum > 0 && returnedNum > depositNum;

  const assessment = useMemo(() => {
    if (!state || !moveOut || !(depositNum > 0) || returnedNum < 0 || returnedTooHigh) return null;
    return assessCase({
      state,
      depositAmount: depositNum,
      amountReturned: returnedNum,
      moveOutDate: moveOut,
      itemizedListReceived: itemized,
    });
  }, [state, moveOut, depositNum, returnedNum, returnedTooHigh, itemized]);

  const filled = [state, deposit, moveOut].filter(Boolean).length;

  const prefill = new URLSearchParams({
    state,
    deposit: String(depositNum || ""),
    returned: String(returnedNum || 0),
    moveOut,
    itemized: itemized ? "1" : "0",
  });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()} aria-label="Deposit details">
        <div className="flex items-center gap-3">
          <span className="eyebrow">Worksheet</span>
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span className="figure text-[11px] text-[var(--muted)]">{filled}/3</span>
        </div>

        <Field label="Where was the rental?" htmlFor="check-state">
          <StateSelect id="check-state" value={state} onChange={setState} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Deposit paid" htmlFor="check-deposit">
            <MoneyInput id="check-deposit" value={deposit} onChange={setDeposit} placeholder="1,500" />
          </Field>
          <Field label="Returned so far" htmlFor="check-returned">
            <MoneyInput
              id="check-returned"
              value={returned}
              onChange={setReturned}
              placeholder="0"
              aria-invalid={returnedTooHigh}
            />
          </Field>
        </div>
        {returnedTooHigh && (
          <p className="-mt-3 text-xs text-[var(--stamp)]">That&apos;s more than the deposit. Double-check the numbers.</p>
        )}
        <Field label="Move-out date" htmlFor="check-moveout">
          <input
            id="check-moveout"
            type="date"
            className="field figure"
            value={moveOut}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setMoveOut(e.target.value)}
          />
        </Field>
        <div className="border-t border-[var(--border)] pt-5">
          <Toggle
            checked={itemized}
            onChange={setItemized}
            label="I got an itemized list of deductions"
            hint="A written list of what they charged for and how much."
          />
        </div>
      </form>

      <div className="lg:sticky lg:top-24 lg:self-start">
        {assessment ? (
          <div className="animate-scale-in space-y-5">
            <AssessmentCard assessment={assessment} moveOutDate={moveOut} />
            {assessment.status !== "returned" && (
              <div className="flex flex-col gap-4 rounded-2xl bg-[var(--foreground)] p-6 text-[var(--background)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="display text-2xl">Put it in writing.</p>
                  <p className="mt-1 max-w-sm text-sm opacity-70">
                    A demand letter citing {assessment.law.name} law, ready to mail in about two minutes.
                  </p>
                </div>
                <ButtonLink href={`/dashboard/cases/new?${prefill.toString()}`} size="lg" magnetic className="shrink-0">
                  Write my letter <Arrow />
                </ButtonLink>
              </div>
            )}
          </div>
        ) : (
          <EmptyLedger />
        )}
      </div>
    </div>
  );
}

/** Placeholder sheet: shows the shape of the answer before there is one. */
function EmptyLedger() {
  return (
    <div className="relative rounded-2xl border border-dashed border-[var(--border-strong)] p-6 sm:p-8">
      <p className="eyebrow">Your ledger</p>
      <p className="display mt-3 max-w-md text-[2.1rem] text-[var(--faint)] sm:text-[2.6rem]">
        Fill in three things. We&apos;ll do the math.
      </p>
      <div className="mt-8 grid grid-cols-2 border-t border-[var(--border)] pt-5">
        <div>
          <p className="eyebrow">Still owed</p>
          <p className="figure mt-1.5 text-[2rem] text-[var(--border-strong)]">$—</p>
        </div>
        <div className="border-l border-[var(--border)] pl-5">
          <p className="eyebrow">Recoverable up to</p>
          <p className="figure mt-1.5 text-[2rem] text-[var(--border-strong)]">$—</p>
        </div>
      </div>
      <div className="mt-8 flex h-7 items-end gap-[6px] overflow-hidden" aria-hidden="true">
        {Array.from({ length: 64 }, (_, i) => (
          <span
            key={i}
            className="w-px shrink-0 bg-[var(--border-strong)]"
            style={{ height: i % 7 === 0 ? "100%" : "40%" }}
          />
        ))}
      </div>
    </div>
  );
}
