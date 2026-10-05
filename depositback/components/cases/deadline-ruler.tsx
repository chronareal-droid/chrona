import { formatLongDate } from "@/lib/deposit-laws";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

function utcDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function shortDate(iso: string) {
  return formatLongDate(iso).replace(/, \d{4}$/, "");
}

/**
 * The deadline ruler: one tick per day from move-out, the legal deadline as a
 * hard line, and today as a live marker. Days past the deadline are hatched in
 * stamp red — the visual argument for the whole letter.
 */
export function DeadlineRuler({
  moveOutDate,
  deadline,
  today = new Date().toISOString().slice(0, 10),
  approximate = false,
  compact = false,
}: {
  moveOutDate: string;
  deadline: string;
  today?: string;
  /** Deadline is the earliest it could be (clock starts on forwarding address). */
  approximate?: boolean;
  compact?: boolean;
}) {
  const start = utcDay(moveOutDate);
  const deadlineDay = Math.round((utcDay(deadline) - start) / DAY_MS);
  const todayDay = Math.max(0, Math.round((utcDay(today) - start) / DAY_MS));
  const span = Math.max(deadlineDay, todayDay) * 1.1 + 2;
  const pct = (d: number) => `${(Math.min(d, span) / span) * 100}%`;
  const overdue = todayDay > deadlineDay;
  const step = span > 240 ? 7 : span > 120 ? 2 : 1;

  const ticks: number[] = [];
  for (let d = 0; d <= span; d += step) ticks.push(d);

  return (
    <div className={cn("relative select-none", compact ? "pt-5 pb-5" : "pt-8 pb-9")} aria-hidden="true">
      {/* Labels above: deadline */}
      <div className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-center" style={{ left: pct(deadlineDay) }}>
        <span className="eyebrow !text-[10px] !text-[var(--foreground)]">
          {approximate ? "Earliest deadline" : "Deadline"}
          {!compact && <span className="text-[var(--muted)]"> · {shortDate(deadline)}</span>}
        </span>
      </div>

      <div className="relative h-7">
        {/* Hatched overdue band */}
        {overdue && (
          <div
            className="animate-fade-in delay-700 absolute top-1 bottom-1 rounded-[2px]"
            style={{
              left: pct(deadlineDay),
              width: `calc(${pct(todayDay)} - ${pct(deadlineDay)})`,
              backgroundImage:
                "repeating-linear-gradient(-45deg, var(--stamp) 0 1.5px, transparent 1.5px 6px)",
              opacity: 0.55,
            }}
          />
        )}

        {/* Ticks */}
        <div className="animate-draw absolute inset-0">
          {ticks.map((d) => {
            const major = d % (step * 7) === 0;
            const past = d > deadlineDay && d <= todayDay;
            return (
              <span
                key={d}
                className="absolute bottom-0 w-px"
                style={{
                  left: pct(d),
                  height: major ? "100%" : "40%",
                  background: past ? "var(--stamp)" : d > todayDay ? "var(--border-strong)" : "var(--foreground)",
                  opacity: d > todayDay ? 0.6 : major ? 0.9 : 0.45,
                }}
              />
            );
          })}
          <span className="absolute bottom-0 left-0 right-0 h-px bg-[var(--border-strong)]" />
        </div>

        {/* Deadline line */}
        <span
          className={cn("absolute -top-1 -bottom-1 w-[2px] -translate-x-1/2 rounded-full bg-[var(--foreground)]", approximate && "opacity-60")}
          style={{ left: pct(deadlineDay) }}
        />

        {/* Today marker */}
        <span
          className={cn(
            "animate-scale-in delay-900 absolute bottom-0 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-[var(--card)]",
            overdue ? "animate-pulse-dot bg-[var(--stamp)] text-[var(--stamp)]" : "bg-[var(--accent)] text-[var(--accent)]",
          )}
          style={{ left: pct(todayDay) }}
        />
      </div>

      {/* Labels below: move-out and today */}
      <div className="absolute bottom-0 left-0 whitespace-nowrap">
        <span className="eyebrow !text-[10px]">Moved out{!compact && ` · ${shortDate(moveOutDate)}`}</span>
      </div>
      <div
        className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap"
        style={{ left: `clamp(3rem, ${pct(todayDay)}, calc(100% - 2rem))` }}
      >
        <span className={cn("eyebrow !text-[10px]", overdue ? "!text-[var(--stamp)]" : "!text-[var(--accent)]")}>
          Today
        </span>
      </div>
    </div>
  );
}
