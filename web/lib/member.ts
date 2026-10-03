import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { first } from "@/lib/db";
import { getPublishedTrainer } from "@/lib/trainer";
import type { Member, PublicTrainer } from "@/lib/types";

export const getMembership = cache(async (trainerId: string): Promise<Member | null> => {
  const user = await getUser();
  if (!user) return null;
  return first<Member>("SELECT * FROM members WHERE trainer_id = ? AND user_id = ?", trainerId, user.id);
});

/** The signed-in member of this trainer's app; otherwise sends them to join / sign in. */
export async function requireMember(slug: string): Promise<{ trainer: PublicTrainer; member: Member }> {
  const trainer = await getPublishedTrainer(slug);
  if (!trainer) redirect("/");
  const member = await getMembership(trainer.id);
  if (!member) redirect(`/${trainer.slug}/app/join`);
  return { trainer, member };
}
