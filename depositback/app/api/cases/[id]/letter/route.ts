import { NextResponse } from "next/server";
import { getSession, hasMinimumPlan } from "@/lib/auth";
import { prisma } from "@/db";
import { FIRST_PAID_PLAN } from "@/lib/constants";
import { toCaseRecord } from "@/lib/cases";
import { generateLetter } from "@/lib/letter";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

/** POST /api/cases/:id/letter — generate (or regenerate) the demand letter. Recovery Kit only. */
export async function POST(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!hasMinimumPlan(session.plan, FIRST_PAID_PLAN)) {
    return NextResponse.json({ error: "The demand letter is part of the Recovery Kit" }, { status: 402 });
  }
  const { id } = await params;

  const row = await prisma.depositCase.findFirst({ where: { id, userId: session.userId } });
  if (!row) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const record = toCaseRecord(row);
  if (record.amountReturned >= record.depositAmount) {
    return NextResponse.json({ error: "Your full deposit has been returned, so there's nothing to demand" }, { status: 400 });
  }

  const { text, aiDrafted } = await generateLetter(record);
  const updated = await prisma.depositCase.update({
    where: { id },
    data: { letter: text, letterGeneratedAt: new Date() },
  });
  logActivity(session.userId, "case", `Generated a demand letter for ${row.rentalAddress}`);

  return NextResponse.json({ case: toCaseRecord(updated), aiDrafted });
}
