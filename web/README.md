# Trainer Kit (web)

White-label website + booking platform for independent trainers, sold as a $29 / $49 monthly
subscription. It runs entirely on Cloudflare:

| Cloudflare | Used for |
| --- | --- |
| **Workers** | The Next.js app (via [OpenNext](https://opennext.js.org/cloudflare)) |
| **D1** | All data: accounts, trainers, members, videos, workouts, notifications, CMS, bookings |
| **R2** | Image and video uploads, served at `/media/...` (with range requests) |
| **Cron Triggers** | Auto-sync of connected YouTube / Vimeo channels every 30 minutes |

## What trainers get

Everything is mobile-first, in light and dark mode, and branded with the trainer's color, logo,
headline font (modern / editorial / athletic) and corner style.

- **Member app** at `/<slug>/app`: an installable web app (per-trainer manifest + icon) with bottom tabs.
  - **Home**: live banner, stats and streak, latest tips, announcements.
  - **Videos**: programs/collections, categories, players.
  - **Log**: workout logger with sets, reps, load and effort.
  - **Workouts**: history and feedback threads.
  - **Alerts**: notification inbox.
- **Video library**:
  - Upload directly to R2 (chunked multipart, up to 2 GB, thumbnail captured in the browser).
  - Link YouTube, Vimeo, TikTok, Instagram, Loom or `.mp4` (title and thumbnail filled in automatically).
  - Paste share links in bulk.
  - Connect a YouTube or Vimeo channel to pick videos to import, and optionally auto-sync new uploads every 30 minutes (cron).
  - Each video has a name, description, category, any number of collections, a thumbnail, and members-only or public visibility.
- **Live & alerts**: "Go live" on Instagram, YouTube, TikTok, Twitch, Facebook or X (now or scheduled) and announcements. Members get web push notifications plus an in-app inbox.
- **Workout feedback**: members send workouts; trainers reply from a "needs feedback" queue; members are notified.
- **Website CMS**:
  - Block pages, including a **Videos** block that shows a collection, category or the latest public videos.
  - Blog and media library.
- **Booking + payments + intake**, a **dashboard** (bottom tabs on phones, sidebar on desktop) and a **platform admin**.

Public sites live at `/<slug>`, the member app at `/<slug>/app`. Both are live only when published
and the subscription is active or trialing.

## Layout

| Piece | Where |
| --- | --- |
| D1 schema (+ double-booking triggers) | `migrations/0001_init.sql` |
| Members, videos, collections, live, notifications, workouts | `migrations/0002_client_app.sql` |
| Worker entry (OpenNext + cron auto-sync) | `worker.ts` |
| Web Push (VAPID + aes128gcm on WebCrypto) | `lib/push/` |
| Channel import (YouTube / Vimeo) | `lib/sync/` |
| Member app | `app/[slug]/app`, `components/app/` |
| Design tokens, themes, brand contrast | `app/globals.css`, `lib/brand.ts` |
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
npm run vapid                                  # prints a key pair for push notifications
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put VAPID_SUBJECT          # mailto:you@example.com
# Optional, for full channel imports (otherwise YouTube shows the latest 15 uploads):
npx wrangler secret put YOUTUBE_API_KEY
npx wrangler secret put VIMEO_ACCESS_TOKEN
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
npm test          # slots, brand contrast, CMS safety, video parsing/sniffing, web push crypto, sync parsing, workouts, D1 schema
npm run deploy    # or: npx opennextjs-cloudflare build
```

## Notes

- **Push on iPhone** works once the member adds the app to their Home Screen (iOS 16.4+); the app explains this.
- **TikTok and Instagram** don't let third-party apps list a creator's videos without their own approved
  developer app (TikTok Display API, Meta Graph API review). Until then, trainers paste share links in bulk.
- **Uploaded videos** are served from R2 at unguessable URLs with range support. They aren't transcoded; for
  adaptive streaming at scale, Cloudflare Stream is the upgrade path.
- **Live detection** is a one-tap "Go live" from the trainer's phone. Automatic detection would need each
  platform's API.

## Not in this cut

Email (booking confirmations, password reset, feedback emails): add Resend or Cloudflare Email. Offline workout logging. Custom domains for Pro
(Cloudflare for SaaS), date-specific time off, rescheduling, refunds on cancel, login rate limiting.
