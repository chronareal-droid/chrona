const steps = [
  {
    title: "Check your state's rules",
    description:
      "Enter your state, deposit and move-out date. See the deadline your landlord had, whether they missed it, and the penalty your state allows.",
  },
  {
    title: "Tell us what they charged",
    description:
      "List each deduction and why it's wrong: normal wear and tear, damage that was already there, cleaning you already did.",
  },
  {
    title: "Send the demand letter",
    description:
      "Get a firm, professional letter that cites your state's statute and argues against every deduction. Print it and send it certified mail.",
  },
  {
    title: "Get paid, or go to small claims",
    description:
      "Most landlords pay once they see the law in writing. If yours doesn't, follow the step-by-step small claims plan on your case page.",
  },
];

export function Features() {
  return (
    <section>
      <div className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">How it works</h2>
          <p className="mt-3 text-sm text-[var(--muted)]">From &ldquo;they kept my money&rdquo; to a demand letter in minutes.</p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.title} className="bg-[var(--card)] p-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-sm font-semibold text-[var(--accent)]">
                {i + 1}
              </div>
              <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-[var(--muted)] leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
