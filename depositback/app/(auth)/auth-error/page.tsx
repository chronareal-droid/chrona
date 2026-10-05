import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Authentication Error",
};

const errorMessages: Record<string, string> = {
  missing_config:
    "Whop is not configured yet. Add NEXT_PUBLIC_WHOP_APP_ID to your .env.local file to enable authentication.",
  missing_params: "The sign-in request was incomplete. Please try again.",
  expired_session: "Your sign-in session expired. Please try again.",
  invalid_state: "The sign-in session was invalid. Please try again.",
  state_mismatch: "The sign-in session didn't match. Please try again.",
  exchange_failed: "Failed to complete sign-in. Please try again.",
  access_denied: "You denied the sign-in request.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; description?: string }>;
}) {
  const { error, description } = await searchParams;
  const isConfigError = error === "missing_config";
  const message =
    (error && errorMessages[error]) ??
    description ??
    "An unexpected error occurred during sign-in.";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center">
          <div className={`mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-lg ${isConfigError ? "bg-amber-500/10" : "bg-red-500/10"}`}>
            {isConfigError ? (
              <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-1.42.83V18a1 1 0 002 0v-1.58l4.25-2.46a1 1 0 00-1-1.73l-3.83 2.22zM12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            )}
          </div>

          <h1 className="text-sm font-semibold">
            {isConfigError ? "Setup Required" : "Authentication Error"}
          </h1>
          <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">{message}</p>
        </div>

        {isConfigError && (
          <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs font-medium mb-2">Quick setup:</p>
            <ol className="text-xs text-[var(--muted)] space-y-1.5 list-decimal list-inside">
              <li>Copy <code className="rounded bg-[var(--card-border)] px-1 py-0.5">.env.example</code> to <code className="rounded bg-[var(--card-border)] px-1 py-0.5">.env.local</code></li>
              <li>Create a Whop app at <a href="https://dash.whop.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-[var(--foreground)]">dash.whop.com</a></li>
              <li>Add your app ID and API key</li>
              <li>Restart the dev server</li>
            </ol>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {!isConfigError && (
            <Link
              href="/login"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-center text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80"
            >
              Try Again
            </Link>
          )}
          <Link
            href="/"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-center text-sm font-medium transition-colors hover:bg-[var(--surface)]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
