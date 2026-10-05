"use client";

import { PLAN_RANK, type PlanKey } from "@/lib/constants";

interface PlanGateProps {
  /** The user's current plan (pass from server parent via session.plan) */
  plan: string;
  /** Minimum plan required to show children */
  minimum: PlanKey;
  /** Content shown when plan is sufficient */
  children: React.ReactNode;
  /** Optional fallback when plan is insufficient */
  fallback?: React.ReactNode;
}

/**
 * Conditionally render content based on the user's plan level.
 *
 * The plan is passed as a prop from a server component (always fresh from DB).
 *
 * Prefer the positional constants (FIRST_PAID_PLAN, TOP_PLAN) or your own
 * literal keys from definePlans() — positional references survive tier
 * renames and CLI-regenerated plan structures.
 *
 * @example
 * <PlanGate plan={session.plan} minimum={TOP_PLAN}>
 *   <ProFeatureWidget />
 * </PlanGate>
 *
 * @example
 * <PlanGate plan={session.plan} minimum={FIRST_PAID_PLAN} fallback={<UpgradeBanner />}>
 *   <AdvancedAnalytics />
 * </PlanGate>
 */
export function PlanGate({ plan, minimum, children, fallback = null }: PlanGateProps) {
  const userRank = PLAN_RANK[plan] ?? 0;
  const requiredRank = PLAN_RANK[minimum] ?? 0;

  if (userRank >= requiredRank) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
