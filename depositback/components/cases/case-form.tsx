"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { assessCase, formatUsd } from "@/lib/deposit-laws";
import type { Deduction } from "@/lib/letter";
import type { CaseFormValues } from "@/lib/case-form-values";
import { AssessmentCard } from "@/components/cases/assessment-card";
import { Button, Arrow, Spinner } from "@/components/ui/button";
import { Field, MoneyInput, StateSelect } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

/** Create (no caseId) or edit (caseId) a deposit case. */
export function CaseForm({ initial, caseId }: { initial: CaseFormValues; caseId?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<CaseFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CaseFormValues>(key: K, value: CaseFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setDeduction(index: number, patch: Partial<CaseFormValues["deductions"][number]>) {
    setValues((v) => ({
      ...v,
      deductions: v.deductions.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    }));
  }

  const deposit = Number(values.depositAmount);
  const returned = Number(values.amountReturned || 0);
  const returnedTooHigh = deposit > 0 && returned > deposit;
  const assessment = useMemo(() => {
    if (!values.state || !values.moveOutDate || !(deposit > 0) || returned > deposit) return null;
    return assessCase({
      state: values.state,
      depositAmount: deposit,
      amountReturned: returned,
      moveOutDate: values.moveOutDate,
      itemizedListReceived: values.itemizedListReceived,
    });
  }, [values.state, values.moveOutDate, values.itemizedListReceived, deposit, returned]);

  const deductionTotal = values.deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const withheld = Math.max(0, deposit - returned);
  const mismatch = values.deductions.length > 0 && withheld > 0 && Math.abs(deductionTotal - withheld) > 0.009;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const deductions: Deduction[] = values.deductions.map((d) => ({
      reason: d.reason,
      amount: Number(d.amount) || 0,
      dispute: d.dispute,
    }));

    try {
      const res = await fetch(caseId ? `/api/cases/${caseId}` : "/api/cases", {
        method: caseId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, depositAmount: deposit, amountReturned: returned, deductions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      toast(caseId ? "Case updated" : "Case saved. Now let's write your letter.", "success");
      router.push(`/dashboard/cases/${data.case.id}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast(message, "error");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-14">
      <div className="min-w-0">
        <Section n="01" title="The deposit" description="What you paid, what came back, and when you left.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="State" htmlFor="state">
              <StateSelect id="state" value={values.state} onChange={(v) => set("state", v)} />
            </Field>
            <Field label="Move-out date" htmlFor="moveOutDate">
              <input
                id="moveOutDate"
                type="date"
                className="field figure"
                required
                value={values.moveOutDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set("moveOutDate", e.target.value)}
              />
            </Field>
            <Field label="Deposit paid" htmlFor="depositAmount">
              <MoneyInput id="depositAmount" value={values.depositAmount} onChange={(v) => set("depositAmount", v)} placeholder="1,500" required />
            </Field>
            <Field label="Returned so far" htmlFor="amountReturned">
              <MoneyInput
                id="amountReturned"
                value={values.amountReturned}
                onChange={(v) => set("amountReturned", v)}
                placeholder="0"
                aria-invalid={returnedTooHigh}
              />
            </Field>
          </div>
          {returnedTooHigh && <p className="mt-2 text-xs text-[var(--stamp)]">That&apos;s more than the deposit.</p>}
          <div className="mt-7 space-y-5 border-t border-[var(--border)] pt-6">
            <Toggle
              checked={values.itemizedListReceived}
              onChange={(v) => set("itemizedListReceived", v)}
              label="My landlord sent an itemized list of deductions"
            />
            <Toggle
              checked={values.forwardingAddressSent}
              onChange={(v) => set("forwardingAddressSent", v)}
              label="I gave my landlord my new address in writing"
              hint="In some states, like Texas, Ohio and Pennsylvania, the clock only starts once you do."
            />
          </div>
        </Section>

        {assessment && (
          <div className="mb-12 xl:hidden">
            <AssessmentCard assessment={assessment} moveOutDate={values.moveOutDate} compact />
          </div>
        )}

        <Section n="02" title="Who and where" description="Printed on the letter exactly as you type it.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Your full name" htmlFor="tenantName">
              <input id="tenantName" className="field" required autoComplete="name" value={values.tenantName} onChange={(e) => set("tenantName", e.target.value)} />
            </Field>
            <Field label="Landlord or manager" htmlFor="landlordName">
              <input id="landlordName" className="field" required value={values.landlordName} onChange={(e) => set("landlordName", e.target.value)} />
            </Field>
            <Field label="Your mailing address" htmlFor="tenantAddress" hint="Where they should send your money.">
              <textarea id="tenantAddress" rows={3} className="field" required autoComplete="street-address" value={values.tenantAddress} onChange={(e) => set("tenantAddress", e.target.value)} />
            </Field>
            <Field label="Landlord's address" htmlFor="landlordAddress">
              <textarea id="landlordAddress" rows={3} className="field" required value={values.landlordAddress} onChange={(e) => set("landlordAddress", e.target.value)} />
            </Field>
            <Field label="Rental address" htmlFor="rentalAddress" className="sm:col-span-2">
              <input id="rentalAddress" className="field" required placeholder="412 Elm Street, Unit 3B, Austin, TX" value={values.rentalAddress} onChange={(e) => set("rentalAddress", e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section
          n="03"
          title="What they charged you for"
          description="Each deduction and why it's wrong. Skip this if they kept money without saying why."
        >
          {values.deductions.length > 0 && (
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {values.deductions.map((d, i) => (
                <li key={i} className="animate-slide-up grid gap-3 py-5 sm:grid-cols-[1.75rem_minmax(0,1fr)_9rem_2rem] sm:items-start">
                  <span className="figure hidden pt-3 text-xs text-[var(--faint)] sm:block">{String(i + 1).padStart(2, "0")}</span>
                  <div className="space-y-3">
                    <input
                      aria-label={`Deduction ${i + 1}: what they charged for`}
                      className="field"
                      placeholder="Carpet cleaning"
                      required
                      value={d.reason}
                      onChange={(e) => setDeduction(i, { reason: e.target.value })}
                    />
                    <textarea
                      aria-label={`Deduction ${i + 1}: why it's wrong`}
                      rows={2}
                      className="field"
                      placeholder="Why it's wrong. e.g. the carpet was 8 years old with normal wear"
                      value={d.dispute}
                      onChange={(e) => setDeduction(i, { dispute: e.target.value })}
                    />
                  </div>
                  <MoneyInput
                    aria-label={`Deduction ${i + 1} amount`}
                    value={d.amount}
                    onChange={(v) => setDeduction(i, { amount: v })}
                    placeholder="250"
                  />
                  <button
                    type="button"
                    onClick={() => set("deductions", values.deductions.filter((_, j) => j !== i))}
                    className="flex h-11 w-8 items-center justify-center justify-self-end rounded-lg text-[var(--faint)] transition-colors hover:bg-[var(--stamp-soft)] hover:text-[var(--stamp)]"
                    aria-label={`Remove deduction ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => set("deductions", [...values.deductions, { reason: "", amount: "", dispute: "" }])}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add a deduction
            </Button>
            {values.deductions.length > 0 && (
              <p className={cn("figure text-xs", mismatch ? "text-[var(--caution)]" : "text-[var(--muted)]")}>
                Total {formatUsd(deductionTotal)}
                {mismatch && ` · ${formatUsd(withheld)} withheld`}
              </p>
            )}
          </div>
        </Section>

        <Section
          n="04"
          title="What happened"
          description="In your own words. How you left the place, photos you took, what the landlord said. Optional, but it makes the letter stronger."
          last
        >
          <textarea
            id="story"
            aria-label="What happened"
            rows={6}
            className="field"
            placeholder="I deep-cleaned the apartment before leaving and took photos of every room on move-out day. Nobody did a walkthrough with me…"
            value={values.story}
            onChange={(e) => set("story", e.target.value)}
          />
        </Section>

        {error && (
          <p role="alert" className="mt-6 rounded-xl border border-[var(--stamp)]/30 bg-[var(--stamp-soft)] px-4 py-3 text-sm text-[var(--stamp)]">
            {error}
          </p>
        )}

        <div className="sticky bottom-0 z-10 -mx-5 mt-10 flex items-center gap-3 border-t border-[var(--border)] bg-[var(--background)]/90 px-5 py-4 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none md:ml-[4.5rem]">
          <Button type="submit" size="lg" disabled={saving} magnetic>
            {saving ? (
              <>
                <Spinner /> Saving
              </>
            ) : (
              <>
                {caseId ? "Save changes" : "Save and continue"} <Arrow />
              </>
            )}
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-24">
          {assessment ? (
            <AssessmentCard assessment={assessment} moveOutDate={values.moveOutDate} compact />
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-6">
              <p className="eyebrow">Live ledger</p>
              <p className="display mt-3 text-[1.75rem] text-[var(--faint)]">
                Fill in section 01 to see where you stand.
              </p>
            </div>
          )}
        </div>
      </aside>
    </form>
  );
}

function Section({
  n,
  title,
  description,
  last,
  children,
}: {
  n: string;
  title: string;
  description: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("grid gap-6 md:grid-cols-[3rem_minmax(0,1fr)]", !last && "mb-14")}>
      <span className="figure hidden pt-1.5 text-sm text-[var(--faint)] md:block">{n}</span>
      <div className="min-w-0">
        <h2 className="display text-[2rem]">
          <span className="figure mr-3 text-sm text-[var(--faint)] md:hidden">{n}</span>
          {title}
        </h2>
        <p className="mt-1 mb-6 max-w-lg text-sm leading-relaxed text-[var(--muted)]">{description}</p>
        {children}
      </div>
    </section>
  );
}
