"use client";

import { BLOCK_LABELS, newBlock, type Block, type BlockType } from "@/lib/cms/blocks";
import { MediaPicker, type MediaItem } from "./MediaPicker";

type Props = {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  library: MediaItem[];
  onUploaded: (item: MediaItem) => void;
};

export function BlockEditor({ blocks, onChange, library, onUploaded }: Props) {
  const update = (id: string, patch: Partial<Block>) =>
    onChange(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const media = { library, onUploaded };

  return (
    <div className="stack">
      {blocks.length === 0 && <p className="muted">This page is empty. Add a block below.</p>}
      {blocks.map((b, i) => (
        <div key={b.id} className="editor-block">
          <header>
            <strong className="small">{BLOCK_LABELS[b.type]}</strong>
            <div className="row" style={{ gap: 4 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Move down">↓</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => onChange(blocks.filter((x) => x.id !== b.id))}>Remove</button>
            </div>
          </header>
          <div className="stack">
            <BlockFields block={b} update={(patch) => update(b.id, patch)} media={media} />
          </div>
        </div>
      ))}
      <div className="card">
        <label>Add a block</label>
        <div className="row">
          {(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => (
            <button key={t} type="button" className="chip" onClick={() => onChange([...blocks, newBlock(t)])}>+ {BLOCK_LABELS[t]}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

type FieldsProps = {
  block: Block;
  update: (patch: Partial<Block>) => void;
  media: { library: MediaItem[]; onUploaded: (item: MediaItem) => void };
};

function Text({ label, value, onChange, multiline, hint }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; hint?: string }) {
  return (
    <div>
      <label>{label}</label>
      {multiline ? (
        <textarea rows={5} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <p className="muted small" style={{ margin: "4px 0 0" }}>{hint}</p>}
    </div>
  );
}

const MD_HINT = "Supports ## headings, - lists, **bold**, *italic* and [links](https://…)";

function BlockFields({ block: b, update, media }: FieldsProps) {
  switch (b.type) {
    case "hero":
      return (
        <>
          <Text label="Heading" value={b.heading} onChange={(heading) => update({ heading })} />
          <Text label="Subheading" value={b.subheading} onChange={(subheading) => update({ subheading })} multiline />
          <Text label="Button label (links to booking; blank hides it)" value={b.button_label} onChange={(button_label) => update({ button_label })} />
          <MediaPicker label="Cover image" value={b.image_url} onChange={(image_url) => update({ image_url })} {...media} />
        </>
      );
    case "text":
      return (
        <>
          <Text label="Heading" value={b.heading} onChange={(heading) => update({ heading })} />
          <Text label="Body" value={b.body} onChange={(body) => update({ body })} multiline hint={MD_HINT} />
        </>
      );
    case "image":
      return (
        <>
          <MediaPicker value={b.image_url} onChange={(image_url) => update({ image_url })} {...media} />
          <Text label="Alt text (describe the image)" value={b.alt} onChange={(alt) => update({ alt })} />
          <Text label="Caption" value={b.caption} onChange={(caption) => update({ caption })} />
        </>
      );
    case "services":
      return (
        <>
          <Text label="Heading" value={b.heading} onChange={(heading) => update({ heading })} />
          <Text label="Intro" value={b.intro} onChange={(intro) => update({ intro })} multiline />
          <p className="muted small" style={{ margin: 0 }}>Shows your bookable services from the Services tab.</p>
        </>
      );
    case "testimonials":
      return (
        <>
          <Text label="Heading" value={b.heading} onChange={(heading) => update({ heading })} />
          <ListEditor
            items={b.items}
            onChange={(items) => update({ items })}
            blank={{ quote: "", name: "" }}
            addLabel="Add testimonial"
            render={(item, set) => (
              <>
                <Text label="Quote" value={item.quote} onChange={(quote) => set({ ...item, quote })} multiline />
                <Text label="Client name" value={item.name} onChange={(name) => set({ ...item, name })} />
              </>
            )}
          />
        </>
      );
    case "faq":
      return (
        <>
          <Text label="Heading" value={b.heading} onChange={(heading) => update({ heading })} />
          <ListEditor
            items={b.items}
            onChange={(items) => update({ items })}
            blank={{ question: "", answer: "" }}
            addLabel="Add question"
            render={(item, set) => (
              <>
                <Text label="Question" value={item.question} onChange={(question) => set({ ...item, question })} />
                <Text label="Answer" value={item.answer} onChange={(answer) => set({ ...item, answer })} multiline hint={MD_HINT} />
              </>
            )}
          />
        </>
      );
    case "cta":
      return (
        <>
          <Text label="Heading" value={b.heading} onChange={(heading) => update({ heading })} />
          <Text label="Text" value={b.body} onChange={(body) => update({ body })} multiline />
          <Text label="Button label" value={b.button_label} onChange={(button_label) => update({ button_label })} />
        </>
      );
    case "gallery":
      return (
        <>
          <Text label="Heading" value={b.heading} onChange={(heading) => update({ heading })} />
          <ListEditor
            items={b.images}
            onChange={(images) => update({ images })}
            blank={{ url: "", alt: "" }}
            addLabel="Add photo"
            render={(item, set) => (
              <>
                <MediaPicker value={item.url} onChange={(url) => set({ ...item, url })} {...media} label="Photo" />
                <Text label="Alt text" value={item.alt} onChange={(alt) => set({ ...item, alt })} />
              </>
            )}
          />
        </>
      );
  }
}

function ListEditor<T>({
  items,
  onChange,
  blank,
  addLabel,
  render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  blank: T;
  addLabel: string;
  render: (item: T, set: (item: T) => void) => React.ReactNode;
}) {
  return (
    <div className="stack">
      {items.map((item, i) => (
        <div key={i} className="card stack" style={{ padding: 14, boxShadow: "none" }}>
          {render(item, (next) => onChange(items.map((x, j) => (j === i ? next : x))))}
          <div>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => onChange(items.filter((_, j) => j !== i))}>Remove</button>
          </div>
        </div>
      ))}
      <div><button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...items, { ...blank }])}>+ {addLabel}</button></div>
    </div>
  );
}
