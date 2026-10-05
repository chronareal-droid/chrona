"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppLogo } from "@/components/app-logo";
import { ButtonLink, Arrow } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Check if the logged_in indicator cookie exists.
 * This is a non-httpOnly cookie set alongside the session cookie,
 * so client JS can detect auth state without exposing the JWT.
 */
function hasLoggedInCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("logged_in="));
}

const NAV = [
  { href: "/check", label: "Free check" },
  { href: "/#how", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

export function HeaderClient() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsLoggedIn(hasLoggedInCookie());
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 border-b transition-[background-color,border-color] duration-300",
          scrolled || mobileOpen
            ? "border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md"
            : "border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5 sm:px-8">
          <Link href="/" prefetch={false} className="flex items-center" aria-label="Keepsit home">
            <AppLogo />
          </Link>

          <nav className="ml-10 hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative px-3 py-2 text-sm transition-colors",
                    active ? "text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      "absolute inset-x-3 -bottom-px h-px origin-left bg-[var(--foreground)] transition-transform duration-300 ease-[var(--ease-out-quint)]",
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto hidden items-center gap-1 md:flex">
            <ThemeToggle />
            {isLoggedIn ? (
              <ButtonLink href="/dashboard" variant="ink" size="sm" className="ml-2">
                Dashboard <Arrow />
              </ButtonLink>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                >
                  Sign in
                </Link>
                <ButtonLink href="/check" variant="ink" size="sm" magnetic className="ml-1">
                  Check my deposit <Arrow />
                </ButtonLink>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--surface)]"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <span
                className={cn(
                  "absolute h-[1.5px] w-4 rounded bg-current transition-transform duration-300 ease-[var(--ease-out-quint)]",
                  mobileOpen ? "rotate-45" : "-translate-y-[4px]",
                )}
              />
              <span
                className={cn(
                  "absolute h-[1.5px] w-4 rounded bg-current transition-transform duration-300 ease-[var(--ease-out-quint)]",
                  mobileOpen ? "-rotate-45" : "translate-y-[4px]",
                )}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile: full-height sheet with large type */}
      <div
        className={cn(
          "fixed inset-x-0 top-16 bottom-0 z-40 bg-[var(--background)] px-5 pt-6 pb-8 transition-[opacity,transform] duration-300 ease-[var(--ease-out-quint)] md:hidden",
          mobileOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
        aria-hidden={!mobileOpen}
      >
        <nav className="flex flex-col" aria-label="Mobile">
          {NAV.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="display border-b border-[var(--border)] py-4 text-[2.4rem]"
              style={{ transitionDelay: `${i * 40}ms` }}
              tabIndex={mobileOpen ? 0 : -1}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 flex flex-col gap-3">
          {isLoggedIn ? (
            <ButtonLink href="/dashboard" variant="ink" size="lg">
              Dashboard <Arrow />
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/check" variant="primary" size="lg">
                Check my deposit, free <Arrow />
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" size="lg">
                Sign in
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </>
  );
}
