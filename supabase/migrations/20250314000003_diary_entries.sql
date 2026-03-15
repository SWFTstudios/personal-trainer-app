-- Diary entries: multiple timestamped entries per day (digital diary UX)
-- Replaces one-per-day journal_entries for the diary flow; journal_entries kept for legacy form.

-- =============================================================================
-- DIARY_ENTRIES
-- =============================================================================
CREATE TABLE public.diary_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  body_text TEXT,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  workout_custom_description TEXT
);

CREATE INDEX idx_diary_entries_client_id ON public.diary_entries(client_id);
CREATE INDEX idx_diary_entries_date ON public.diary_entries(date DESC);
CREATE INDEX idx_diary_entries_client_date ON public.diary_entries(client_id, date);

-- =============================================================================
-- DIARY_MEDIA (photos/videos per entry)
-- =============================================================================
CREATE TABLE public.diary_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diary_entry_id UUID NOT NULL REFERENCES public.diary_entries(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'image', -- 'image' | 'video'
  storage_path TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_diary_media_diary_entry_id ON public.diary_media(diary_entry_id);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================
CREATE TRIGGER diary_entries_updated_at
  BEFORE UPDATE ON public.diary_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_media ENABLE ROW LEVEL SECURITY;

-- Diary entries: client full CRUD own; trainer read their clients'
CREATE POLICY "Diary entries readable by client or trainer"
  ON public.diary_entries FOR SELECT
  USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    OR client_id IN (SELECT c.id FROM public.clients c JOIN public.trainers t ON c.trainer_id = t.id WHERE t.user_id = auth.uid())
  );

CREATE POLICY "Client can manage own diary entries"
  ON public.diary_entries FOR ALL
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Diary media: same as diary_entries (via diary_entry_id)
CREATE POLICY "Diary media readable by entry owner or trainer"
  ON public.diary_media FOR SELECT
  USING (
    diary_entry_id IN (
      SELECT je.id FROM public.diary_entries je
      WHERE je.client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
         OR je.client_id IN (SELECT c.id FROM public.clients c JOIN public.trainers t ON c.trainer_id = t.id WHERE t.user_id = auth.uid())
    )
  );

CREATE POLICY "Client can manage diary media for own entries"
  ON public.diary_media FOR ALL
  USING (
    diary_entry_id IN (SELECT id FROM public.diary_entries WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    diary_entry_id IN (SELECT id FROM public.diary_entries WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
  );

-- Storage: create private bucket for journal media (client uploads).
-- Run in Dashboard or via API if preferred: name 'journal-media', public false.
-- RLS on storage.objects: clients can insert/update/delete in path 'journal-media/{client_id}/*'; trainers can read clients' paths.
