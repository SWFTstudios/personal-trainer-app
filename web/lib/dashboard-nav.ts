import type { IconName } from "@/components/ui/Icon";

export const DASH_NAV: { group: string; links: { href: string; label: string; icon: IconName; exact?: boolean }[] }[] = [
  {
    group: "Business",
    links: [
      { href: "/dashboard", label: "Overview", icon: "home", exact: true },
      { href: "/dashboard/workouts", label: "Client workouts", icon: "chat" },
      { href: "/dashboard/bookings", label: "Bookings", icon: "calendar" },
      { href: "/dashboard/clients", label: "Clients & members", icon: "users" },
    ],
  },
  {
    group: "Content",
    links: [
      { href: "/dashboard/live", label: "Live & alerts", icon: "live" },
      { href: "/dashboard/videos", label: "Videos", icon: "video" },
      { href: "/dashboard/pages", label: "Website pages", icon: "file" },
      { href: "/dashboard/blog", label: "Blog", icon: "file" },
      { href: "/dashboard/media", label: "Media", icon: "image" },
    ],
  },
  {
    group: "Setup",
    links: [
      { href: "/dashboard/site", label: "Brand & theme", icon: "palette" },
      { href: "/dashboard/services", label: "Services", icon: "dumbbell" },
      { href: "/dashboard/availability", label: "Availability", icon: "clock" },
      { href: "/dashboard/intake", label: "Intake form", icon: "sliders" },
      { href: "/dashboard/billing", label: "Billing & payments", icon: "card" },
    ],
  },
];
