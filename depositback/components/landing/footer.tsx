import Link from "next/link";
import { APP_NAME, LEGAL_DISCLAIMER, LINKS } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
        <p className="max-w-md text-[11px] text-[var(--muted)] leading-relaxed">
          &copy; {new Date().getFullYear()} {APP_NAME}. {LEGAL_DISCLAIMER}
        </p>

        <nav className="flex gap-5">
          <Link
            href="/pricing"
            prefetch={false}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/check"
            prefetch={false}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Free check
          </Link>
          <Link
            href={LINKS.terms}
            prefetch={false}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Terms
          </Link>
          <Link
            href={LINKS.privacy}
            prefetch={false}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
