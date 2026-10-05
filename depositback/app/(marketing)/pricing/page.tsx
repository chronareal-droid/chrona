import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/landing/header";
import { PricingCards } from "@/components/landing/pricing-cards";
import { Footer } from "@/components/landing/footer";
import { getVisiblePlans } from "@/lib/config";

const FAQ = [
  {
    q: "Is it really a one-time payment?",
    a: "Yes. You pay once and the Recovery Kit stays unlocked for every case you open. No subscription.",
  },
  {
    q: "What if my landlord still doesn't pay?",
    a: "The letter gives your landlord a deadline. If it passes, your case page walks you through filing in small claims court, and the letter and certified mail receipt become your evidence.",
  },
  {
    q: "Is this legal advice?",
    a: "No. Keepsit is a self-help tool that puts your state's rules and your facts into a clear letter. For advice on your situation, contact a local tenant-rights organization, legal aid office or attorney.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Cards, Apple Pay and more through Whop, our payment provider.",
  },
];

export const metadata: Metadata = {
  title: "Pricing",
  description: "Check your deposit for free. Get the Recovery Kit once and use it for every case.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-24">
          <div className="text-center mb-12">
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Pricing
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Check for free. Pay once when you&apos;re ready to demand your money back.
            </p>
          </div>
          <Suspense fallback={<PricingCardsSkeleton />}>
            <PricingSection />
          </Suspense>
        </section>

        {/* FAQ */}
        <section className="border-t border-[var(--border)]">
          <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
            <h2 className="text-lg font-semibold text-center mb-10">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {FAQ.map((faq) => (
                <div key={faq.q}>
                  <h3 className="text-sm font-semibold">{faq.q}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)] leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

async function PricingSection() {
  const plans = await getVisiblePlans();
  return <PricingCards plans={plans} />;
}

function PricingCardsSkeleton() {
  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
        >
          <div className="h-4 w-16 rounded bg-[var(--surface)] animate-pulse" />
          <div className="mt-2 h-3 w-32 rounded bg-[var(--surface)] animate-pulse" />
          <div className="mt-6 h-8 w-20 rounded bg-[var(--surface)] animate-pulse" />
          <div className="mt-6 h-10 w-full rounded-lg bg-[var(--surface)] animate-pulse" />
          <div className="mt-6 space-y-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-3 w-full rounded bg-[var(--surface)] animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
