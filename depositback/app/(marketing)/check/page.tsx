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
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="mb-10 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Is your landlord holding your deposit too long?
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--muted)]">
              Free, no sign-up. See your state&apos;s deadline and what the law says your landlord may owe you.
            </p>
          </div>
          <DepositChecker />
        </section>
      </main>
      <Footer />
    </div>
  );
}
