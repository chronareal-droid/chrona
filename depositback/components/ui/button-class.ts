// Button styles shared by server and client components (button.tsx is client-only).
import { cn } from "@/lib/utils";

export type Variant = "primary" | "ink" | "secondary" | "ghost" | "danger";
export type Size = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium " +
  "transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-200 ease-[var(--ease-out-quint)] " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.12)] hover:brightness-110",
  ink: "bg-[var(--foreground)] text-[var(--background)] hover:opacity-90",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--foreground)]/40",
  ghost: "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
  danger: "text-[var(--muted)] hover:bg-[var(--stamp-soft)] hover:text-[var(--stamp)]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 rounded-lg px-3 text-xs",
  md: "h-10 rounded-[0.7rem] px-4 text-sm",
  lg: "h-12 rounded-xl px-5 text-[0.9375rem]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}
