"use client";

import { useState } from "react";
import { assessCase } from "@/lib/deposit-laws";
import { AssessmentCard } from "@/components/cases/assessment-card";

const DAY_MS = 86_400_000;

/**
 * "Exhibit A": a real ledger for a sample California renter, dated relative to
 * today so the example is always a live, overdue case.
 */
export function Exhibit() {
  // Lazy initial state: computed once on mount, stable across re-renders.
  const [{ assessment, moveOut }] = useState(() => {
    const moveOut = new Date(Date.now() - 52 * DAY_MS).toISOString().slice(0, 10);
    return {
      moveOut,
      assessment: assessCase({
        state: "CA",
        depositAmount: 2400,
        amountReturned: 600,
        moveOutDate: moveOut,
        itemizedListReceived: false,
      }),
    };
  });

  if (!assessment) return null;

  return (
    <figure className="animate-scale-in delay-300 relative mx-auto max-w-md lg:max-w-none">
      <figcaption className="eyebrow mb-3 flex items-center justify-between">
        <span>Exhibit A</span>
        <span className="!tracking-normal normal-case">Sample · Los Angeles, CA</span>
      </figcaption>
      <div className="relative lg:rotate-[1.2deg] lg:transition-transform lg:duration-700 lg:ease-[var(--ease-out-quint)] lg:hover:rotate-0">
        {/* A second sheet peeking out underneath */}
        <div
          aria-hidden="true"
          className="absolute inset-0 translate-x-2 translate-y-2 -rotate-[2.5deg] rounded-2xl border border-[var(--border)] bg-[var(--card)] opacity-70"
        />
        <AssessmentCard assessment={assessment} moveOutDate={moveOut} compact className="relative" />
      </div>
    </figure>
  );
}
