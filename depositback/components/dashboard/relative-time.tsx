"use client";

import { useState, useEffect } from "react";

/**
 * Renders a relative timestamp ("2h ago", "3d ago") on the client only.
 * Server renders a stable absolute date to avoid hydration mismatches,
 * then the client replaces it with the relative format after mount.
 */
export function RelativeTime({ iso }: { iso: string }) {
  const [relative, setRelative] = useState<string | null>(null);

  useEffect(() => {
    setRelative(formatRelativeTime(new Date(iso)));
  }, [iso]);

  return (
    <p className="mt-0.5 text-xs text-[var(--muted)]">
      {relative ?? formatAbsolute(iso)}
    </p>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatAbsolute(date.toISOString());
}

/** Stable absolute format used for SSR (no timezone/locale variance). */
function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
