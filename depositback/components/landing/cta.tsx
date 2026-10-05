import Link from "next/link";

export function CTA() {
  return (
    <section>
      <div className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
        <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-16 text-center sm:px-16">
          {/* Subtle accent glow */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[500px] rounded-full bg-[var(--accent)]/[0.04] blur-[100px]" />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Find out what you&apos;re owed
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-[var(--muted)] leading-relaxed">
            It takes 30 seconds and it&apos;s free. If your landlord missed the
            deadline, you&apos;ll know exactly what to ask for.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/check"
              prefetch={false}
              className="group w-full rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80 sm:w-auto"
            >
              Check my deposit
              <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">
                &rarr;
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
