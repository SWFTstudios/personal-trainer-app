-- Trainer Kit schema for Cloudflare D1 (SQLite).
-- Timestamps are ISO-8601 UTC strings ("2026-10-05T13:00:00.000Z") so they sort and compare as text.

-- =============================================================================
-- AUTH
-- =============================================================================
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- id is the SHA-256 of the session token; the raw token only lives in the cookie.
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- =============================================================================
-- TRAINERS (one per user; the tenant)
-- =============================================================================
CREATE TABLE trainers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE,
  display_name TEXT,
  headline TEXT,
  bio TEXT,
  logo_url TEXT,
  hero_image_url TEXT,
  accent_color_hex TEXT,
  location TEXT,
  instagram_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  site_published INTEGER NOT NULL DEFAULT 0,
  stripe_account_id TEXT UNIQUE,
  stripe_charges_enabled INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id TEXT UNIQUE,
  plan TEXT CHECK (plan IN ('starter', 'pro')),
  subscription_status TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- =============================================================================
-- BOOKING
-- =============================================================================
CREATE TABLE services (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 15 AND 480),
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_services_trainer_id ON services(trainer_id);

CREATE TABLE availability_rules (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0 = Sunday
  start_time TEXT NOT NULL, -- HH:MM in the trainer's timezone
  end_time TEXT NOT NULL,
  CHECK (end_time > start_time)
);
CREATE INDEX idx_availability_rules_trainer_id ON availability_rules(trainer_id);

CREATE TABLE intake_questions (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'long_text', 'select', 'yes_no')),
  options TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  required INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_intake_questions_trainer_id ON intake_questions(trainer_id);

CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'confirmed', 'cancelled')),
  -- Unpaid holds stop blocking the slot after this time.
  hold_expires_at TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_checkout_session_id TEXT UNIQUE,
  intake_answers TEXT NOT NULL DEFAULT '[]', -- JSON [{question, answer}]
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (ends_at > starts_at)
);
CREATE INDEX idx_bookings_trainer_starts ON bookings(trainer_id, starts_at);

-- No two live bookings may overlap for the same trainer. A booking is live when it is
-- confirmed, or pending with an unexpired hold. D1 runs writes one at a time, so this is race-free.
CREATE TRIGGER bookings_no_overlap_insert
BEFORE INSERT ON bookings
WHEN NEW.status <> 'cancelled'
BEGIN
  SELECT RAISE(ABORT, 'slot_taken') WHERE EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.trainer_id = NEW.trainer_id
      AND (b.status = 'confirmed'
           OR (b.status = 'pending_payment'
               AND (b.hold_expires_at IS NULL OR b.hold_expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))))
      AND b.starts_at < NEW.ends_at
      AND NEW.starts_at < b.ends_at
  );
END;

CREATE TRIGGER bookings_no_overlap_revive
BEFORE UPDATE OF status ON bookings
WHEN OLD.status = 'cancelled' AND NEW.status <> 'cancelled'
BEGIN
  SELECT RAISE(ABORT, 'slot_taken') WHERE EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.trainer_id = NEW.trainer_id
      AND b.id <> NEW.id
      AND (b.status = 'confirmed'
           OR (b.status = 'pending_payment'
               AND (b.hold_expires_at IS NULL OR b.hold_expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))))
      AND b.starts_at < NEW.ends_at
      AND NEW.starts_at < b.ends_at
  );
END;

-- =============================================================================
-- CMS
-- =============================================================================
CREATE TABLE media (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  alt TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_media_trainer_id ON media(trainer_id, created_at);

-- Site pages built from content blocks. path '' is the home page.
CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  seo_description TEXT,
  blocks TEXT NOT NULL DEFAULT '[]', -- JSON array of blocks (see lib/cms/blocks.ts)
  published INTEGER NOT NULL DEFAULT 0,
  show_in_nav INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (trainer_id, path)
);

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL DEFAULT '', -- Markdown subset (see lib/cms/markdown.tsx)
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (trainer_id, slug)
);
CREATE INDEX idx_posts_trainer_published ON posts(trainer_id, status, published_at);
