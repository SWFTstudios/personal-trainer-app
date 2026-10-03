# Trainer Kit (web)

White-label website + booking platform for independent trainers, sold as a $29 / $49 monthly
subscription. It runs entirely on Cloudflare:

| Cloudflare | Used for |
| --- | --- |
| **Workers** | The Next.js app (via [OpenNext](https://opennext.js.org/cloudflare)) |
| **D1** | All data: accounts, sessions, trainers, CMS pages/posts, services, bookings |
| **R2** | CMS image uploads, served at `/media/...` |

## What trainers get

- **Website CMS**: block-based pages (hero, text, image, services, testimonials, FAQ, book-now banner,
  gallery), a blog with Markdown, and a media library. Brand color, logo and menu are per trainer.
- **Booking**: clients pick a session and a time from the trainer's weekly hours (trainer's timezone,
  2h notice, 30 days out) and answer intake questions.
- **Payments**: Stripe Checkout; money goes to the trainer's own Stripe Express account.
- **Dashboard**: overview stats and setup checklist, bookings, clients (with CSV export), pages,
  blog, media, branding, services, availability, intake, billing.
- **Platform admin** at `/admin` (emails in `ADMIN_EMAILS`): MRR, trials, signups, bookings, every trainer.

Public sites live at `/<slug>`, `/<slug>/<page>`, `/<slug>/blog`, `/<slug>/book`. A site is live only
when it is published and the subscription is active or trialing.

## Layout

| Piece | Where |
| --- | --- |
| D1 schema (+ double-booking triggers) | `migrations/0001_init.sql` |
| Data access, auth (PBKDF2 + D1 sessions) | `lib/db.ts`, `lib/auth/` |
| CMS block schema, Markdown renderer, image sniffing | `lib/cms/` |
| Public site rendering | `app/[slug]`, `components/site/Blocks.tsx` |
| Dashboard + CMS editors | `app/dashboard`, `components/dashboard/` |
| Booking API, Stripe webhook | `app/api/` |

Notes:

- **Double booking**: SQLite triggers abort any insert or revive that overlaps a confirmed booking or an
  unexpired payment hold. D1 runs writes one at a time, so this can't race.
- **Tenancy**: every dashboard query and mutation is scoped by the signed-in trainer's id.
- **Uploads** are checked by file bytes (JPEG/PNG/GIF/WebP only; SVG rejected) and capped at 5 MB.
- **CMS content** is validated with zod and rendered as React elements, never raw HTML.

## Setup

```bash
npm install
npx wrangler login
npx wrangler d1 create trainer-kit        # paste the database_id into wrangler.jsonc
npx wrangler r2 bucket create trainer-kit-media
npm run db:migrate                        # applies migrations/ to the remote D1
```

Set `SITE_URL` in `wrangler.jsonc` `vars`, then add secrets:

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put STRIPE_PRICE_STARTER   # $29/mo price id
npx wrangler secret put STRIPE_PRICE_PRO       # $49/mo price id
npx wrangler secret put ADMIN_EMAILS           # you@example.com
npm run deploy
```

Stripe (platform account):

- Enable **Connect** (Express accounts) and the **Customer portal**.
- Webhook endpoint `<SITE_URL>/api/stripe/webhook` with `checkout.session.completed`,
  `checkout.session.expired`, `customer.subscription.created|updated|deleted`.
- Optional Connect webhook to the same URL for `account.updated`.

## Local development

```bash
cp .env.example .dev.vars    # SITE_URL=http://localhost:8787 etc.
npm run db:migrate:local
npm run preview              # builds the Worker and runs it in workerd with local D1 + R2
```

`npm run dev` (Next dev server) also works; it gets local D1/R2 bindings through Wrangler.

## Checks

```bash
npm run typecheck
npm test          # slots, CMS/Markdown safety, image sniffing, passwords, D1 triggers on SQLite
npm run deploy    # or: npx opennextjs-cloudflare build
```

## Not in this cut

Email (booking confirmations, password reset): add Resend or Cloudflare Email. Custom domains for Pro
(Cloudflare for SaaS), date-specific time off, rescheduling, refunds on cancel, login rate limiting.
