-- White-Label Personal Trainer App — Initial Schema
-- Run this in Supabase SQL Editor after creating a project, or use Supabase CLI: supabase db push

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TRAINERS
-- =============================================================================
CREATE TABLE public.trainers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  logo_url TEXT,
  accent_color_hex TEXT,
  secondary_color_hex TEXT,
  calendly_url TEXT,
  app_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trainers_user_id ON public.trainers(user_id);

-- =============================================================================
-- CLIENTS (linked to trainer)
-- =============================================================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  onboarding_completed_at TIMESTAMPTZ,
  invite_code_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_clients_trainer_id ON public.clients(trainer_id);

-- =============================================================================
-- ONBOARDING ANSWERS
-- =============================================================================
CREATE TABLE public.onboarding_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

CREATE INDEX idx_onboarding_answers_client_id ON public.onboarding_answers(client_id);

-- =============================================================================
-- TRAINER VIDEOS (YouTube + explainer links)
-- =============================================================================
CREATE TABLE public.trainer_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  type TEXT NOT NULL DEFAULT 'youtube', -- 'youtube' | 'explainer'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trainer_videos_trainer_id ON public.trainer_videos(trainer_id);
CREATE INDEX idx_trainer_videos_created_at ON public.trainer_videos(created_at DESC);

-- =============================================================================
-- TRAINER ANNOUNCEMENTS
-- =============================================================================
CREATE TABLE public.trainer_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trainer_announcements_trainer_id ON public.trainer_announcements(trainer_id);
CREATE INDEX idx_trainer_announcements_created_at ON public.trainer_announcements(created_at DESC);

-- =============================================================================
-- EXERCISES (global or per-trainer; category: arms, abs, quads, etc.)
-- =============================================================================
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID REFERENCES public.trainers(id) ON DELETE CASCADE, -- NULL = global
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- arms, abs, quads, etc.
  discipline TEXT,
  video_url TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercises_trainer_id ON public.exercises(trainer_id);
CREATE INDEX idx_exercises_category ON public.exercises(category);

-- =============================================================================
-- WORKOUTS (client-created, scheduled by day)
-- =============================================================================
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scheduled_days INTEGER[] NOT NULL DEFAULT '{}', -- 1=Mon .. 7=Sun, or use smallint[]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workouts_client_id ON public.workouts(client_id);

-- =============================================================================
-- WORKOUT EXERCISES (join: workout + exercise, order, sets, reps)
-- =============================================================================
CREATE TABLE public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  "order" SMALLINT NOT NULL DEFAULT 0,
  sets SMALLINT,
  reps TEXT, -- e.g. "10" or "8-12"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workout_exercises_workout_id ON public.workout_exercises(workout_id);

-- =============================================================================
-- WORKOUT COMPLETIONS (for leaderboard and tracking)
-- =============================================================================
CREATE TABLE public.workout_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workout_completions_client_id ON public.workout_completions(client_id);
CREATE INDEX idx_workout_completions_scheduled_date ON public.workout_completions(scheduled_date);

-- =============================================================================
-- JOURNAL ENTRIES
-- =============================================================================
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood_text TEXT,
  workout_difficulty_notes TEXT,
  food_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, date)
);

CREATE INDEX idx_journal_entries_client_id ON public.journal_entries(client_id);
CREATE INDEX idx_journal_entries_date ON public.journal_entries(date DESC);

-- =============================================================================
-- JOURNAL PHOTOS (Supabase Storage path reference)
-- =============================================================================
CREATE TABLE public.journal_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_photos_journal_entry_id ON public.journal_photos(journal_entry_id);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trainers_updated_at
  BEFORE UPDATE ON public.trainers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
