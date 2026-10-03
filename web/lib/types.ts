import type { CornerStyle, FontStyle, ThemePref } from "@/lib/brand";
import type { VideoProvider } from "@/lib/video";
import type { Exercise } from "@/lib/workouts";

export type Plan = "starter" | "pro";

export type Trainer = {
  id: string;
  user_id: string;
  slug: string | null;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  accent_color_hex: string | null;
  location: string | null;
  instagram_url: string | null;
  timezone: string;
  site_published: boolean;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_customer_id: string | null;
  plan: Plan | null;
  subscription_status: string | null;
  theme_default: ThemePref;
  font_style: FontStyle;
  corner_style: CornerStyle;
  social_links: SocialLinks;
};

export const SOCIAL_PLATFORMS = ["youtube", "instagram", "tiktok", "twitch", "facebook", "x"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type SocialLinks = Partial<Record<SocialPlatform, string>>;

/** A trainer whose site is live (see getPublishedTrainer). */
export type PublicTrainer = Trainer & { slug: string };

export type Service = {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  active: boolean;
  sort_order: number;
};

export type AvailabilityRule = {
  id: string;
  trainer_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export type IntakeKind = "text" | "long_text" | "select" | "yes_no";

export type IntakeQuestion = {
  id: string;
  trainer_id: string;
  label: string;
  kind: IntakeKind;
  options: string[];
  required: boolean;
  sort_order: number;
};

export type BookingStatus = "pending_payment" | "confirmed" | "cancelled";

export type Booking = {
  id: string;
  trainer_id: string;
  service_name: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  amount_cents: number;
  currency: string;
  intake_answers: { question: string; answer: string }[];
};

export type Media = {
  id: string;
  trainer_id: string;
  r2_key: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  alt: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  trainer_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_url: string | null;
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
};

export type Member = {
  id: string;
  trainer_id: string;
  user_id: string;
  display_name: string;
  notifications_seen_at: string;
  created_at: string;
};

export type Video = {
  id: string;
  trainer_id: string;
  provider: VideoProvider;
  provider_id: string;
  url: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnail_url: string | null;
  visibility: "members" | "public";
  published: boolean;
  size_bytes: number | null;
  source_id: string | null;
  published_at: string | null;
  created_at: string;
};

export type Collection = { id: string; trainer_id: string; name: string; description: string | null; sort_order: number };

export type VideoSource = {
  id: string;
  trainer_id: string;
  platform: "youtube" | "vimeo";
  external_id: string;
  label: string;
  url: string;
  auto_sync: number;
  auto_publish: number;
  default_category: string | null;
  default_collection_id: string | null;
  last_synced_at: string | null;
  last_error: string | null;
};

export type LivePlatform = "youtube" | "instagram" | "tiktok" | "twitch" | "facebook" | "x" | "other";

export type LiveEvent = {
  id: string;
  trainer_id: string;
  platform: LivePlatform;
  url: string;
  title: string;
  status: "scheduled" | "live" | "ended";
  starts_at: string;
  ended_at: string | null;
};

export type NotificationKind = "live" | "video" | "feedback" | "announcement";

export type AppNotification = {
  id: string;
  trainer_id: string;
  member_id: string | null;
  kind: NotificationKind;
  title: string;
  body: string | null;
  url: string | null;
  created_at: string;
};

export type WorkoutStatus = "logged" | "submitted" | "reviewed";

export type Workout = {
  id: string;
  member_id: string;
  trainer_id: string;
  title: string;
  performed_on: string;
  duration_minutes: number | null;
  effort: number | null;
  notes: string | null;
  exercises: Exercise[];
  status: WorkoutStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  updated_at: string;
};

export type WorkoutComment = { id: string; workout_id: string; author: "trainer" | "member"; body: string; created_at: string };
