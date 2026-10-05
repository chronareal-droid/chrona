import Link from "next/link";
import { Check } from "lucide-react";
import { DEFAULT_PLAN, PAID_PRICE_SUFFIX, type PlanKey } from "@/lib/constants";
import type { PlansConfig } from "@/lib/config";
import { buttonClass, Arrow } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Two offers, deliberately unequal: the free check as a quiet column, the
 * Recovery Kit as an ink sheet. Keepsit's paid tier is a one-time plan.
 */
export function PricingCards({ plans }: { plans: Partial<PlansConfig> }) {
  const keys = Object.keys(plans) as PlanKey[];

  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch">
      {keys.map((key) => {
        const plan = plans[key];
        if (!plan) return null;
        const isFree = key === DEFAULT_PLAN;
        const price = plan.priceMonthly;

        return (
          <div
            key={key}
            className={cn(
              "relative flex flex-col rounded-2xl p-7 sm:p-9",
              isFree
                ? "border border-[var(--border)] lg:col-span-5"
                : "bg-[var(--foreground)] text-[var(--background)] shadow-[var(--shadow-sheet)] lg:col-span-7",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium">{plan.name}</h3>
                <p className={cn("mt-1 text-sm", isFree ? "text-[var(--muted)]" : "opacity-60")}>{plan.description}</p>
              </div>
              {!isFree && (
                <span className="rounded-full border border-current/25 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] opacity-80">
                  Pay once
                </span>
              )}
            </div>

            <p className="mt-8 flex items-baseline gap-2">
              {isFree ? (
                <span className="display text-[4.5rem] leading-none">$0</span>
              ) : price > 0 ? (
                <>
                  <span className="display text-[4.5rem] leading-none sm:text-[5.5rem]">${price}</span>
                  <span className="font-mono text-xs uppercase tracking-[0.1em] opacity-60">{PAID_PRICE_SUFFIX}</span>
                </>
              ) : (
                <span className="display text-[2.5rem] leading-none opacity-60">Coming soon</span>
              )}
            </p>

            <ul className={cn("mt-8 grid gap-3 border-t pt-7", isFree ? "border-[var(--border)]" : "border-current/15 sm:grid-cols-2")}>
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm">
                  <Check
                    className={cn("mt-0.5 h-4 w-4 shrink-0", isFree ? "text-[var(--muted)]" : "text-[var(--accent)]")}
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                  <span className={isFree ? "text-[var(--muted)]" : "opacity-85"}>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-9">
              {isFree ? (
                <Link href="/check" className={buttonClass("secondary", "lg", "w-full")}>
                  Check for free
                </Link>
              ) : plan.whopPlanId ? (
                <Link
                  href={`/checkout?plan=${key}&interval=monthly`}
                  prefetch={false}
                  className={buttonClass("primary", "lg", "w-full sm:w-auto")}
                >
                  Get the Recovery Kit <Arrow />
                </Link>
              ) : (
                <span className="block text-sm opacity-60">Connect a Whop plan in setup to sell the kit.</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
