import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { planForPriceId } from "@/lib/plans";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, env.stripeWebhookSecret());
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.metadata?.kind === "booking" && session.payment_status === "paid") {
        const { error } = await admin
          .from("bookings")
          .update({ status: "confirmed", hold_expires_at: null })
          .eq("id", session.metadata.booking_id)
          .neq("status", "confirmed");
        // Payment landed after the hold lapsed and the slot was rebooked: needs a manual refund.
        if (error) console.error("paid booking could not be confirmed", session.metadata.booking_id, error);
      }
      if (session.mode === "subscription" && session.client_reference_id && session.subscription) {
        const sub = await stripe().subscriptions.retrieve(session.subscription as string);
        await admin
          .from("trainers")
          .update({
            stripe_customer_id: session.customer as string,
            plan: planForPriceId(sub.items.data[0]?.price.id),
            subscription_status: sub.status,
          })
          .eq("id", session.client_reference_id);
      }
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object;
      if (session.metadata?.kind === "booking") {
        await admin
          .from("bookings")
          .update({ status: "cancelled" })
          .eq("id", session.metadata.booking_id)
          .eq("status", "pending_payment");
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const update = { plan: planForPriceId(sub.items.data[0]?.price.id), subscription_status: sub.status };
      const query = admin.from("trainers").update(update);
      const trainerId = sub.metadata?.trainer_id;
      await (trainerId ? query.eq("id", trainerId) : query.eq("stripe_customer_id", sub.customer as string));
      break;
    }
    case "account.updated": {
      const account = event.data.object;
      await admin
        .from("trainers")
        .update({ stripe_charges_enabled: account.charges_enabled })
        .eq("stripe_account_id", account.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
