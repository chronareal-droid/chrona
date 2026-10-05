import { NextResponse } from "next/server";
import { getPlansConfig } from "@/lib/config";

/**
 * GET /api/config/plans — Returns plan config for client components.
 * Plan IDs are not secret (they're visible in checkout URLs).
 */
export async function GET() {
  const plans = await getPlansConfig();
  return NextResponse.json(plans);
}
