"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { assessCase } from "@/lib/deposit-laws";
import type { Deduction } from "@/lib/letter";
import { AssessmentCard } from "@/components/cases/assessment-card";
import { StateSelect } from "@/components/cases/state-select";
import { MoneyInput } from "@/components/check/deposit-checker";
import type { CaseFormValues } from "@/lib/case-form-values";

/** Create (no caseId) or edit (caseId) a deposit case. */
export function CaseForm({ initial, caseId }: { initial: CaseFormValues; caseId?: string }) {
  const router = useRouter();
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
        body: JSON.stringify({
          ...values,
          depositAmount: deposit,
          amountReturned: returned,
          deductions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      router.push(`/dashboard/cases/${data.case.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Section title="The deposit" description="The basics we need to check your state's rules.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="State the rental is in" htmlFor="state">
            <StateSelect id="state" value={values.state} onChange={(v) => set("state", v)} />
          </Field>
          <Field label="Move-out date" htmlFor="moveOutDate">
            <input
              id="moveOutDate"
              type="date"
              className="field"
              required
              value={values.moveOutDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => set("moveOutDate", e.target.value)}
            />
          </Field>
          <Field label="Deposit you paid" htmlFor="depositAmount">
            <MoneyInput id="depositAmount" value={values.depositAmount} onChange={(v) => set("depositAmount", v)} />
          </Field>
          <Field label="Amount returned so far" htmlFor="amountReturned">
            <MoneyInput id="amountReturned" value={values.amountReturned} onChange={(v) => set("amountReturned", v)} placeholder="0" />
          </Field>
        </div>
        <div className="mt-4 space-y-3">
          <Checkbox
            checked={values.itemizedListReceived}
            onChange={(v) => set("itemizedListReceived", v)}
            label="My landlord sent a written, itemized list of deductions"
          />
          <Checkbox
            checked={values.forwardingAddressSent}
            onChange={(v) => set("forwardingAddressSent", v)}
            label="I gave my landlord my new address in writing"
            hint="Some states (like Texas, Ohio and Pennsylvania) only start the clock once you do."
          />
        </div>
      </Section>

      {assessment && <AssessmentCard assessment={assessment} compact />}

      <Section title="Who and where" description="Printed on the letter exactly as you type it.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your full name" htmlFor="tenantName">
            <input id="tenantName" className="field" required value={values.tenantName} onChange={(e) => set("tenantName", e.target.value)} />
          </Field>
          <Field label="Landlord or property manager" htmlFor="landlordName">
            <input id="landlordName" className="field" required value={values.landlordName} onChange={(e) => set("landlordName", e.target.value)} />
          </Field>
          <Field label="Your current mailing address" htmlFor="tenantAddress">
            <textarea id="tenantAddress" rows={3} className="field" required value={values.tenantAddress} onChange={(e) => set("tenantAddress", e.target.value)} />
          </Field>
          <Field label="Landlord's mailing address" htmlFor="landlordAddress">
            <textarea id="landlordAddress" rows={3} className="field" required value={values.landlordAddress} onChange={(e) => set("landlordAddress", e.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Rental address (the place you moved out of)" htmlFor="rentalAddress">
            <input id="rentalAddress" className="field" required value={values.rentalAddress} onChange={(e) => set("rentalAddress", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section
        title="What they charged you for"
        description="Add each deduction your landlord took and why it's wrong. Leave this empty if they kept money without saying why."
      >
        <div className="space-y-3">
          {values.deductions.map((d, i) => (
            <div key={i} className="rounded-lg border border-[var(--border)] p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                <input
                  aria-label={`Deduction ${i + 1} reason`}
                  className="field"
                  placeholder="e.g. Carpet cleaning"
                  required
                  value={d.reason}
                  onChange={(e) => setDeduction(i, { reason: e.target.value })}
                />
                <MoneyInput value={d.amount} onChange={(v) => setDeduction(i, { amount: v })} placeholder="250" />
              </div>
              <textarea
                aria-label={`Deduction ${i + 1} dispute`}
                rows={2}
                className="field mt-3"
                placeholder="Why it's wrong, e.g. the carpet was 8 years old and only had normal wear"
                value={d.dispute}
                onChange={(e) => setDeduction(i, { dispute: e.target.value })}
              />
              <button
                type="button"
                onClick={() => set("deductions", values.deductions.filter((_, j) => j !== i))}
                className="mt-2 text-xs text-[var(--muted)] hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set("deductions", [...values.deductions, { reason: "", amount: "", dispute: "" }])}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface)]"
          >
            + Add a deduction
          </button>
          {values.deductions.length > 0 && withheld > 0 && Math.abs(deductionTotal - withheld) > 0.009 && (
            <p className="text-xs text-amber-600">
              Your deductions add up to ${deductionTotal.toFixed(2)}, but ${withheld.toFixed(2)} is still missing.
              That&apos;s fine. Just make sure the numbers match what your landlord told you.
            </p>
          )}
        </div>
      </Section>

      <Section title="What happened" description="In your own words: how you left the place, photos you took, anything the landlord said. Optional, but it makes the letter stronger.">
        <textarea
          id="story"
          rows={6}
          className="field"
          placeholder="I deep-cleaned the apartment before leaving and took photos of every room on move-out day. The landlord didn't do a walkthrough with me…"
          value={values.story}
          onChange={(e) => set("story", e.target.value)}
        />
      </Section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {saving ? "Saving…" : caseId ? "Save changes" : "Save my case"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg px-4 py-2.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-0.5 mb-4 text-xs text-[var(--muted)]">{description}</p>
      {children}
    </section>
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

function Checkbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {label}
        {hint && <span className="block text-xs text-[var(--muted)]">{hint}</span>}
      </span>
    </label>
  );
}
