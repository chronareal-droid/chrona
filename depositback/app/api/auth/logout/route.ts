import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

/**
 * GET /api/auth/logout
 * POST /api/auth/logout
 *
 * Clears the session cookie and redirects to the home page.
 */
async function handleLogout(request: NextRequest) {
  await clearSessionCookie();

  let next = request.nextUrl.searchParams.get("next") ?? "/";
  if (!next.startsWith("/") || next.startsWith("//")) {
    next = "/";
  }
  return NextResponse.redirect(new URL(next, request.url));
}

export { handleLogout as GET, handleLogout as POST };
