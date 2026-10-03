import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { isDbError, run } from "@/lib/db";
import { env } from "@/lib/env";
import { planForPriceId } from "@/lib/plans";
import { stripe, webCrypto } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(
      await request.text(),
      signature,
      env.stripeWebhookSecret(),
      undefined,
      webCrypto,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.metadata?.kind === "booking" && session.payment_status === "paid") {
        try {
          await run(
            "UPDATE bookings SET status = 'confirmed', hold_expires_at = NULL WHERE id = ? AND status <> 'confirmed'",
            session.metadata.booking_id,
          );
        } catch (e) {
          // Payment landed after the hold lapsed and the slot was rebooked: needs a manual refund.
          if (!isDbError(e, "slot_taken")) throw e;
          console.error("paid booking could not be confirmed; refund needed", session.metadata.booking_id);
        }
      }
      if (session.mode === "subscription" && session.client_reference_id && session.subscription) {
        const sub = await stripe().subscriptions.retrieve(session.subscription as string);
        await run(
          "UPDATE trainers SET stripe_customer_id = ?, plan = ?, subscription_status = ? WHERE id = ?",
          session.customer as string,
          planForPriceId(sub.items.data[0]?.price.id),
          sub.status,
          session.client_reference_id,
        );
      }
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object;
      if (session.metadata?.kind === "booking") {
        await run("UPDATE bookings SET status = 'cancelled' WHERE id = ? AND status = 'pending_payment'", session.metadata.booking_id);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const plan = planForPriceId(sub.items.data[0]?.price.id);
      const trainerId = sub.metadata?.trainer_id;
      if (trainerId) {
        await run("UPDATE trainers SET plan = ?, subscription_status = ? WHERE id = ?", plan, sub.status, trainerId);
      } else {
        await run("UPDATE trainers SET plan = ?, subscription_status = ? WHERE stripe_customer_id = ?", plan, sub.status, sub.customer as string);
      }
      break;
    }
    case "account.updated": {
      const account = event.data.object;
      await run("UPDATE trainers SET stripe_charges_enabled = ? WHERE stripe_account_id = ?", account.charges_enabled ? 1 : 0, account.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
