import { Fragment, type ReactNode } from "react";

// Small, safe Markdown subset for CMS text: ## / ### headings, paragraphs, - and 1. lists,
// **bold**, *italic*, [links](https://...). Output is React elements, never raw HTML.

const SAFE_HREF = /^(https?:\/\/|mailto:|\/)/i;

export function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[2] !== undefined) nodes.push(<strong key={key++}>{match[2]}</strong>);
    else if (match[3] !== undefined) nodes.push(<em key={key++}>{match[3]}</em>);
    else if (SAFE_HREF.test(match[5])) {
      const external = /^https?:/i.test(match[5]);
      nodes.push(
        <a key={key++} href={match[5]} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {match[4]}
        </a>,
      );
    } else nodes.push(match[4]);
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (block.startsWith("### ")) return <h3 key={i}>{renderInline(block.slice(4))}</h3>;
        if (block.startsWith("## ")) return <h2 key={i}>{renderInline(block.slice(3))}</h2>;
        if (lines.every((l) => /^[-*] /.test(l))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{renderInline(l.slice(2))}</li>)}</ul>;
        }
        if (lines.every((l) => /^\d+\. /.test(l))) {
          return <ol key={i}>{lines.map((l, j) => <li key={j}>{renderInline(l.replace(/^\d+\. /, ""))}</li>)}</ol>;
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
