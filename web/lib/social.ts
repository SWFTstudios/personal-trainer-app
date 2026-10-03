import type { LivePlatform, SocialPlatform } from "@/lib/types";

export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  twitch: "Twitch",
  facebook: "Facebook",
  x: "X",
};

export const LIVE_LABELS: Record<LivePlatform, string> = { ...SOCIAL_LABELS, other: "Live stream" };

const HOSTS: Record<SocialPlatform, RegExp> = {
  youtube: /(^|\.)(youtube\.com|youtu\.be)$/,
  instagram: /(^|\.)instagram\.com$/,
  tiktok: /(^|\.)tiktok\.com$/,
  twitch: /(^|\.)twitch\.tv$/,
  facebook: /(^|\.)(facebook\.com|fb\.watch|fb\.com)$/,
  x: /(^|\.)(x\.com|twitter\.com)$/,
};

/** https URL check; optionally require it to belong to the given platform. */
export function safeHttpsUrl(value: string, platform?: SocialPlatform): string | null {
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:") return null;
    if (platform && !HOSTS[platform].test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Guess the platform from a live link. */
export function platformOf(url: string): LivePlatform {
  try {
    const host = new URL(url).hostname;
    for (const [p, re] of Object.entries(HOSTS)) if (re.test(host)) return p as SocialPlatform;
  } catch {}
  return "other";
}
