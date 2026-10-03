import { WorkoutEditor } from "@/components/app/WorkoutEditor";
import { getMemberWorkouts } from "@/lib/app-data";
import { requireMember } from "@/lib/member";
import { emptyDraft, exerciseSuggestions } from "@/lib/workout-drafts";

export default async function NewWorkoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { trainer, member } = await requireMember(slug);
  const history = await getMemberWorkouts(member.id, 60);
  // The browser's date can differ from the server's; the member can adjust the field.
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="container page-pad">
      <h1>Log a workout</h1>
      <WorkoutEditor slug={trainer.slug} initial={emptyDraft(today)} suggestions={exerciseSuggestions(history)} coach={trainer.display_name ?? "your coach"} />
    </div>
  );
}
