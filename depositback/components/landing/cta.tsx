import { ButtonLink, Arrow } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-32">
        <h2 className="display text-[3.4rem] sm:text-[5rem] lg:text-[6.5rem]">
          It&apos;s your money.
          <br />
          <span className="italic text-[var(--accent)]">Ask for it properly.</span>
        </h2>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <ButtonLink href="/check" size="lg" magnetic>
            Check my deposit, free <Arrow />
          </ButtonLink>
          <p className="text-sm text-[var(--muted)]">Takes 30 seconds. No account needed.</p>
        </div>
      </div>
    </section>
  );
}
