function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const productName = process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "Built By Me EZ";

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecretKey: () => required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),
  platformFeeBps: () => Number(process.env.PLATFORM_FEE_BPS ?? 0) || 0,
};
