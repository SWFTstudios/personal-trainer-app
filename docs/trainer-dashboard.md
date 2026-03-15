# Trainer Web Dashboard (Recommended)

The app supports **trainer mode** in-app with a minimal dashboard. For full management of branding, content, and client insights, a **companion web dashboard** is recommended.

## Recommended features

1. **Profile & branding**
   - Edit display name, app name
   - Upload logo (store in Supabase Storage `logos` bucket)
   - Set accent color (hex)
   - Set Calendly/Cal.com URL

2. **Content**
   - CRUD trainer videos (YouTube URL, title, type)
   - CRUD trainer announcements

3. **Exercises**
   - CRUD exercises (name, category, discipline, video URL, instructions)
   - Categories: e.g. arms, abs, quads, back, etc.

4. **Clients**
   - List clients linked to the trainer
   - View onboarding answers
   - View workout completions (leaderboard data)
   - View journal entries (mood, food, workout notes) for prep before calls

5. **Auth**
   - Sign in with same Supabase Auth (email/password or magic link)
   - Ensure the signed-in user has a row in `trainers` (create one via SQL or admin when onboarding a trainer)

## Tech stack suggestion

- **Frontend**: React/Next.js or similar, using Supabase JS client
- **Auth**: Same Supabase project; RLS already restricts trainers to their own data
- **Storage**: Use Supabase Storage for logo uploads; store public URL in `trainers.logo_url`

## Data model

All tables and RLS are defined in `supabase/migrations/`. Trainers can only read/update their own `trainers` row and read/write their `trainer_videos`, `trainer_announcements`, and `exercises` (where `trainer_id` = their id). They can read their clients’ `clients`, `onboarding_answers`, `workouts`, `workout_completions`, and `journal_entries` via existing RLS policies.
