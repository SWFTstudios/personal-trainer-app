# Supabase Setup

## 1. Create a project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon (public) key** for the iOS app.

## 2. Run migrations

In the Supabase Dashboard → **SQL Editor**, run the migrations in order:

1. `migrations/20250314000001_initial_schema.sql` — creates all tables and indexes.
2. `migrations/20250314000002_rls.sql` — enables RLS and policies.

Or use the Supabase CLI from this directory:

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

## 3. Storage buckets

In Dashboard → **Storage**, create:

- **logos** — public bucket for trainer logos. Policy: public read; upload only by authenticated users (trainer).
- **journal-photos** — private bucket for client journal photos. Policy: clients can upload/read their own; trainers can read their clients’ (via RLS or app logic using service role for trainer dashboard).

Storage policies can be added via SQL or in the Dashboard UI.

## 4. Auth

- Enable **Email** (and optionally **Magic Link**) in Authentication → Providers.
- No extra Auth config required for basic email sign up/sign in.

## 5. iOS app configuration

Add to your app (e.g. in a config file or xcconfig, never commit real keys to git):

- `SUPABASE_URL` = your Project URL
- `SUPABASE_ANON_KEY` = your anon key

Use these when initializing the Supabase Swift client in the app.
