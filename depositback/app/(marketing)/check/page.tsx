import type { Metadata } from "next";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { DepositChecker } from "@/components/check/deposit-checker";

export const metadata: Metadata = {
  title: "Free deposit check",
  description:
    "See your state's deadline for returning a security deposit and what your landlord may owe you if they missed it.",
};

export default function CheckPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <section className="mx-auto max-w-6xl px-5 pt-12 pb-24 sm:px-8 sm:pt-16">
          <div className="mb-12 max-w-3xl sm:mb-16">
            <p className="eyebrow animate-fade-in">Free deposit check</p>
            <h1 className="display animate-rise mt-4 text-[3rem] sm:text-[4.25rem]">
              Is your landlord <span className="italic text-[var(--accent)]">late?</span>
            </h1>
            <p className="animate-slide-up delay-200 mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--muted)]">
              Three answers and you&apos;ll see your state&apos;s deadline, how late they are, and what the law says
              they could owe you. Nothing is saved.
            </p>
          </div>
          <div className="animate-slide-up delay-300">
            <DepositChecker />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
