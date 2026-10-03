import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | undefined;

// Workers have no Node http module: use fetch and WebCrypto.
export function stripe(): Stripe {
  client ??= new Stripe(env.stripeSecretKey(), { httpClient: Stripe.createFetchHttpClient() });
  return client;
}

export const webCrypto = Stripe.createSubtleCryptoProvider();
