import { notFound, redirect } from "next/navigation";
import { WorkoutEditor } from "@/components/app/WorkoutEditor";
import { getMemberWorkouts } from "@/lib/app-data";
import { requireMember } from "@/lib/member";
import { draftFrom, exerciseSuggestions } from "@/lib/workout-drafts";

export default async function EditWorkoutPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { trainer, member } = await requireMember(slug);
  const history = await getMemberWorkouts(member.id, 100);
  const workout = history.find((w) => w.id === id);
  if (!workout) notFound();
  if (workout.status === "reviewed") redirect(`/${trainer.slug}/app/workouts/${id}`);
  return (
    <div className="container page-pad">
      <h1>Edit workout</h1>
      <WorkoutEditor slug={trainer.slug} initial={draftFrom(workout)} suggestions={exerciseSuggestions(history)} coach={trainer.display_name ?? "your coach"} />
    </div>
  );
}
