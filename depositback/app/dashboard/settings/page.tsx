import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getPlansConfig, getConfig } from "@/lib/config";
import { DEFAULT_PLAN } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { getUserCreatedAt } from "@/lib/subscription";
import { DeleteAccountButton } from "@/components/dashboard/delete-account-button";
import { ReactivateButton } from "@/components/dashboard/reactivate-button";
import { AccentColorPicker } from "@/components/dashboard/accent-color-picker";
import { IntegrationsSettings } from "@/components/dashboard/integrations-settings";
import { SyncPricesButton } from "@/components/dashboard/sync-prices-button";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  // Start session early so getUserCreatedAt can chain off it without
  // blocking the config reads that don't need session at all.
  const sessionPromise = requireSession();

  const [session, plans, createdAt, accentColor, analyticsProvider, analyticsId, emailProvider, emailApiKey, emailFromAddress] = await Promise.all([
    sessionPromise,
    getPlansConfig(),
    sessionPromise.then((s) => getUserCreatedAt(s.userId)),
    getConfig("accent_color"),
    getConfig("analytics_provider"),
    getConfig("analytics_id"),
    getConfig("email_provider"),
    getConfig("email_api_key"),
    getConfig("email_from_address"),
  ]);
  const planConfig = plans[session.plan] ?? plans[DEFAULT_PLAN];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="animate-slide-up">
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Manage your account.</p>
      </div>

      {/* Profile */}
      <section className="animate-slide-up delay-100 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="text-sm font-semibold">Profile</h2>
        <div className="mt-4 space-y-3">
          <Field label="Name" value={session.name ?? "\u2014"} />
          <Field label="Email" value={session.email ?? "\u2014"} />
          <Field
            label="Member since"
            value={createdAt ? formatDate(createdAt) : "\u2014"}
          />
        </div>
      </section>

      {/* Subscription */}
      <section className="animate-slide-up delay-200 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="text-sm font-semibold">Subscription</h2>
        <div className="mt-4 space-y-3">
          <Field label="Current plan" value={planConfig.name} />
          <Field
            label="Features"
            value={planConfig.features.slice(0, 3).join(", ")}
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          {session.plan === DEFAULT_PLAN ? (
            <Link
              href="/pricing"
              className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80"
            >
              Upgrade Plan
            </Link>
          ) : session.cancelAtPeriodEnd ? (
            <ReactivateButton />
          ) : (
            <Link
              href="/pricing"
              className="rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface)]"
            >
              Change Plan
            </Link>
          )}
        </div>
      </section>

      {/* Branding (admin only) */}
      {session.isAdmin && (
        <section className="animate-slide-up delay-300 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-semibold">Branding</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Customize the accent color used across your app.
          </p>
          <div className="mt-4">
            <AccentColorPicker currentColor={accentColor} />
          </div>
        </section>
      )}

      {/* Integrations (admin only) */}
      {session.isAdmin && (
        <section className="animate-slide-up delay-400 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-semibold">Integrations</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Connect analytics, error tracking, and email services.
          </p>
          <div className="mt-4">
            <IntegrationsSettings
              initialData={{
                analytics_provider: analyticsProvider,
                analytics_id: analyticsId,
                email_provider: emailProvider,
                email_api_key: emailApiKey,
                email_from_address: emailFromAddress,
              }}
            />
          </div>
        </section>
      )}

      {/* Pricing sync (admin only) */}
      {session.isAdmin && (
        <section className="animate-slide-up delay-500 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-semibold">Pricing</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Prices are synced from Whop when you configure plan IDs.
            If you change prices in your Whop dashboard, use this to update them here.
          </p>
          <div className="mt-4">
            <SyncPricesButton />
          </div>
        </section>
      )}

      {/* Danger zone */}
      <section className="animate-slide-up delay-500 rounded-xl border border-red-200 dark:border-red-900/30 bg-[var(--card)] p-5">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">
          Danger Zone
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Permanently delete your account and all associated data.
        </p>
        <DeleteAccountButton />
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
