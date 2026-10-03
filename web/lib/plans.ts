import type { Plan } from "@/lib/types";

export const PLANS: Record<Plan, { name: string; priceMonthly: number; features: string[] }> = {
  starter: {
    name: "Starter",
    priceMonthly: 29,
    features: ["Branded client app + website", "Video library, uploads & social import", "Live alerts + workout feedback", "Booking, payments & intake forms"],
  },
  pro: {
    name: "Pro",
    priceMonthly: 49,
    features: ["Everything in Starter", "Remove platform branding", "Priority support"],
  },
};

export const TRIAL_DAYS = 14;

export function priceIdFor(plan: Plan): string {
  const id = plan === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_STARTER;
  if (!id) throw new Error(`Missing Stripe price for plan ${plan}`);
  return id;
}

export function planForPriceId(priceId: string | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  return null;
}

export function hasActiveSubscription(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}
