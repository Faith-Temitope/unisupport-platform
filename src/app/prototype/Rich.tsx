"use client";

import { useEffect, useState, type ReactNode } from "react";

// Light Markdown for Birdie's answers: headings, bold/italic, lists, inline code, code blocks, and
// real maths (LaTeX in $...$ / $$...$$ / \(...\) / \[...\], drawn with KaTeX, loaded only when needed).
// Built from React elements only; KaTeX escapes its input, so nothing the AI writes can inject markup.

type Katex = typeof import("katex").default;
let K: Katex | null = null;
let loading: Promise<void> | null = null;
const loadKatex = () => (loading ??= Promise.all([import("katex"), import("katex/dist/katex.min.css")]).then(([m]) => { K = m.default; }));

function MathTex({ tex, display }: { tex: string; display?: boolean }) {
  const [ready, setReady] = useState(!!K);
  useEffect(() => { if (!K) void loadKatex().then(() => setReady(true)).catch(() => {}); }, []);
  if (!ready || !K) return <span className="font-mono text-[12.5px]">{tex}</span>;
  const html = K.renderToString(tex, { displayMode: !!display, throwOnError: false, output: "html", strict: "ignore" });
  return display
    ? <div className="my-1.5 overflow-x-auto overflow-y-hidden py-1" dangerouslySetInnerHTML={{ __html: html }} />
    : <span dangerouslySetInnerHTML={{ __html: html }} />;
}

// Inline maths: $...$ (not "$5 and $10": no space just inside the dollars) or \(...\).
const INLINE = /(\\\((.+?)\\\)|(?<![\\$\w])\$(?!\s)([^$\n]+?)(?<!\s)\$(?![\w$])|`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|(?<![\w*])\*[^*\n]+\*(?![\w*])|(?<![\w_\\])_[^_\n]+_(?![\w_]))/g;

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0, i = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const t = m[0], k = `${key}-${i++}`;
    if (m[2] !== undefined || m[3] !== undefined) out.push(<MathTex key={k} tex={(m[2] ?? m[3]).trim()} />);
    else if (t.startsWith("`")) out.push(<code key={k} className="rounded bg-[var(--paper-dim)] px-1 py-px font-mono text-[12.5px]">{t.slice(1, -1)}</code>);
    else if (t.startsWith("**") || t.startsWith("__")) out.push(<b key={k}>{inline(t.slice(2, -2), k)}</b>);
    else out.push(<i key={k}>{t.slice(1, -1)}</i>);
    last = m.index! + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Rich({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  // Code blocks first (nothing inside them is formatted), then display maths, then everything else.
  const parts = text.split(/```[\w+-]*\n?/);
  parts.forEach((part, pi) => {
    if (pi % 2 === 1) { blocks.push(<pre key={`c${pi}`} className="my-1.5 overflow-x-auto rounded-xl bg-[var(--ink)] p-3 font-mono text-[12px] leading-relaxed text-[var(--paper)]">{part.replace(/\n$/, "")}</pre>); return; }
    const pieces = part.split(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/);
    // split() with 2 groups yields: text, $$group, \[group, text, ...
    for (let x = 0; x < pieces.length; x += 3) {
      prose(pieces[x] ?? "", `${pi}-${x}`, blocks);
      const tex = pieces[x + 1] ?? pieces[x + 2];
      if (tex !== undefined) blocks.push(<MathTex key={`m${pi}-${x}`} tex={tex.trim()} display />);
    }
  });
  return <div className="space-y-0.5 break-words">{blocks}</div>;
}

function prose(part: string, id: string, blocks: ReactNode[]) {
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => { if (para.length) { const k = `p${id}-${blocks.length}`; blocks.push(<p key={k} className="my-1.5 first:mt-0 last:mb-0">{para.flatMap((l, j) => (j ? [<br key={`${k}b${j}`} />, ...inline(l, `${k}-${j}`)] : inline(l, `${k}-${j}`)))}</p>); para = []; } };
  const flushList = () => {
    if (!list) return;
    const k = `l${id}-${blocks.length}`, L = list;
    const items = L.items.map((it, j) => <li key={j} className="pl-0.5">{inline(it, `${k}-${j}`)}</li>);
    blocks.push(L.ordered ? <ol key={k} className="my-1.5 list-decimal space-y-1 pl-5">{items}</ol> : <ul key={k} className="my-1.5 list-disc space-y-1 pl-5">{items}</ul>);
    list = null;
  };
  for (const raw of part.split("\n")) {
    const line = raw.trimEnd();
    const h = /^#{1,6}\s+(.*)$/.exec(line);
    const ul = /^\s*[-*+•]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if (h) { flushPara(); flushList(); blocks.push(<div key={`h${id}-${blocks.length}`} className="mb-0.5 mt-2.5 text-[14.5px] font-bold first:mt-0">{inline(h[1].replace(/\*\*/g, ""), `h${id}-${blocks.length}`)}</div>); continue; }
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
}
