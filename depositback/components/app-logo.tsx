import { APP_NAME } from "@/lib/constants";

/**
 * Keepsit wordmark: a serif name next to a small ink seal (house + check).
 * The seal echoes the stamp used across the product.
 */
export function AppLogo({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark />
      {!iconOnly && <span className="font-serif text-[1.35rem] leading-none tracking-[-0.01em]">{APP_NAME}</span>}
    </span>
  );
}

function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px] shrink-0" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6.5" fill="var(--foreground)" />
      <path d="M12 5.5L6 10.5V18H18V10.5L12 5.5Z" stroke="var(--background)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9.4 13.6L11.3 15.4L14.7 11.9" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
