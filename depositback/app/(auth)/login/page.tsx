import type { Metadata } from "next";
import Link from "next/link";
import { LINKS } from "@/lib/constants";
import { AppLogo } from "@/components/app-logo";
import { buttonClass } from "@/components/ui/button-class";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectPath = next ?? "/dashboard";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[var(--foreground)] p-12 text-[var(--background)] lg:flex">
        <Link href="/" className="[&_rect]:fill-[var(--background)] [&_path:first-of-type]:stroke-[var(--foreground)]">
          <AppLogo />
        </Link>
        <blockquote className="max-w-md">
          <p className="display text-[3.5rem]">
            The law has a deadline. <span className="italic opacity-60">So should your landlord.</span>
          </p>
        </blockquote>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] opacity-50">Deposit rules for 50 states + DC</p>
      </aside>

      <main className="flex items-center justify-center px-6 py-16">
        <div className="animate-slide-up w-full max-w-sm">
          <Link href="/" className="lg:hidden">
            <AppLogo />
          </Link>
          <h1 className="display mt-10 text-[2.75rem] lg:mt-0">Welcome back.</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Sign in to see your cases and letters.</p>

          <a
            href={`/api/auth/login?next=${encodeURIComponent(redirectPath)}`}
            className={buttonClass("ink", "lg", "mt-10 w-full")}
          >
            <WhopLogo />
            Continue with Whop
          </a>
          <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
            Keepsit uses Whop for secure sign-in and payments. New here? Continuing creates your account.
          </p>

          <p className="mt-12 border-t border-[var(--border)] pt-6 text-[11px] leading-relaxed text-[var(--faint)]">
            By continuing, you agree to our{" "}
            <a href={LINKS.terms} className="underline underline-offset-4 hover:text-[var(--foreground)]">
              Terms
            </a>{" "}
            and{" "}
            <a href={LINKS.privacy} className="underline underline-offset-4 hover:text-[var(--foreground)]">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

function WhopLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" />
    </svg>
  );
}
