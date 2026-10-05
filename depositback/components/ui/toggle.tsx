"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/** Animated switch with a label and optional hint. Whole row is clickable. */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
  className,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-sm text-[var(--foreground)]">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-relaxed text-[var(--muted)]">{hint}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-300",
          checked
            ? "border-transparent bg-[var(--accent)]"
            : "border-[var(--border-strong)] bg-[var(--surface)]",
        )}
      >
        <span
          className={cn(
            "inline-block h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-300 ease-[var(--ease-spring)]",
            checked ? "translate-x-[19px]" : "translate-x-[2px]",
          )}
        />
      </button>
    </div>
  );
}
