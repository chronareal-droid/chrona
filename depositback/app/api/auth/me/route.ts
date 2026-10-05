import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * GET /api/auth/me
 *
 * Returns the current user's session data, or { user: null } if not
 * authenticated. Always returns 200 to avoid browser console errors
 * from non-2xx responses on the landing page auth check.
 */
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      userId: session.userId,
      email: session.email,
      name: session.name,
      profileImageUrl: session.profileImageUrl,
      plan: session.plan,
    },
  });
}
