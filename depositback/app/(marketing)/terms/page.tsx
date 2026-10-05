import type { Metadata } from "next";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-24">
          <h1 className="text-2xl font-semibold tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-[var(--muted)]">
            <section>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                1. Acceptance of Terms
              </h2>
              <p className="mt-2">
                By accessing or using {APP_NAME}, you agree to be bound by these
                Terms of Service. If you do not agree, do not use the service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                2. Description of Service
              </h2>
              <p className="mt-2">
                {APP_NAME} provides a software-as-a-service platform. We reserve
                the right to modify, suspend, or discontinue any part of the
                service at any time.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                3. Accounts
              </h2>
              <p className="mt-2">
                You are responsible for maintaining the security of your account.
                You must not share your credentials or allow others to access
                your account.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                4. Payment & Billing
              </h2>
              <p className="mt-2">
                Paid plans are billed in advance on a recurring basis.
                You may cancel at any time — your access continues until the
                end of the billing period.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                5. Limitation of Liability
              </h2>
              <p className="mt-2">
                The service is provided &ldquo;as is&rdquo; without warranties
                of any kind. We are not liable for any damages arising from your
                use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                6. Changes to Terms
              </h2>
              <p className="mt-2">
                We may update these terms from time to time. Continued use of the
                service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-xs">
              <p className="font-medium text-[var(--foreground)]">
                Placeholder notice
              </p>
              <p className="mt-1">
                These are starter terms. Replace them with terms reviewed by a
                legal professional before launching your product.
              </p>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
