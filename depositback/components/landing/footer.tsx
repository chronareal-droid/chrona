import Link from "next/link";
import { APP_NAME, LEGAL_DISCLAIMER, LINKS } from "@/lib/constants";
import { AppLogo } from "@/components/app-logo";

const links = [
  { href: "/check", label: "Free check" },
  { href: "/pricing", label: "Pricing" },
  { href: LINKS.terms, label: "Terms" },
  { href: LINKS.privacy, label: "Privacy" },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <AppLogo />
            <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">{LEGAL_DISCLAIMER}</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                prefetch={false}
                className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="eyebrow mt-12 !normal-case !tracking-normal">
          © {new Date().getFullYear()} {APP_NAME}. Not a law firm.
        </p>
      </div>
    </footer>
  );
}
