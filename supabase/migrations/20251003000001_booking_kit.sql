-- Booking + Site Kit: public landing page, services, availability, intake, bookings, billing.
-- Public pages and booking creation are served by the web app's server using the
-- service role, so no anon policies are added here; trainers manage their own rows via RLS.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =============================================================================
-- TRAINERS: site + billing fields
-- =============================================================================
ALTER TABLE public.trainers
  ADD COLUMN slug TEXT UNIQUE,
  ADD COLUMN headline TEXT,
  ADD COLUMN bio TEXT,
  ADD COLUMN hero_image_url TEXT,
  ADD COLUMN location TEXT,
  ADD COLUMN instagram_url TEXT,
  ADD COLUMN timezone TEXT NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN site_published BOOLEAN NOT NULL DEFAULT false,
  -- Stripe Connect (trainer gets paid by clients)
  ADD COLUMN stripe_account_id TEXT UNIQUE,
  ADD COLUMN stripe_charges_enabled BOOLEAN NOT NULL DEFAULT false,
  -- Platform subscription (trainer pays us)
  ADD COLUMN stripe_customer_id TEXT UNIQUE,
  ADD COLUMN plan TEXT CHECK (plan IN ('starter', 'pro')),
  ADD COLUMN subscription_status TEXT;

ALTER TABLE public.trainers
  ADD CONSTRAINT trainers_slug_format CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$');

-- =============================================================================
-- SERVICES (bookable session types)
-- =============================================================================
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes SMALLINT NOT NULL CHECK (duration_minutes BETWEEN 15 AND 480),
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_services_trainer_id ON public.services(trainer_id);

-- =============================================================================
-- AVAILABILITY (weekly recurring windows in the trainer's timezone)
-- =============================================================================
CREATE TABLE public.availability_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CHECK (end_time > start_time)
);

CREATE INDEX idx_availability_rules_trainer_id ON public.availability_rules(trainer_id);

-- =============================================================================
-- INTAKE QUESTIONS (asked during booking)
-- =============================================================================
CREATE TABLE public.intake_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'long_text', 'select', 'yes_no')),
  options TEXT[] NOT NULL DEFAULT '{}',
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_intake_questions_trainer_id ON public.intake_questions(trainer_id);

-- =============================================================================
-- BOOKINGS
-- =============================================================================
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'confirmed', 'cancelled')),
  -- Unpaid holds stop blocking the slot after this time (see release_expired_holds).
  hold_expires_at TIMESTAMPTZ,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_checkout_session_id TEXT UNIQUE,
  intake_answers JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  -- No two live bookings may overlap for the same trainer.
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    trainer_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status <> 'cancelled')
);

CREATE INDEX idx_bookings_trainer_starts ON public.bookings(trainer_id, starts_at);

-- Cancels unpaid holds whose window has lapsed so their slot frees up.
CREATE OR REPLACE FUNCTION public.release_expired_holds(p_trainer_id UUID)
RETURNS VOID AS $$
  UPDATE public.bookings
  SET status = 'cancelled'
  WHERE trainer_id = p_trainer_id
    AND status = 'pending_payment'
    AND hold_expires_at IS NOT NULL
    AND hold_expires_at < now();
$$ LANGUAGE sql VOLATILE;

REVOKE EXECUTE ON FUNCTION public.release_expired_holds(UUID) FROM PUBLIC, anon, authenticated;

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainer manages own services"
  ON public.services FOR ALL
  USING (trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid()))
  WITH CHECK (trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid()));

CREATE POLICY "Trainer manages own availability"
  ON public.availability_rules FOR ALL
  USING (trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid()))
  WITH CHECK (trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid()));

CREATE POLICY "Trainer manages own intake questions"
  ON public.intake_questions FOR ALL
  USING (trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid()))
  WITH CHECK (trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid()));

-- Bookings are created by the server (service role); trainers can read and cancel theirs.
CREATE POLICY "Trainer reads own bookings"
  ON public.bookings FOR SELECT
  USING (trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid()));

CREATE POLICY "Trainer updates own bookings"
  ON public.bookings FOR UPDATE
  USING (trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid()));

-- Billing and Stripe fields are written only by the server (webhooks), never by the trainer.
-- Column grants replace the table-wide grants so those fields can't be set via the API.
REVOKE INSERT, UPDATE ON public.trainers FROM authenticated, anon;
GRANT INSERT (user_id, display_name, logo_url, accent_color_hex, secondary_color_hex, calendly_url, app_name,
              slug, headline, bio, hero_image_url, location, instagram_url, timezone, site_published)
  ON public.trainers TO authenticated;
GRANT UPDATE (display_name, logo_url, accent_color_hex, secondary_color_hex, calendly_url, app_name,
              slug, headline, bio, hero_image_url, location, instagram_url, timezone, site_published)
  ON public.trainers TO authenticated;

-- Trainers may only change a booking's status (e.g. cancel), not its price or time.
REVOKE INSERT, UPDATE ON public.bookings FROM authenticated, anon;
GRANT UPDATE (status) ON public.bookings TO authenticated;
