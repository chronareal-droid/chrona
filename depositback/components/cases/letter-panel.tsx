"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/** Generate / view / copy / print the demand letter for a case (Recovery Kit). */
export function LetterPanel({
  caseId,
  letter,
  generatedAt,
}: {
  caseId: string;
  letter: string | null;
  generatedAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/letter`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't generate the letter");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate the letter");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!letter) return;
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Your demand letter</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {letter && generatedAt
              ? `Generated ${new Date(generatedAt).toLocaleString()}. Read it carefully and fix anything that isn't accurate.`
              : "Cites your state's law, the deadline, the penalty, and rebuts each deduction."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {letter && (
            <>
              <button
                type="button"
                onClick={copy}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface)]"
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <Link
                href={`/letter/${caseId}`}
                target="_blank"
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface)]"
              >
                Print / PDF
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {busy ? "Writing your letter…" : letter ? "Regenerate" : "Write my letter"}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {letter && (
        <pre className="mt-4 max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 font-serif text-sm leading-relaxed">
          {letter}
        </pre>
      )}
    </div>
  );
}
