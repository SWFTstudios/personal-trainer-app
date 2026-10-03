"use server";

import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
  });
  redirect(error ? "/login?error=1" : "/login?sent=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
