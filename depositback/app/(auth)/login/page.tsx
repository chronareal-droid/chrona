import type { Metadata } from "next";
import Link from "next/link";
import { LINKS } from "@/lib/constants";
import { AppLogo } from "@/components/app-logo";

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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xs animate-slide-up">
        <div className="text-center mb-8">
          <Link href="/">
            <AppLogo />
          </Link>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Sign in to your account
          </p>
        </div>

        <a
          href={`/api/auth/login?next=${encodeURIComponent(redirectPath)}`}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80"
        >
          <WhopLogo />
          Continue with Whop
        </a>

        <p className="mt-6 text-center text-[10px] text-[var(--muted)] leading-relaxed">
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
