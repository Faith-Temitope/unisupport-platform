"use client";

// Courses > Search: everything you've added, including the text inside your files.
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "./store";
import { Page } from "./ui";

export type ExtraSheet = null | "search";

export function ExtraSheets({ sheet, setSheet }: { sheet: ExtraSheet; setSheet: (s: ExtraSheet) => void }) {
  const { courses, goStudy } = useApp();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const t = q.trim().toLowerCase(); if (t.length < 2) return [];
    const out: { key: string; kind: string; title: string; snip: string; courseId: string; tab: string }[] = [];
    courses.forEach((c) => {
      if (`${c.code} ${c.name}`.toLowerCase().includes(t)) out.push({ key: c.id, kind: "Course", title: `${c.code} · ${c.name}`, snip: `${c.notes.length} notes · ${c.files.length} files`, courseId: c.id, tab: "materials" });
      c.notes.forEach((n) => { if (`${n.title} ${n.body}`.toLowerCase().includes(t)) out.push({ key: n.id, kind: "Note", title: n.title, snip: n.body.slice(0, 80), courseId: c.id, tab: "notes" }); });
      c.files.forEach((f) => { if (f.name.toLowerCase().includes(t) || f.text?.toLowerCase().includes(t)) out.push({ key: f.id, kind: "File", title: f.name, snip: c.code, courseId: c.id, tab: "materials" }); });
      c.recs.forEach((r) => { if (r.name.toLowerCase().includes(t)) out.push({ key: r.id, kind: "Recording", title: r.name, snip: c.code, courseId: c.id, tab: "recordings" }); });
    });
    return out.slice(0, 30);
  }, [q, courses]);

  const close = () => setSheet(null);
  return (
    <Page open={sheet === "search"} onClose={close} title="Search Courses">
      <div className="px-3 pb-2 pt-1">
        <div className="flex items-center gap-2 rounded-[6px] bg-[var(--we-cell)] px-3 py-2"><Search size={17} className="text-[var(--we-hint)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Notes, files, courses, recordings" className="min-w-0 flex-1 bg-transparent text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" /></div>
      </div>
      {q.trim().length >= 2 && (results.length === 0 ? <p className="py-12 text-center text-[14px] text-[var(--we-sub)]">Nothing found</p> : (
        <div className="bg-[var(--we-cell)]">{results.map((r) => (
          <button key={r.key} onClick={() => { close(); goStudy({ courseId: r.courseId, tab: r.tab }); }} className="flex w-full items-start gap-3 px-4 text-left active:bg-[var(--we-bg)]">
            <span className="mt-3.5 shrink-0 rounded-[3px] bg-[var(--we-bg)] px-1.5 py-0.5 text-[11px] text-[var(--we-sub)]">{r.kind}</span>
            <span className="min-w-0 flex-1 border-b border-[var(--we-sep)] py-3"><span className="block truncate text-[15.5px] text-[var(--we-text)]">{r.title}</span><span className="block truncate text-[13px] text-[var(--we-sub)]">{r.snip}</span></span>
          </button>
        ))}</div>
      ))}
    </Page>
  );
}
