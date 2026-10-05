export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-pulse">
      <div>
        <div className="h-5 w-24 rounded bg-[var(--surface)]" />
        <div className="mt-1.5 h-4 w-40 rounded bg-[var(--surface)]" />
      </div>

      {/* Profile skeleton */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="h-4 w-16 rounded bg-[var(--surface)]" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3 w-14 rounded bg-[var(--surface)]" />
              <div className="h-3.5 w-32 rounded bg-[var(--surface)]" />
            </div>
          ))}
        </div>
      </div>

      {/* Subscription skeleton */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="h-4 w-24 rounded bg-[var(--surface)]" />
        <div className="mt-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-[var(--surface)]" />
              <div className="h-3.5 w-28 rounded bg-[var(--surface)]" />
            </div>
          ))}
        </div>
        <div className="mt-5 h-8 w-28 rounded-lg bg-[var(--surface)]" />
      </div>
    </div>
  );
}
