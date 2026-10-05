import type { Metadata } from "next";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-24">
          <h1 className="text-2xl font-semibold tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-[var(--muted)]">
            <section>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                1. Information We Collect
              </h2>
              <p className="mt-2">
                When you sign in with Whop, we receive your name, email address,
                and profile picture. We also store your subscription plan and
                billing status.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                2. How We Use Your Information
              </h2>
              <p className="mt-2">
                We use your information to provide and improve {APP_NAME},
                manage your subscription, send transactional emails (welcome
                messages, payment notifications), and display your profile in the
                dashboard.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                3. Third-Party Services
              </h2>
              <p className="mt-2">
                We use Whop for authentication and payment processing. Your
                payment information is handled entirely by Whop — we do not
                store credit card details. We may use analytics services
                (PostHog, Google Analytics, or Plausible) to understand usage
                patterns.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                4. Data Storage
              </h2>
              <p className="mt-2">
                Your data is stored in a PostgreSQL database. Sessions are
                stored as encrypted JWT cookies in your browser with a 7-day
                expiry.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                5. Your Rights
              </h2>
              <p className="mt-2">
                You can delete your account and all associated data at any time
                from Dashboard → Settings → Danger Zone. This action is
                permanent and cannot be undone.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                6. Changes to This Policy
              </h2>
              <p className="mt-2">
                We may update this policy from time to time. Changes will be
                posted on this page with an updated date.
              </p>
            </section>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-xs">
              <p className="font-medium text-[var(--foreground)]">
                Placeholder notice
              </p>
              <p className="mt-1">
                This is a starter privacy policy. Replace it with a policy
                reviewed by a legal professional before launching your product.
              </p>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
