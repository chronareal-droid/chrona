import { cn } from "@/lib/utils";

/**
 * The Keepsit signature: a rubber stamp that lands on the page when the
 * landlord is past due. Double rule, mono caps, slightly uneven ink.
 */
export function Stamp({
  children,
  tone = "stamp",
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  tone?: "stamp" | "accent" | "caution";
  className?: string;
  delay?: number;
}) {
  const color =
    tone === "accent" ? "var(--accent)" : tone === "caution" ? "var(--caution)" : "var(--stamp)";
  return (
    <span
      className={cn(
        "animate-stamp inline-flex select-none items-center rounded-[6px] border-2 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] [mask-image:radial-gradient(circle_at_30%_40%,#000_60%,rgb(0_0_0/0.82)_100%)]",
        className,
      )}
      style={{
        color,
        borderColor: color,
        boxShadow: `inset 0 0 0 2px var(--card), inset 0 0 0 3px ${color}`,
        animationDelay: `${delay}ms`,
      }}
    >
      {children}
    </span>
  );
}
