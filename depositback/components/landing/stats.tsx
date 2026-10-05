const stats = [
  {
    value: "58%",
    label: "of renters who paid a deposit didn't get all of it back.",
    source: "https://rapideyeinspections.com/research/security-deposit-statistics/",
  },
  {
    value: "1 in 10",
    label: "got nothing back at all.",
    source: "https://rapideyeinspections.com/research/security-deposit-statistics/",
  },
  {
    value: "3×",
    label: "what some states let you recover when a landlord keeps it in bad faith.",
  },
];

export function Stats() {
  return (
    <section className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-28">
        <h2 className="display max-w-3xl text-5xl sm:text-6xl">
          Landlords are counting on you <span className="italic text-[var(--stamp)]">not pushing back.</span>
        </h2>
        <dl className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-[var(--border)]">
          {stats.map((s) => (
            <div key={s.value} className="sm:px-8 sm:first:pl-0">
              <dt className="display text-[4.5rem] leading-none sm:text-[5.5rem]">{s.value}</dt>
              <dd className="mt-4 max-w-[17rem] text-[0.9375rem] leading-relaxed text-[var(--muted)]">
                {s.label}
                {s.source && (
                  <a
                    href={s.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="eyebrow mt-2 block !text-[10px] underline-offset-4 hover:text-[var(--foreground)] hover:underline"
                  >
                    Source ↗
                  </a>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
