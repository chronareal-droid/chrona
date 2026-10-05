import { DEPOSIT_LAWS } from "@/lib/deposit-laws";

/** A slow ticker of every state's deadline. Pauses on hover. */
export function StateTicker() {
  const items = DEPOSIT_LAWS.map((l) => ({ code: l.code, days: l.returnDays, x: l.multiplier }));
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((s) => (
        <li key={s.code} className="flex items-center gap-2 px-5 font-mono text-[12px] text-[var(--muted)]">
          <span className="text-[var(--foreground)]">{s.code}</span>
          <span>{s.days}d</span>
          {s.x > 1 && <span className="text-[var(--accent)]">{s.x}×</span>}
          <span className="ml-3 h-3 w-px bg-[var(--border-strong)]" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="group relative overflow-hidden border-y border-[var(--border)] py-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <p className="sr-only">Deadlines range from 14 to 60 days depending on the state.</p>
      <div className="animate-marquee flex w-max group-hover:[animation-play-state:paused]">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
