# SWFT Personal Trainer App

Native iOS app (SwiftUI) for a premium, white-label fitness concierge experience. Personal trainers get configurable branding; clients get onboarding, video library, workouts, journaling, and progress tracking.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL migrations in order (Dashboard → SQL Editor):
   - `supabase/migrations/20250314000001_initial_schema.sql`
   - `supabase/migrations/20250314000002_rls.sql`
3. Create Storage buckets (see `supabase/README.md`).
4. Copy your **Project URL** and **anon key**.

### 2. iOS app

1. Open `swft-personal-trainer-app.xcodeproj` in Xcode.
2. Add Supabase config (do not commit real keys):
   - Add to the app target’s **Info** tab (Custom iOS Target Properties):
     - `SUPABASE_URL` = your project URL
     - `SUPABASE_ANON_KEY` = your anon key  
   Or use an xcconfig file and reference these keys there.
3. Build and run (iPhone 17 simulator or device).

### 3. First trainer and invite flow

- Create a user in Supabase Auth (Dashboard → Authentication).
- Insert a row into `trainers` with that user’s `user_id` (and optional display name, calendly_url, etc.).
- Clients sign up with an **invite code** = the trainer’s `trainers.id` (UUID). Or use a universal link: `yourapp://join?trainer=<trainer_uuid>` so the app stores the pending invite and pre-fills the code on sign up.

## Architecture

- **App/** – Root view, routing by auth and role.
- **Core/** – Design system, theme, Supabase client, models.
- **Features/** – Authentication, Onboarding, Dashboard (home), Workouts, Journal, Progress (leaderboard), Trainer dashboard.

See `instructions.md` for product and UX direction and `.cursor/rules/ios-engineering.mdc` for engineering standards.

## Trainer web dashboard

For full trainer management (branding, videos, announcements, exercises, client list, journal/completion views), a companion web dashboard is recommended. See `docs/trainer-dashboard.md`.
