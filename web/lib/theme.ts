import "server-only";
import { cookies } from "next/headers";
import { parseTheme, type ThemePref } from "@/lib/brand";

export const THEME_COOKIE = "theme";

/** The viewer's explicit theme choice, or null if they haven't picked one. */
export async function getThemeCookie(): Promise<ThemePref | null> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return value ? parseTheme(value) : null;
}
