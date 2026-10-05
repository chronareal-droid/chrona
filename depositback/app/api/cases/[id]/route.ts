import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/db";
import { validateCaseInput, toCaseRecord } from "@/lib/cases";

type Params = { params: Promise<{ id: string }> };

/** PUT /api/cases/:id — replace the case facts (clears the old letter so it's regenerated). */
export async function PUT(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const result = validateCaseInput(await request.json().catch(() => null));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { count } = await prisma.depositCase.updateMany({
    where: { id, userId: session.userId },
    data: { ...result.data, letter: null, letterGeneratedAt: null },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const row = await prisma.depositCase.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ case: toCaseRecord(row) });
}

/** DELETE /api/cases/:id */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const { count } = await prisma.depositCase.deleteMany({
    where: { id, userId: session.userId },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
