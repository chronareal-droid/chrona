import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Gradient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[var(--accent)]/[0.06] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:py-28">
        <div className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)] mb-8">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Rules for all 50 states + DC
        </div>

        <h1 className="animate-slide-up text-3xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl leading-[1.1]">
          Your landlord kept your deposit.{" "}
          <span className="text-[var(--accent)]">Get it back.</span>
        </h1>

        <p className="animate-slide-up delay-100 mx-auto mt-5 max-w-xl text-base text-[var(--muted)] leading-relaxed">
          Most states give landlords a hard deadline, and many make them pay up to 3&times; if they keep it wrongly.
          Keepsit checks your state&apos;s rules and writes the demand letter that gets landlords to pay.
        </p>

        <div className="animate-slide-up delay-200 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/check"
            prefetch={false}
            className="group w-full rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80 sm:w-auto"
          >
            Check my deposit, free
            <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </Link>
          <Link
            href="/pricing"
            prefetch={false}
            className="w-full rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] hover:border-[var(--muted)]/40 sm:w-auto"
          >
            See pricing
          </Link>
        </div>
        <p className="animate-slide-up delay-300 mt-4 text-xs text-[var(--muted)]">
          No sign-up for the check. Takes 30 seconds.
        </p>
      </div>
    </section>
  );
}
