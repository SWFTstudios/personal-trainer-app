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
};

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
