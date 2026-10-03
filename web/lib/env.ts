// Worker vars and secrets are exposed on process.env at request time (nodejs_compat).
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const siteUrl = () => (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const productName = () => process.env.PRODUCT_NAME ?? "Built By Me EZ";

export const env = {
  stripeSecretKey: () => required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),
  platformFeeBps: () => Number(process.env.PLATFORM_FEE_BPS ?? 0) || 0,
  adminEmails: () =>
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
};
