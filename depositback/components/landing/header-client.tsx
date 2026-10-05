"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppLogo } from "@/components/app-logo";

/**
 * Check if the logged_in indicator cookie exists.
 * This is a non-httpOnly cookie set alongside the session cookie,
 * so client JS can detect auth state without exposing the JWT.
 */
function hasLoggedInCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("logged_in="));
}

export function HeaderClient() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  // Check cookie presence and close mobile nav on route change
  useEffect(() => {
    setIsLoggedIn(hasLoggedInCookie());
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:px-6">
          {/* Left — logo */}
          <Link href="/" prefetch={false} className="flex items-center">
            <AppLogo />
          </Link>

          {/* Center — nav links (desktop) */}
          <nav className="hidden flex-1 items-center justify-center gap-1 sm:flex">
            <NavLink href="/check" active={pathname === "/check"} prefetch={true}>
              Free check
            </NavLink>
            <NavLink href="/pricing" active={pathname === "/pricing"} prefetch={true}>
              Pricing
            </NavLink>
          </nav>

          {/* Right — actions (desktop) */}
          <div className="hidden items-center gap-1 sm:flex">
            {isLoggedIn ? (
              <>
                <ThemeToggle />
                <Link
                  href="/dashboard"
                  className="ml-2 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  prefetch={true}
                  className="rounded-md px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                >
                  Sign in
                </Link>
                <ThemeToggle />
                <Link
                  href="/check"
                  prefetch={false}
                  className="ml-2 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80"
                >
                  Check my deposit
                </Link>
              </>
            )}
          </div>

          {/* Mobile controls */}
          <div className="ml-auto flex items-center gap-1 sm:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] active:bg-[var(--surface)] transition-colors"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <svg className="h-[15px] w-[15px]" fill="none" viewBox="0 0 15 15" stroke="currentColor" aria-hidden="true">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeWidth={1.25} d="M3.5 3.5l8 8M11.5 3.5l-8 8" />
                ) : (
                  <path strokeLinecap="round" strokeWidth={1.25} d="M2 4.5h11M2 7.5h11M2 10.5h11" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-200 sm:hidden ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
        onKeyDown={(e) => { if (e.key === "Escape") setMobileOpen(false); }}
        role="button"
        tabIndex={-1}
        aria-label="Close menu"
      />

      {/* Mobile nav panel */}
      <nav
        className={`fixed top-14 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--background)] px-4 pb-4 pt-2 sm:hidden transition-all duration-200 ${
          mobileOpen
            ? "translate-y-0 opacity-100"
            : "-translate-y-2 opacity-0 pointer-events-none"
        }`}
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-0.5">
          <MobileNavLink href="/check" active={pathname === "/check"} prefetch={false}>
            Free check
          </MobileNavLink>
          <MobileNavLink href="/pricing" active={pathname === "/pricing"} prefetch={false}>
            Pricing
          </MobileNavLink>

          {/* Divider between nav and CTAs */}
          <div className="my-2 border-t border-[var(--border)]" />

          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-[var(--accent)] px-3 py-2.5 text-center text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <MobileNavLink href="/login" active={pathname === "/login"} prefetch={false}>
                Sign in
              </MobileNavLink>
              <Link
                href="/check"
                prefetch={false}
                className="mt-1 rounded-lg bg-[var(--accent)] px-3 py-2.5 text-center text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80"
              >
                Check my deposit
              </Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
}

/* ── Shared link components ─────────────────────────────── */

function NavLink({
  href,
  active,
  prefetch,
  children,
}: {
  href: string;
  active: boolean;
  prefetch?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
        active
          ? "text-[var(--foreground)] font-medium"
          : "text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  active,
  prefetch,
  children,
}: {
  href: string;
  active: boolean;
  prefetch?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={`rounded-lg px-3 py-2.5 text-sm transition-colors ${
        active
          ? "text-[var(--foreground)] font-medium bg-[var(--surface)]"
          : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]"
      }`}
    >
      {children}
    </Link>
  );
}
