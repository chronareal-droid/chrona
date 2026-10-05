import { cn } from "@/lib/utils";

/** CSS-only tooltip: shows on hover and keyboard focus of the trigger. */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  return (
    <span className={cn("group/tip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-[16rem] -translate-x-1/2 rounded-lg bg-[var(--foreground)] px-2.5 py-1.5 text-[11px] leading-snug text-[var(--background)] opacity-0 shadow-[var(--shadow-float)] transition-[opacity,transform] duration-200 ease-[var(--ease-out-quint)]",
          "group-hover/tip:opacity-100 group-focus-within/tip:opacity-100",
          side === "top"
            ? "bottom-full mb-2 translate-y-1 group-hover/tip:translate-y-0 group-focus-within/tip:translate-y-0"
            : "top-full mt-2 -translate-y-1 group-hover/tip:translate-y-0 group-focus-within/tip:translate-y-0",
        )}
      >
        {content}
      </span>
    </span>
  );
}
