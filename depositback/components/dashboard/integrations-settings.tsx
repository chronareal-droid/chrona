"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

interface IntegrationsData {
  analytics_provider: string | null;
  analytics_id: string | null;
  email_provider: string | null;
  email_api_key: string | null;
  email_from_address: string | null;
}

const ANALYTICS_OPTIONS = [
  { value: "", label: "None" },
  { value: "posthog", label: "PostHog" },
  { value: "google", label: "Google Analytics" },
  { value: "plausible", label: "Plausible" },
];

const EMAIL_OPTIONS = [
  { value: "", label: "None" },
  { value: "resend", label: "Resend" },
  { value: "sendgrid", label: "SendGrid" },
];

export function IntegrationsSettings({ initialData }: { initialData: IntegrationsData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [analyticsProvider, setAnalyticsProvider] = useState(initialData.analytics_provider ?? "");
  const [analyticsId, setAnalyticsId] = useState(initialData.analytics_id ?? "");
  const [emailProvider, setEmailProvider] = useState(initialData.email_provider ?? "");
  const [emailApiKey, setEmailApiKey] = useState(initialData.email_api_key ?? "");
  const [emailFromAddress, setEmailFromAddress] = useState(initialData.email_from_address ?? "");

  function handleSave() {
    startTransition(async () => {
      const res = await fetch("/api/config/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analytics_provider: analyticsProvider,
          analytics_id: analyticsId,
          email_provider: emailProvider,
          email_api_key: emailApiKey,
          email_from_address: emailFromAddress,
        }),
      });

      if (res.ok) {
        toast("Integrations saved", "success");
        router.refresh();
      } else {
        toast("Failed to save integrations", "error");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Analytics */}
      <div className="space-y-3">
        <div>
          <h3 className="text-xs font-medium">Analytics</h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Track page views and user behavior.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={analyticsProvider}
            onChange={(e) => setAnalyticsProvider(e.target.value)}
            aria-label="Analytics provider"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {ANALYTICS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {analyticsProvider && (
            <input
              type="text"
              value={analyticsId}
              onChange={(e) => setAnalyticsId(e.target.value)}
              aria-label="Analytics ID"
              spellCheck={false}
              placeholder={
                analyticsProvider === "google"
                  ? "G-XXXXXXXXXX"
                  : analyticsProvider === "posthog"
                    ? "phc_xxxxxxxxxx"
                    : "yourdomain.com"
              }
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-mono placeholder:text-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            />
          )}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-3">
        <div>
          <h3 className="text-xs font-medium">Transactional Email</h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Send emails for onboarding, notifications, and receipts.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={emailProvider}
            onChange={(e) => setEmailProvider(e.target.value)}
            aria-label="Email provider"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {EMAIL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {emailProvider && (
            <>
              <input
                type="text"
                value={emailApiKey}
                onChange={(e) => setEmailApiKey(e.target.value)}
                aria-label="Email API key"
                spellCheck={false}
                placeholder={
                  emailProvider === "resend"
                    ? "re_xxxxxxxxxx"
                    : "SG.xxxxxxxxxx"
                }
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-mono placeholder:text-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
              <input
                type="email"
                value={emailFromAddress}
                onChange={(e) => setEmailFromAddress(e.target.value)}
                aria-label="From address"
                spellCheck={false}
                placeholder="noreply@yourdomain.com"
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-mono placeholder:text-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </>
          )}
        </div>
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80 disabled:opacity-40"
      >
        {isPending ? "Saving\u2026" : "Save Integrations"}
      </button>
    </div>
  );
}
