import { APP_NAME } from "@/lib/constants";

/**
 * App logo + name. Used in the header, sidebar, login page, and checkout.
 *
 * To replace: swap the LogoMark SVG below with your own, or use next/image.
 * To change the name: edit APP_NAME in lib/constants.ts.
 */
export function AppLogo({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark />
      {!iconOnly && <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>}
    </span>
  );
}

/**
 * Keepsit mark — accent-colored rounded square with a house and check mark.
 * Uses CSS custom properties so it adapts to the configured accent color.
 */
function LogoMark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="6" fill="var(--accent, #0b8f52)" />
      {/* House with a check mark: "the deposit comes home" */}
      <path
        d="M12 5L5.5 10.5V18.5H18.5V10.5L12 5Z"
        stroke="var(--accent-foreground, #fff)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.25 13.75L11.25 15.75L14.75 12"
        stroke="var(--accent-foreground, #fff)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
