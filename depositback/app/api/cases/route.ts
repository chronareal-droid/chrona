import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/db";
import { validateCaseInput, toCaseRecord } from "@/lib/cases";
import { logActivity } from "@/lib/activity";

/**
 * POST /api/cases — create a deposit case for the signed-in renter.
 * Free plan: anyone signed in can create cases; the letter is gated separately.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const result = validateCaseInput(await request.json().catch(() => null));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const row = await prisma.depositCase.create({
    data: { ...result.data, userId: session.userId },
  });
  logActivity(session.userId, "case", `Opened a deposit case for ${row.rentalAddress}`);

  return NextResponse.json({ case: toCaseRecord(row) }, { status: 201 });
}
