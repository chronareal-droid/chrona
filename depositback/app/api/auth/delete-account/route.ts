import { NextResponse } from "next/server";
import { getSession, clearSessionCookie } from "@/lib/auth";
import { prisma } from "@/db";

/**
 * POST /api/auth/delete-account
 *
 * Permanently deletes the authenticated user's account and all associated data.
 * Requires a JSON body with { confirmation: "DELETE" } as a safety check.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Require explicit confirmation
  let body: { confirmation?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.confirmation !== "DELETE") {
    return NextResponse.json(
      { error: 'Confirmation required. Send { "confirmation": "DELETE" }' },
      { status: 400 }
    );
  }

  // Delete the user from the database
  await prisma.user.delete({
    where: { id: session.userId },
  });

  // Clear the session cookie so the user is logged out
  await clearSessionCookie();

  return NextResponse.json({ deleted: true });
}
