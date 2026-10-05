import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/db";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Demand letter",
  robots: { index: false },
};

/** Print-ready view of a case's letter (outside the dashboard chrome). */
export default async function LetterPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/letter/${id}`)}`);

  const row = await prisma.depositCase.findFirst({
    where: { id, userId: session.userId },
    select: { letter: true },
  });
  if (!row?.letter) notFound();

  return (
    <div className="min-h-screen bg-[var(--surface)] py-10 print:bg-white print:py-0">
      <div className="mx-auto mb-6 flex max-w-[8.5in] items-center justify-between px-6 print:hidden">
        <p className="eyebrow">Check every detail before you mail it</p>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-[8.5in] bg-white px-[1in] py-[0.9in] text-black shadow-[var(--shadow-sheet)] print:max-w-none print:p-0 print:shadow-none">
        <div className="whitespace-pre-wrap font-serif text-[12.5pt] leading-[1.6]">{row.letter}</div>
      </article>
    </div>
  );
}
