"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Printer, RefreshCw } from "lucide-react";
import { Button, ButtonLink, Arrow } from "@/components/ui/button";
import { useToast } from "@/components/toast";

const DRAFTING_STEPS = [
  "Reading your case",
  "Checking your state's statute",
  "Answering each deduction",
  "Setting a payment deadline",
  "Putting it on letterhead",
];

/** Generate / view / copy / print the demand letter for a case (Recovery Kit). */
export function LetterPanel({
  caseId,
  letter,
  generatedAt,
  stateName,
}: {
  caseId: string;
  letter: string | null;
  generatedAt: string | null;
  stateName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, DRAFTING_STEPS.length - 1)), 1400);
    return () => clearInterval(t);
  }, [busy]);

  async function generate() {
    setBusy(true);
    setStep(0);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/letter`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't write the letter");
      toast("Your letter is ready", "success");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't write the letter";
      setError(message);
      toast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!letter) return;
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    toast("Copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  if (busy) return <Drafting step={step} />;

  if (!letter) {
    return (
      <div className="grid items-center gap-8 rounded-2xl border border-dashed border-[var(--border-strong)] p-8 sm:p-10 md:grid-cols-[1fr_auto]">
        <div>
          <p className="display text-[2.25rem]">Ready when you are.</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
            We&apos;ll write a firm, professional letter that cites {stateName} law and answers every deduction. You
            can read it and regenerate before you send anything.
          </p>
          {error && <p className="mt-3 text-sm text-[var(--stamp)]">{error}</p>}
        </div>
        <Button size="lg" onClick={generate} magnetic>
          Write my letter <Arrow />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">
          {generatedAt ? `Drafted ${new Date(generatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "Draft"} ·
          read it before you send it
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={copy} aria-label="Copy letter">
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="ghost" size="sm" onClick={generate}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Rewrite
          </Button>
          <ButtonLink href={`/letter/${caseId}`} target="_blank" variant="ink" size="sm">
            <Printer className="h-3.5 w-3.5" aria-hidden="true" /> Print / PDF
          </ButtonLink>
        </div>
      </div>
      {error && <p className="mb-3 text-sm text-[var(--stamp)]">{error}</p>}
      <article className="relative mx-auto max-w-[44rem] rounded-sm bg-[#fdfcf9] px-7 py-10 text-[#1d1b16] shadow-[var(--shadow-sheet)] sm:px-14 sm:py-14 dark:bg-[#ece8de]">
        <div className="whitespace-pre-wrap font-serif text-[1.0625rem] leading-[1.75]">{letter}</div>
      </article>
    </div>
  );
}

/** Drafting state: a sheet that writes itself while steps tick by. */
function Drafting({ step }: { step: number }) {
  return (
    <div className="grid gap-8 md:grid-cols-[14rem_1fr]" role="status" aria-live="polite">
      <ol className="space-y-3">
        {DRAFTING_STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                i < step
                  ? "border-transparent bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : i === step
                    ? "animate-pulse-dot border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--border-strong)]"
              }`}
            >
              {i < step && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
            </span>
            <span className={i <= step ? "text-[var(--foreground)]" : "text-[var(--faint)]"}>{s}</span>
          </li>
        ))}
      </ol>
      <div className="rounded-sm bg-[var(--card)] p-10 shadow-[var(--shadow-sheet)]">
        {[92, 70, 0, 100, 96, 88, 0, 100, 94, 60].map((w, i) =>
          w === 0 ? (
            <div key={i} className="h-5" />
          ) : (
            <div key={i} className="skeleton mb-3 h-3" style={{ width: `${w}%`, animationDelay: `${i * 90}ms` }} />
          ),
        )}
      </div>
    </div>
  );
}
