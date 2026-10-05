import { Check } from "lucide-react";

const includes = [
  "Your state's statute, cited by section",
  "The deadline they missed, to the day",
  "The penalty they're risking, in dollars",
  "A rebuttal of every deduction they took",
  "A firm date to pay before small claims",
];

/** Annotated excerpt of a real Keepsit letter. Margin notes call out what does the work. */
export function SampleLetter() {
  return (
    <section id="letter" className="scroll-mt-20 border-t border-[var(--border)] bg-[var(--surface)]/40">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:py-32">
        <div className="lg:col-span-5">
          <p className="eyebrow">The letter</p>
          <h2 className="display mt-4 text-5xl sm:text-6xl">
            Sounds like you have a lawyer. <span className="italic text-[var(--muted)]">You don&apos;t need one.</span>
          </h2>
          <ul className="mt-10 space-y-3.5">
            {includes.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[0.9375rem]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative lg:col-span-7">
          <div className="relative rounded-sm bg-[#fdfcf9] px-7 py-9 font-serif text-[1.05rem] leading-[1.7] text-[#1d1b16] shadow-[var(--shadow-sheet)] sm:px-12 sm:py-12 dark:bg-[#ecE8de]">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#7a7466]">
              Sent by certified mail, return receipt requested
            </p>
            <p className="mt-5">Dear Ridgeway Properties,</p>
            <p className="mt-4">
              I moved out of 1840 Sunset Blvd, Unit 4 on August 14. You returned $600 of my $2,400 deposit and kept
              $1,800 for &ldquo;carpet replacement&rdquo; and &ldquo;cleaning.&rdquo; The carpet was nine years old.
              Normal wear isn&apos;t a deduction.
            </p>
            <p className="mt-4">
              Under <Mark note="Statute">California Civil Code § 1950.5</Mark>, you had{" "}
              <Mark note="Deadline">21 days to return my deposit</Mark> with an itemized statement. Bad-faith retention
              can add <Mark note="Penalty">up to twice the deposit</Mark> in damages.
            </p>
            <p className="mt-4">I am asking you to pay $1,800 by October 19 …</p>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b-sm bg-gradient-to-t from-[#fdfcf9] to-transparent dark:from-[#ece8de]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Mark({ note, children }: { note: string; children: React.ReactNode }) {
  return (
    <span className="relative whitespace-nowrap">
      <span className="bg-[linear-gradient(transparent_55%,rgb(60_203_138/0.35)_55%)] px-0.5">{children}</span>
      <span className="absolute -top-4 left-0 font-mono text-[9px] uppercase tracking-[0.14em] text-[#0e7a4f]">
        {note}
      </span>
    </span>
  );
}
