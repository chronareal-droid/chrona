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
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-20 sm:px-8 sm:pt-20">
          <p className="eyebrow animate-fade-in">Pricing</p>
          <h1 className="display animate-rise mt-4 max-w-3xl text-[3.2rem] sm:text-[4.5rem]">
            Free to check. <span className="italic text-[var(--muted)]">$29 to fight back.</span>
          </h1>
          <div className="animate-slide-up delay-200 mt-14">
            <Suspense fallback={<div className="skeleton h-96 w-full rounded-2xl" />}>
              <PricingSection />
            </Suspense>
          </div>
        </section>

        <section className="border-t border-[var(--border)]">
          <dl className="mx-auto grid max-w-6xl gap-x-16 gap-y-10 px-5 py-20 sm:px-8 md:grid-cols-2">
            {FAQ.map((faq) => (
              <div key={faq.q}>
                <dt className="text-[1.0625rem] font-medium">{faq.q}</dt>
                <dd className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--muted)]">{faq.a}</dd>
              </div>
            ))}
          </dl>
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
