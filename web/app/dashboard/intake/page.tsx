import { all } from "@/lib/db";
import { toQuestion } from "@/lib/rows";
import { requireTrainer } from "@/lib/trainer";
import type { IntakeQuestion } from "@/lib/types";
import { addQuestion, addStarterQuestions, deleteQuestion } from "../actions";
import { Notice } from "../Notice";

const KIND_LABELS: Record<IntakeQuestion["kind"], string> = {
  text: "Short answer",
  long_text: "Paragraph",
  select: "Multiple choice",
  yes_no: "Yes / No",
};

type Props = { searchParams: Promise<{ error?: string }> };

export default async function IntakePage({ searchParams }: Props) {
  const { error } = await searchParams;
  const trainer = await requireTrainer();
  const rows = await all<Parameters<typeof toQuestion>[0]>("SELECT * FROM intake_questions WHERE trainer_id = ? ORDER BY sort_order", trainer.id);
  const questions: IntakeQuestion[] = rows.map(toQuestion);

  return (
    <>
      <h1>Intake form</h1>
      <p className="muted">Clients answer these when they book. You'll see their answers on each booking.</p>
      <Notice error={error} />
      {questions.length === 0 ? (
        <form action={addStarterQuestions} className="card row spread">
          <span>Start with goals, injuries, experience and a medical check.</span>
          <button className="btn btn-sm" type="submit">Add starter questions</button>
        </form>
      ) : (
        <div className="card">
          {questions.map((q) => (
            <form key={q.id} action={deleteQuestion.bind(null, q.id)} className="row spread" style={{ padding: "8px 0", flexWrap: "nowrap" }}>
              <div>
                {q.label}{q.required && " *"}
                <div className="small muted">{KIND_LABELS[q.kind]}{q.options.length > 0 && `: ${q.options.join(", ")}`}</div>
              </div>
              <button className="btn btn-ghost btn-sm" aria-label="Remove">×</button>
            </form>
          ))}
        </div>
      )}
      <form action={addQuestion} className="card">
        <h3>Add a question</h3>
        <div className="field"><label htmlFor="label">Question</label><input id="label" name="label" required /></div>
        <div className="field">
          <label htmlFor="kind">Answer type</label>
          <select id="kind" name="kind" defaultValue="text">
            {Object.entries(KIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="options">Choices (multiple choice only, comma-separated)</label><input id="options" name="options" /></div>
        <div className="field row">
          <input id="required" name="required" type="checkbox" />
          <label htmlFor="required" style={{ margin: 0 }}>Required</label>
        </div>
        <div className="field"><button className="btn" type="submit">Add question</button></div>
      </form>
    </>
  );
}
