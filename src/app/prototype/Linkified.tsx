"use client";

/** Chat text where a shared course ("/course/<id>") becomes a tappable "Open course" link. */
export function Linkified({ text }: { text: string }) {
  const m = text.match(/\s?\/course\/([0-9a-f-]{36})/i);
  if (!m) return <span className="whitespace-pre-line">{text}</span>;
  return (
    <span className="whitespace-pre-line">
      {text.replace(m[0], "")}
      <a href={`/course/${m[1]}`} target="_blank" rel="noopener" className="mt-1 block font-bold text-[var(--uni,#A63FBD)] underline">Open course</a>
    </span>
  );
}
