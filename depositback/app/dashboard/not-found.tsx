import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <p className="text-5xl font-bold text-[var(--accent)]">404</p>
        <h1 className="mt-4 text-lg font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          This dashboard page doesn&apos;t exist.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90 transition-opacity"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
