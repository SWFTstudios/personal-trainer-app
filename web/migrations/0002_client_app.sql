-- Client app: members, video library, live alerts, notifications, web push, workout logs + feedback.

-- =============================================================================
-- TRAINER BRANDING
-- =============================================================================
ALTER TABLE trainers ADD COLUMN theme_default TEXT NOT NULL DEFAULT 'system' CHECK (theme_default IN ('system', 'light', 'dark'));
ALTER TABLE trainers ADD COLUMN font_style TEXT NOT NULL DEFAULT 'modern' CHECK (font_style IN ('modern', 'editorial', 'athletic'));
ALTER TABLE trainers ADD COLUMN corner_style TEXT NOT NULL DEFAULT 'rounded' CHECK (corner_style IN ('rounded', 'soft', 'sharp'));
-- JSON object of platform -> profile URL, e.g. {"youtube": "https://youtube.com/@jane"}
ALTER TABLE trainers ADD COLUMN social_links TEXT NOT NULL DEFAULT '{}';

-- =============================================================================
-- MEMBERS (clients with an app login). One user can be a member of several trainers.
-- =============================================================================
CREATE TABLE members (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  notifications_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (trainer_id, user_id)
);
CREATE INDEX idx_members_user_id ON members(user_id);

-- =============================================================================
-- VIDEO LIBRARY: links (YouTube, Vimeo, TikTok, Instagram, Loom, .mp4) and direct uploads to R2
-- =============================================================================
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('youtube', 'vimeo', 'tiktok', 'instagram', 'loom', 'file', 'upload')),
  -- Provider's id; for uploads the R2 key; for linked files the URL.
  provider_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  thumbnail_url TEXT,
  -- 'members' = only in the member app; 'public' = also on the website
  visibility TEXT NOT NULL DEFAULT 'members' CHECK (visibility IN ('members', 'public')),
  published INTEGER NOT NULL DEFAULT 1,
  size_bytes INTEGER,
  source_id TEXT, -- set when imported from a connected channel
  published_at TEXT, -- original publish date on the platform, when known
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (trainer_id, provider, provider_id)
);
CREATE INDEX idx_videos_trainer ON videos(trainer_id, published, created_at);

-- Playlists / programs. A video can be in many collections.
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (trainer_id, name)
);

CREATE TABLE video_collections (
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (video_id, collection_id)
);
CREATE INDEX idx_video_collections_collection ON video_collections(collection_id, sort_order);

-- Connected channels to import from (and optionally auto-sync new uploads).
CREATE TABLE video_sources (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'vimeo')),
  external_id TEXT NOT NULL, -- YouTube channel id (UC...) or Vimeo user id/name
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  auto_sync INTEGER NOT NULL DEFAULT 0,
  auto_publish INTEGER NOT NULL DEFAULT 0,
  default_category TEXT,
  default_collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
  last_synced_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (trainer_id, platform, external_id)
);

-- =============================================================================
-- LIVE SESSIONS on social platforms
-- =============================================================================
CREATE TABLE live_events (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'twitch', 'facebook', 'x', 'other')),
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('scheduled', 'live', 'ended')),
  starts_at TEXT NOT NULL,
  ended_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_live_events_trainer ON live_events(trainer_id, status, starts_at);

-- =============================================================================
-- NOTIFICATIONS (member_id NULL = sent to every member of the trainer)
-- =============================================================================
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('live', 'video', 'feedback', 'announcement')),
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_notifications_trainer ON notifications(trainer_id, created_at);
CREATE INDEX idx_notifications_member ON notifications(member_id, created_at);

CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_push_subscriptions_member ON push_subscriptions(member_id);

-- =============================================================================
-- WORKOUT LOGS + FEEDBACK THREAD
-- =============================================================================
CREATE TABLE workouts (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  performed_on TEXT NOT NULL, -- YYYY-MM-DD in the member's local time
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 600),
  effort INTEGER CHECK (effort IS NULL OR effort BETWEEN 1 AND 10), -- RPE
  notes TEXT,
  -- JSON [{name, notes, sets: [{reps, weight, unit}]}]
  exercises TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'logged' CHECK (status IN ('logged', 'submitted', 'reviewed')),
  submitted_at TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_workouts_member ON workouts(member_id, performed_on);
CREATE INDEX idx_workouts_trainer_status ON workouts(trainer_id, status, submitted_at);

CREATE TABLE workout_comments (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  author TEXT NOT NULL CHECK (author IN ('trainer', 'member')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_workout_comments_workout ON workout_comments(workout_id, created_at);
