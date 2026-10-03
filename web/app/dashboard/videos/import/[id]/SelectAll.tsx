"use client";

export function SelectAll({ formId }: { formId: string }) {
  const toggle = (checked: boolean) =>
    document.querySelectorAll<HTMLInputElement>(`#${formId} input[name="video"]`).forEach((i) => (i.checked = checked));
  return (
    <div className="row" style={{ gap: 8 }}>
      <button type="button" className="chip" onClick={() => toggle(true)}>Select all</button>
      <button type="button" className="chip" onClick={() => toggle(false)}>Select none</button>
    </div>
  );
}
