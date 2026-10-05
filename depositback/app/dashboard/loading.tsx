export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-pulse">
      <div>
        <div className="h-5 w-40 rounded bg-[var(--surface)]" />
        <div className="mt-1.5 h-4 w-56 rounded bg-[var(--surface)]" />
      </div>

      <div className="grid gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[var(--card)] p-5">
            <div className="h-3 w-16 rounded bg-[var(--surface)]" />
            <div className="mt-2 h-6 w-12 rounded bg-[var(--surface)]" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="h-4 w-24 rounded bg-[var(--surface)]" />
        <div className="mt-2 h-3 w-full rounded bg-[var(--surface)]" />
        <div className="mt-1.5 h-3 w-3/4 rounded bg-[var(--surface)]" />
      </div>
    </div>
  );
}
