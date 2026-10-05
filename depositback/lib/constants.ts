// ---------------------------------------------------------------------------
// App configuration — edit these to customize your SaaS
// ---------------------------------------------------------------------------

import { definePlans } from "whop-kit/core";
export type { BillingInterval, PlanMetadataEntry } from "whop-kit/core";

/** Your app's name — shown in the header, sidebar, login page, and metadata */
export const APP_NAME = "Keepsit";

/** Your app's description — used in metadata and the landing page */
export const APP_DESCRIPTION =
  "Get your security deposit back, with your state's law on your side";

/** External links — update these before launch */
export const LINKS = {
  terms: "/terms",
  privacy: "/privacy",
} as const;

/** Shown wherever we present legal information. Keepsit is not a law firm. */
export const LEGAL_DISCLAIMER =
  "Keepsit is a self-help document tool, not a law firm, and does not give legal advice. State laws change. Check the statute we cite, or talk to a local tenant-rights organization or attorney, before you rely on it.";

// ---------------------------------------------------------------------------
// Plan definitions — the single source of truth for your tier structure
// ---------------------------------------------------------------------------

/**
 * Keepsit has one free tier and one paid tier.
 *
 * - free: deposit check (deadline + what your landlord may owe) and case tracking
 * - kit:  one-time purchase that unlocks the demand letter for every case
 *
 * The kit is a one-time Whop plan. Whop gives the buyer a lifetime membership,
 * so the existing membership webhooks unlock it. It uses the "monthly" plan ID
 * slot (NEXT_PUBLIC_WHOP_KIT_PLAN_ID); the pricing UI labels it "one-time".
 */
export const plans = definePlans({
  free: {
    name: "Free check",
    description: "Find out what your landlord owes you",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "Your state's return deadline",
      "Whether your landlord is late",
      "Penalty your state allows",
      "Save and track your case",
    ],
    highlighted: false,
  },
  kit: {
    name: "Recovery Kit",
    description: "Everything you need to demand your money back",
    priceMonthly: 0, // Real price synced from Whop API
    priceYearly: 0,
    billingIntervals: ["monthly"],
    features: [
      "Demand letter citing your state's law",
      "Rebuttal of every deduction",
      "Print-ready PDF to mail certified",
      "Small claims next steps for your state",
      "Unlimited cases, pay once",
    ],
    highlighted: true,
  },
});

/** Pricing label for paid plans (the kit is a one-time purchase). */
export const PAID_PRICE_SUFFIX = "one-time";

// ---------------------------------------------------------------------------
// Backwards-compatible exports — derived from the plan system
// Everything below is auto-derived so existing imports keep working.
// ---------------------------------------------------------------------------

export const PLAN_METADATA = plans.metadata;
export type PlanKey = keyof typeof PLAN_METADATA;
export const PLAN_KEYS = plans.keys;
export const PLAN_RANK = plans.ranks as Record<string, number>;
export const DEFAULT_PLAN = plans.defaultPlan;

// Positional tier references — use these in app code instead of hardcoding
// plan keys like "starter", so renaming or regenerating tiers (e.g. via the
// whop-kit CLI) never breaks gating.
/** First paid tier — the key right above the default plan */
export const FIRST_PAID_PLAN: PlanKey = PLAN_KEYS[1] ?? DEFAULT_PLAN;
/** Highest tier in the hierarchy */
export const TOP_PLAN: PlanKey = PLAN_KEYS[PLAN_KEYS.length - 1];

export const getPlanBillingIntervals = plans.getBillingIntervals;
export const planConfigKey = plans.configKey;
export const planConfigKeyYearly = plans.configKeyYearly;
export const planPriceConfigKey = plans.priceConfigKey;
export const planPriceConfigKeyYearly = plans.priceConfigKeyYearly;
export const planNameConfigKey = plans.nameConfigKey;

// Env var naming convention: NEXT_PUBLIC_WHOP_{PLAN_KEY}_PLAN_ID
export function planEnvVar(planKey: PlanKey): string {
  return `NEXT_PUBLIC_WHOP_${planKey.toUpperCase()}_PLAN_ID`;
}
export function planEnvVarYearly(planKey: PlanKey): string {
  return `NEXT_PUBLIC_WHOP_${planKey.toUpperCase()}_PLAN_ID_YEARLY`;
}
