"use client";

import type { ReactNode } from "react";

// Light Markdown for Birdie's answers: headings, bold/italic, lists, inline code and code blocks.
// Built from React elements only (never raw HTML), so nothing the AI writes can inject markup.

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|(?<![\w*])\*[^*\n]+\*(?![\w*])|(?<![\w_])_[^_\n]+_(?![\w_]))/g;
  let last = 0, i = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const t = m[0], k = `${key}-${i++}`;
    if (t.startsWith("`")) out.push(<code key={k} className="rounded bg-[var(--paper-dim)] px-1 py-px font-mono text-[12.5px]">{t.slice(1, -1)}</code>);
    else if (t.startsWith("**") || t.startsWith("__")) out.push(<b key={k}>{t.slice(2, -2)}</b>);
    else out.push(<i key={k}>{t.slice(1, -1)}</i>);
    last = m.index! + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Rich({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const parts = text.split(/```[\w+-]*\n?/);
  parts.forEach((part, pi) => {
    if (pi % 2 === 1) { blocks.push(<pre key={`c${pi}`} className="my-1.5 overflow-x-auto rounded-xl bg-[var(--ink)] p-3 font-mono text-[12px] leading-relaxed text-[var(--paper)]">{part.replace(/\n$/, "")}</pre>); return; }
    let list: { ordered: boolean; items: string[] } | null = null;
    let para: string[] = [];
    const flushPara = () => { if (para.length) { const k = `p${pi}-${blocks.length}`; blocks.push(<p key={k} className="my-1 first:mt-0 last:mb-0">{para.flatMap((l, j) => (j ? [<br key={`${k}b${j}`} />, ...inline(l, `${k}-${j}`)] : inline(l, `${k}-${j}`)))}</p>); para = []; } };
    const flushList = () => {
      if (!list) return;
      const k = `l${pi}-${blocks.length}`, L = list;
      const items = L.items.map((it, j) => <li key={j} className="pl-0.5">{inline(it, `${k}-${j}`)}</li>);
      blocks.push(L.ordered ? <ol key={k} className="my-1 list-decimal space-y-0.5 pl-5">{items}</ol> : <ul key={k} className="my-1 list-disc space-y-0.5 pl-5">{items}</ul>);
      list = null;
    };
    for (const raw of part.split("\n")) {
      const line = raw.trimEnd();
      const h = /^#{1,6}\s+(.*)$/.exec(line);
      const ul = /^\s*[-*+•]\s+(.*)$/.exec(line);
      const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
      if (!line.trim()) { flushPara(); flushList(); continue; }
      if (h) { flushPara(); flushList(); blocks.push(<div key={`h${pi}-${blocks.length}`} className="mb-0.5 mt-2 text-[14.5px] font-bold first:mt-0">{inline(h[1].replace(/\*\*/g, ""), `h${pi}-${blocks.length}`)}</div>); continue; }
      if (ul || ol) {
        flushPara();
        const ordered = !!ol;
        if (list && list.ordered !== ordered) flushList();
        if (!list) list = { ordered, items: [] };
        list.items.push((ul ?? ol)![1]);
        continue;
      }
      if (/^\s*(?:[-*_]\s*){3,}$/.test(line)) { flushPara(); flushList(); continue; }
      flushList(); para.push(line);
    }
    flushPara(); flushList();
  });
  return <div className="space-y-0.5 break-words">{blocks}</div>;
}
