import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xs text-center">
        <p className="text-5xl font-semibold tracking-tight text-[var(--muted)]">404</p>

        <h1 className="mt-3 text-sm font-semibold">Page not found</h1>
        <p className="mt-1 text-xs text-[var(--muted)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80"
          >
            Back to Home
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface)]"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
