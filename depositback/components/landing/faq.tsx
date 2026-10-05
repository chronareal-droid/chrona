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
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="border-t border-[var(--border)]">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:py-32">
        <div className="lg:col-span-4">
          <p className="eyebrow">Questions</p>
          <h2 className="display mt-4 text-5xl sm:text-6xl">
            You have more rights <span className="italic text-[var(--muted)]">than you think.</span>
          </h2>
        </div>

        <div className="lg:col-span-8">
          {faqs.map((faq, i) => {
            const open = openIndex === i;
            return (
              <div key={faq.question} className="border-b border-[var(--border)] first:border-t">
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="group flex w-full cursor-pointer items-center justify-between gap-6 py-6 text-left"
                  aria-expanded={open}
                >
                  <span className="text-[1.0625rem] font-medium transition-colors group-hover:text-[var(--accent)]">
                    {faq.question}
                  </span>
                  <span
                    className={cn(
                      "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] transition-[transform,background-color,border-color] duration-300 ease-[var(--ease-out-quint)]",
                      open && "rotate-45 border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]",
                    )}
                    aria-hidden="true"
                  >
                    <span className="absolute h-px w-3 bg-current" />
                    <span className="absolute h-3 w-px bg-current" />
                  </span>
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-out-quint)]",
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-2xl pb-6 text-[0.9375rem] leading-relaxed text-[var(--muted)]">{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
