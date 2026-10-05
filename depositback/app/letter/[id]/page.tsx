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
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-[8.5in] px-8 py-10 print:p-0">
        <div className="mb-6 flex justify-end print:hidden">
          <PrintButton />
        </div>
        <article className="whitespace-pre-wrap font-serif text-[12pt] leading-relaxed">{row.letter}</article>
      </div>
    </div>
  );
}
