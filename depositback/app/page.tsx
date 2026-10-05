import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isSetupComplete, getVisiblePlans } from "@/lib/config";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { StateTicker } from "@/components/landing/state-ticker";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SampleLetter } from "@/components/landing/sample-letter";
import { Stats } from "@/components/landing/stats";
import { PricingCards } from "@/components/landing/pricing-cards";
import { FAQ } from "@/components/landing/faq";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${APP_NAME} | ${APP_DESCRIPTION}`,
  description: APP_DESCRIPTION,
  openGraph: {
    title: `${APP_NAME} | ${APP_DESCRIPTION}`,
    description: APP_DESCRIPTION,
  },
};

export default async function HomePage() {
  const setupDone = await isSetupComplete();
  if (!setupDone) {
    redirect("/setup");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <Hero />
        <StateTicker />
        <HowItWorks />
        <SampleLetter />
        <Stats />

        <section id="pricing" className="scroll-mt-20 border-t border-[var(--border)]">
          <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-32">
            <div className="mb-14 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <p className="eyebrow">Pricing</p>
                <h2 className="display mt-4 text-5xl sm:text-6xl">
                  Check for free. <span className="italic text-[var(--muted)]">Pay once to get it back.</span>
                </h2>
              </div>
              <p className="self-end text-[0.9375rem] leading-relaxed text-[var(--muted)] lg:col-span-4 lg:col-start-9">
                No subscription. One Recovery Kit covers every deposit you&apos;re owed, now and the next time you move.
              </p>
            </div>
            <Suspense fallback={<div className="skeleton h-80 w-full rounded-2xl" />}>
              <PricingSection />
            </Suspense>
          </div>
        </section>

        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

async function PricingSection() {
  const plans = await getVisiblePlans();
  return <PricingCards plans={plans} />;
}
