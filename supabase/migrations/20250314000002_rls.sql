-- Row Level Security (RLS) for multi-tenant isolation
-- Clients see only their trainer's data and their own rows.
-- Trainers see only their clients and their own config.

ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_photos ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's trainer_id if they are a client (NULL otherwise)
CREATE OR REPLACE FUNCTION public.current_user_trainer_id()
RETURNS UUID AS $$
  SELECT trainer_id FROM public.clients WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: true if current user is a trainer
CREATE OR REPLACE FUNCTION public.current_user_is_trainer()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.trainers WHERE user_id = auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- TRAINERS: trainers can read/update their own row
-- -----------------------------------------------------------------------------
CREATE POLICY "Trainers can read own row"
  ON public.trainers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Trainers can update own row"
  ON public.trainers FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Trainers can insert own row"
  ON public.trainers FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- CLIENTS: clients read own row; trainers read clients for their trainer_id
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can read own client row"
  ON public.clients FOR SELECT
  USING (user_id = auth.uid() OR (public.current_user_is_trainer() AND trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid())));

CREATE POLICY "Clients can insert own row (e.g. on invite signup)"
  ON public.clients FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Clients can update own row"
  ON public.clients FOR UPDATE
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- ONBOARDING_ANSWERS: client sees own; trainer sees their clients'
-- -----------------------------------------------------------------------------
CREATE POLICY "Client or trainer can read onboarding answers"
  ON public.onboarding_answers FOR SELECT
  USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    OR client_id IN (SELECT c.id FROM public.clients c JOIN public.trainers t ON c.trainer_id = t.id WHERE t.user_id = auth.uid())
  );

CREATE POLICY "Client can insert own onboarding"
  ON public.onboarding_answers FOR INSERT
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

CREATE POLICY "Client can update own onboarding"
  ON public.onboarding_answers FOR UPDATE
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- TRAINER_VIDEOS: visible to clients of that trainer; trainer full CRUD
-- -----------------------------------------------------------------------------
CREATE POLICY "Trainer videos readable by trainer and their clients"
  ON public.trainer_videos FOR SELECT
  USING (
    trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid())
    OR trainer_id = public.current_user_trainer_id()
  );

CREATE POLICY "Trainer can manage own videos"
  ON public.trainer_videos FOR ALL
  USING (trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- TRAINER_ANNOUNCEMENTS: same as videos
-- -----------------------------------------------------------------------------
CREATE POLICY "Announcements readable by trainer and their clients"
  ON public.trainer_announcements FOR SELECT
  USING (
    trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid())
    OR trainer_id = public.current_user_trainer_id()
  );

CREATE POLICY "Trainer can manage own announcements"
  ON public.trainer_announcements FOR ALL
  USING (trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- EXERCISES: global (trainer_id NULL) readable by all; per-trainer by trainer + clients
-- -----------------------------------------------------------------------------
CREATE POLICY "Exercises readable by trainer or their clients or global"
  ON public.exercises FOR SELECT
  USING (
    trainer_id IS NULL
    OR trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid())
    OR trainer_id = public.current_user_trainer_id()
  );

CREATE POLICY "Trainer can manage own exercises"
  ON public.exercises FOR ALL
  USING (trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid()));

-- Allow insert of global exercises (trainer_id NULL) — optionally restrict to service role
CREATE POLICY "Allow global exercises for authenticated"
  ON public.exercises FOR INSERT
  WITH CHECK (trainer_id IS NULL OR trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- WORKOUTS: client owns; trainer read-only for their clients
-- -----------------------------------------------------------------------------
CREATE POLICY "Workouts readable by owner or their trainer"
  ON public.workouts FOR SELECT
  USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    OR client_id IN (SELECT c.id FROM public.clients c JOIN public.trainers t ON c.trainer_id = t.id WHERE t.user_id = auth.uid())
  );

CREATE POLICY "Client can manage own workouts"
  ON public.workouts FOR ALL
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- WORKOUT_EXERCISES: same as workouts (via workout_id)
-- -----------------------------------------------------------------------------
CREATE POLICY "Workout exercises readable by workout owner or trainer"
  ON public.workout_exercises FOR SELECT
  USING (
    workout_id IN (SELECT id FROM public.workouts WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
    OR workout_id IN (SELECT w.id FROM public.workouts w JOIN public.clients c ON w.client_id = c.id JOIN public.trainers t ON c.trainer_id = t.id WHERE t.user_id = auth.uid())
  );

CREATE POLICY "Client can manage workout exercises for own workouts"
  ON public.workout_exercises FOR ALL
  USING (workout_id IN (SELECT id FROM public.workouts WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())));

-- -----------------------------------------------------------------------------
-- WORKOUT_COMPLETIONS: client insert/read own; trainer read their clients'
-- -----------------------------------------------------------------------------
CREATE POLICY "Completions readable by client or trainer"
  ON public.workout_completions FOR SELECT
  USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    OR client_id IN (SELECT c.id FROM public.clients c JOIN public.trainers t ON c.trainer_id = t.id WHERE t.user_id = auth.uid())
  );

CREATE POLICY "Client can insert own completions"
  ON public.workout_completions FOR INSERT
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- JOURNAL_ENTRIES: client full CRUD own; trainer read their clients'
-- -----------------------------------------------------------------------------
CREATE POLICY "Journal entries readable by client or trainer"
  ON public.journal_entries FOR SELECT
  USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    OR client_id IN (SELECT c.id FROM public.clients c JOIN public.trainers t ON c.trainer_id = t.id WHERE t.user_id = auth.uid())
  );

CREATE POLICY "Client can manage own journal entries"
  ON public.journal_entries FOR ALL
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- JOURNAL_PHOTOS: same as journal_entries (via journal_entry_id)
-- -----------------------------------------------------------------------------
CREATE POLICY "Journal photos readable by entry owner or trainer"
  ON public.journal_photos FOR SELECT
  USING (
    journal_entry_id IN (
      SELECT je.id FROM public.journal_entries je
      WHERE je.client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
         OR je.client_id IN (SELECT c.id FROM public.clients c JOIN public.trainers t ON c.trainer_id = t.id WHERE t.user_id = auth.uid())
    )
  );

CREATE POLICY "Client can manage journal photos for own entries"
  ON public.journal_photos FOR ALL
  USING (
    journal_entry_id IN (SELECT id FROM public.journal_entries WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
  );
