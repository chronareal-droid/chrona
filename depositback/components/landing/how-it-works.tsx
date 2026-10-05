const steps = [
  {
    n: "01",
    title: "Find your deadline",
    body: "Pick your state and move-out date. See the exact day your landlord's time ran out, and what the law lets you claim.",
  },
  {
    n: "02",
    title: "Answer back, line by line",
    body: "List what they charged you for and why it's wrong. Normal wear and tear, damage that was already there, cleaning you already did.",
  },
  {
    n: "03",
    title: "Mail the letter",
    body: "Get a firm, professional demand letter that cites your state's statute and penalty. Print it, send it certified, and start the clock on them.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:py-32">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow">How it works</p>
            <h2 className="display mt-4 text-5xl sm:text-6xl">
              Three steps.
              <br />
              <span className="italic text-[var(--muted)]">One letter.</span>
            </h2>
          </div>
        </div>
        <ol className="lg:col-span-8">
          {steps.map((s) => (
            <li
              key={s.n}
              className="group grid grid-cols-[3.5rem_1fr] gap-x-4 border-t border-[var(--border)] py-9 first:border-t-0 first:pt-0 sm:grid-cols-[5rem_1fr] lg:first:pt-2"
            >
              <span className="figure pt-2 text-sm text-[var(--faint)] transition-colors duration-300 group-hover:text-[var(--accent)]">
                {s.n}
              </span>
              <div>
                <h3 className="display text-[2.1rem] sm:text-[2.6rem]">{s.title}</h3>
                <p className="mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-[var(--muted)]">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
