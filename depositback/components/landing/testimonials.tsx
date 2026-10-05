/**
 * "Why this matters" stats. Each figure links to its source.
 * Replace with real customer stories once you have them (with permission).
 */
const stats = [
  {
    value: "58%",
    label: "of renters who paid a deposit didn't get all of it back",
    source: "https://rapideyeinspections.com/research/security-deposit-statistics/",
  },
  {
    value: "1 in 10",
    label: "renters got none of their deposit back",
    source: "https://rapideyeinspections.com/research/security-deposit-statistics/",
  },
  {
    value: "Up to 3×",
    label: "what some states let tenants recover when a landlord wrongly keeps a deposit",
    source: "/check",
  },
];

export function Testimonials() {
  return (
    <section className="border-y border-[var(--border)] bg-[var(--surface)]/50">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Landlords count on you not pushing back
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.value} className="text-center">
              <p className="text-4xl font-semibold tracking-tight text-[var(--accent)]">{s.value}</p>
              <p className="mx-auto mt-2 max-w-[16rem] text-sm text-[var(--muted)] leading-relaxed">{s.label}</p>
              <a
                href={s.source}
                className="mt-1 inline-block text-[11px] text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)]"
                {...(s.source.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {s.source.startsWith("http") ? "Source" : "Check your state"}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
