# Trainer Kit (web)

White-label booking + site kit for independent trainers, sold as a $29 / $49 monthly subscription.
Each trainer gets:

- **Landing page** at `/<slug>`: name, logo, cover photo, headline, bio, brand color, services
- **Booking**: clients pick a session and a time from the trainer's weekly hours (trainer's timezone, 2h notice, 30 days out)
- **Payments**: clients pay by card at booking via Stripe Checkout; money goes to the trainer's own Stripe Express account
- **Intake form**: custom questions answered at booking, shown on each booking in the dashboard
- **Dashboard** at `/dashboard`: setup checklist, upcoming bookings, site, services, hours, intake, billing

The product name and marketing homepage (`/`) read from `NEXT_PUBLIC_PRODUCT_NAME`.

## How it fits together

| Piece | Where |
| --- | --- |
| Schema, RLS, double-booking guard | `../supabase/migrations/20251003000001_booking_kit.sql` |
| Slot generation (pure, unit tested) | `lib/slots.ts` |
| Public pages + booking API (service role, explicit columns) | `app/[slug]`, `app/api/slots`, `app/api/bookings` |
| Trainer dashboard (user session, RLS) | `app/dashboard` |
| Stripe webhook | `app/api/stripe/webhook` |

A site is live only when it is **published** and the trainer's subscription is **active or trialing**.
Paid sessions also need Stripe Connect finished; free sessions (e.g. a consult) work without it.

Paid bookings are held as `pending_payment` for the 30-minute Checkout window (+5 min grace). A Postgres
exclusion constraint stops two live bookings overlapping, so a race between two clients fails cleanly
with "that time was just taken".

## Setup

1. **Supabase**: run the migrations in `../supabase/migrations` (same project as the iOS app). Enable email
   (magic link) auth and add `<SITE_URL>/auth/callback` to the redirect allow list.
2. **Stripe** (platform account):
   - Enable **Connect** (Express accounts).
   - Create a product with two monthly prices ($29 Starter, $49 Pro) and copy their price IDs.
   - Turn on the **Customer portal** (Settings → Billing → Customer portal).
   - Add a webhook endpoint at `<SITE_URL>/api/stripe/webhook` listening to:
     `checkout.session.completed`, `checkout.session.expired`,
     `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
   - Optionally add a **Connect** webhook to the same URL for `account.updated` (the billing page also
     refreshes this when the trainer returns from onboarding).
3. `cp .env.example .env.local` and fill it in.
4. `npm install && npm run dev`

Local webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

## Not in this first cut

- Email/SMS confirmations and reminders (Stripe receipts cover paid bookings for now)
- Image upload (logo/cover are URLs; the `logos` storage bucket is ready for it)
- Custom domains for Pro, date-specific time off, rescheduling, automatic refunds on cancel
