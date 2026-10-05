import { ButtonLink, Arrow } from "@/components/ui/button";
import { Exhibit } from "./exhibit";

export function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto grid max-w-6xl gap-14 px-5 pt-12 pb-20 sm:px-8 sm:pt-20 lg:grid-cols-12 lg:gap-8 lg:pt-24 lg:pb-28">
        <div className="lg:col-span-7">
          <p className="eyebrow animate-fade-in flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            Security deposit recovery · 50 states + DC
          </p>
          <h1 className="display mt-6 text-[3.4rem] sm:text-[5rem] lg:text-[6.2rem]">
            <span className="animate-rise block">Your landlord</span>
            <span className="animate-rise delay-100 block">had a deadline.</span>
            <span className="animate-rise delay-200 block italic text-[var(--accent)]">Now they owe you.</span>
          </h1>
          <p className="animate-slide-up delay-300 mt-8 max-w-[34rem] text-[1.0625rem] leading-relaxed text-[var(--muted)]">
            Every state gives landlords a hard deadline to return your deposit, and many make them pay up to three
            times over if they don&apos;t. Keepsit finds your deadline and writes the letter that gets you paid.
          </p>
          <div className="animate-slide-up delay-400 mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/check" size="lg" magnetic>
              Check my deposit, free <Arrow />
            </ButtonLink>
            <ButtonLink href="/#letter" size="lg" variant="ghost">
              See a sample letter
            </ButtonLink>
          </div>
          <p className="eyebrow animate-fade-in delay-500 mt-6 !normal-case !tracking-normal">
            30 seconds · no sign-up · nothing sent until you say so
          </p>
        </div>

        <div className="relative lg:col-span-5 lg:pt-6">
          <Exhibit />
        </div>
      </div>
    </section>
  );
}
