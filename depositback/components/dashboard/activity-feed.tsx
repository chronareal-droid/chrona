/**
 * Paper trail: the user's recent events (sign-ins, purchases, cases, letters),
 * as a quiet timestamped list. Events are logged by lib/activity.ts.
 */

import { getRecentActivity } from "@/lib/activity";
import { RelativeTime } from "./relative-time";

const KIND: Record<string, string> = {
  sign_in: "Sign-in",
  plan_change: "Billing",
  setting: "Settings",
  account: "Account",
  case: "Case",
};

export async function ActivityFeed({ userId }: { userId: string }) {
  const events = await getRecentActivity(userId);

  return (
    <div>
      <p className="eyebrow">Paper trail</p>
      {events.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Nothing yet. What you do here shows up as a dated record.</p>
      ) : (
        <ol className="mt-4 border-t border-[var(--border)]">
          {events.map((e) => (
            <li
              key={e.id}
              className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-4 border-b border-[var(--border)] py-3.5 sm:grid-cols-[7rem_6rem_minmax(0,1fr)]"
            >
              <span className="font-mono text-[11px] text-[var(--muted)]">
                <RelativeTime iso={e.createdAt.toISOString()} />
              </span>
              <span className="eyebrow hidden !text-[10px] sm:block">{KIND[e.type] ?? e.type}</span>
              <span className="truncate text-sm">{e.description}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function ActivityFeedSkeleton() {
  return (
    <div>
      <div className="skeleton h-3 w-24" />
      <div className="mt-5 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-4 w-full" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
    </div>
  );
}
