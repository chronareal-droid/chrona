"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Questions renters ask before they trust a tool with their deposit dispute. */
const faqs = [
  {
    question: "How long does my landlord have to return my deposit?",
    answer:
      "It depends on your state: anywhere from 14 to 60 days after you move out. Some states start the clock only once you give your new address in writing. The free check shows your exact deadline.",
  },
  {
    question: "Can my landlord charge for normal wear and tear?",
    answer:
      "Generally no. Faded paint, worn carpet, small nail holes and similar aging from normal use usually can't be deducted. Damage beyond normal use can be. Your letter argues each deduction using your own explanation.",
  },
  {
    question: "Does a demand letter actually work?",
    answer:
      "A letter that cites the statute and the penalty shows your landlord you know your rights and are ready to go to small claims. That's often enough to get paid. If not, the letter and certified mail receipt become evidence for your claim.",
  },
  {
    question: "Is Keepsit a law firm?",
    answer:
      "No. Keepsit is a self-help document tool and doesn't give legal advice. We put your state's rules and your facts into a clear letter. For advice on your situation, contact a tenant-rights organization, legal aid office or attorney.",
  },
  {
    question: "What does it cost?",
    answer:
      "The deposit check is free and doesn't need an account. The Recovery Kit, which includes the demand letter and small claims steps, is a one-time payment that covers every case you open.",
  },
  {
    question: "Is my information private?",
    answer:
      "Your case details are only used to write your letter. We don't sell your data or contact your landlord for you.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section>
      <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-sm text-[var(--muted)]">
            The short version: you probably have more rights than you think.
          </p>
        </div>

        <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left transition-colors hover:text-[var(--foreground)]"
                aria-expanded={openIndex === i}
              >
                <span className="text-sm font-medium">{faq.question}</span>
                <svg
                  className={cn(
                    "h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-200",
                    openIndex === i && "rotate-45"
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200",
                  openIndex === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <p className="pb-5 text-sm text-[var(--muted)] leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
