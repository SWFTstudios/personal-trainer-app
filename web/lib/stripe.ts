import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | undefined;

export function stripe(): Stripe {
  client ??= new Stripe(env.stripeSecretKey());
  return client;
}
