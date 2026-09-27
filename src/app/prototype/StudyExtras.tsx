"use client";

import { Bell, Check, Flame, Search, Timer, Trash2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BADGES } from "./badges";
import { useApp } from "./store";
import { Btn, Empty, Sheet, TextField } from "./ui";

const daysLeft = (iso: string) => Math.round((new Date(iso + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 86400_000);
const dueLabel = (d: number) => (d < 0 ? `${-d} day${d === -1 ? "" : "s"} ago` : d === 0 ? "Today" : d === 1 ? "Tomorrow" : `in ${d} days`);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export type ExtraSheet = null | "focus" | "badges" | "deadline" | "search" | "notices";

export function TodayCard({ open }: { open: (s: ExtraSheet) => void }) {
  const { streak, todayCount, settings, focusEndsAt, stopFocus } = useApp();
  const goal = Math.max(1, settings.dailyGoal);
  const pct = Math.min(1, todayCount / goal);
  const [left, setLeft] = useState(0);
  useEffect(() => { if (!focusEndsAt) return; const tick = () => setLeft(Math.max(0, Math.round((focusEndsAt - Date.now()) / 1000))); tick(); const i = setInterval(tick, 1000); return () => clearInterval(i); }, [focusEndsAt]);
  const R = 19, C = 2 * Math.PI * R;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-3.5">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
        <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90"><circle cx="24" cy="24" r={R} fill="none" stroke="var(--paper-dim)" strokeWidth="5" /><circle cx="24" cy="24" r={R} fill="none" stroke="var(--birdie)" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: "stroke-dashoffset .6s" }} /></svg>
        <Flame size={17} className={`absolute ${streak > 0 ? "text-[#FF7A3D]" : "text-[#c9bdd6]"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold text-[var(--text)]">{streak > 0 ? `${streak} day streak` : "Start a streak today"}</div>
        <div className="text-[12px] text-[var(--dim)]">{focusEndsAt ? `Focus running · ${mmss(left)}` : `${Math.min(todayCount, goal)} of ${goal} study actions today`}</div>
      </div>
      {focusEndsAt ? <button onClick={() => stopFocus()} className="rounded-xl bg-[var(--help-soft)] px-3 py-2 text-[12px] font-bold text-[#C2412D] active:scale-95">Stop</button> : <button onClick={() => open("focus")} aria-label="Focus timer" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--paper-dim)] text-[var(--text)] active:scale-90"><Timer size={17} /></button>}
      <button onClick={() => open("badges")} aria-label="Badges" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--paper-dim)] text-[var(--text)] active:scale-90"><Trophy size={17} /></button>
    </div>
  );
}

export function DeadlinesCard({ open }: { open: (s: ExtraSheet) => void }) {
  const { deadlines, courses, toggleDeadline, settings } = useApp();
  const list = [...deadlines].sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date)).slice(0, 4);
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-3.5">
      <div className="mb-1 flex items-center justify-between"><div className="text-[12px] font-bold uppercase tracking-wider text-[var(--dim)]">Tests and deadlines{settings.calendar ? " · synced" : ""}</div><button onClick={() => open("deadline")} className="text-[12.5px] font-bold text-[var(--birdie)]">+ Add</button></div>
      {list.length === 0 ? <button onClick={() => open("deadline")} className="w-full rounded-xl py-2.5 text-left text-[13px] text-[var(--dim)] active:opacity-60">Nothing coming up. Add a test or an assignment and Birdie counts down for you.</button> : list.map((d) => {
        const n = daysLeft(d.date); const c = courses.find((x) => x.id === d.courseId);
        return (
          <div key={d.id} className="flex items-center gap-3 border-b border-[var(--line)] py-2.5 last:border-0">
            <button onClick={() => toggleDeadline(d.id)} aria-label="Mark done" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${d.done ? "border-[var(--birdie)] bg-[var(--birdie)] text-white" : "border-[var(--line)]"}`}>{d.done && <Check size={13} strokeWidth={3.5} />}</button>
            <div className="min-w-0 flex-1"><div className={`truncate text-[13.5px] font-semibold ${d.done ? "text-[var(--dim)] line-through" : "text-[var(--text)]"}`}>{d.title}</div>{c && <div className="text-[11.5px] text-[var(--dim)]">{c.code}</div>}</div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${d.done ? "bg-[var(--paper-dim)] text-[var(--dim)]" : n <= 1 ? "bg-[var(--help-soft)] text-[#C2412D]" : n <= 5 ? "bg-[var(--birdie-soft)] text-[var(--birdie-text)]" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{dueLabel(n)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ExtraSheets({ sheet, setSheet }: { sheet: ExtraSheet; setSheet: (s: ExtraSheet) => void }) {
  const { courses, deadlines, addDeadline, deleteDeadline, startFocus, stats, unlocked, streak, goStudy, notices, markNoticesRead, clearNotices, flash } = useApp();
  const [title, setTitle] = useState(""); const [date, setDate] = useState(""); const [cid, setCid] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => { if (sheet === "notices") markNoticesRead(); }, [sheet]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <>
      <Sheet open={sheet === "focus"} onClose={close} title="Focus timer">
        <p className="mb-4 text-[13.5px] leading-snug text-[var(--dim)]">Pick a length and put your phone down. Birdie will nap beside you and cheer when you're done.</p>
        <div className="grid grid-cols-3 gap-2">{[15, 25, 50].map((m) => (<button key={m} onClick={() => { startFocus(m); close(); }} className="rounded-2xl border-2 border-[var(--line)] bg-white py-4 text-center active:scale-95"><div className="disp text-[24px] font-bold text-[var(--text)]">{m}</div><div className="text-[11.5px] text-[var(--dim)]">minutes</div></button>))}</div>
      </Sheet>

      <Sheet open={sheet === "badges"} onClose={close} title="Achievements">
        <div className="mb-4 flex gap-3">{[["Streak", `${streak}d`], ["Notes", String(stats.notes)], ["Quizzes", String(stats.quizzes)]].map(([a, b]) => (<div key={a} className="flex-1 rounded-2xl bg-[var(--paper-dim)] p-3 text-center"><div className="disp text-[20px] font-bold">{b}</div><div className="text-[11px] text-[var(--dim)]">{a}</div></div>))}</div>
        <div className="grid grid-cols-2 gap-2.5">{BADGES.map((b) => { const on = unlocked.includes(b.id); return (
          <div key={b.id} className={`rounded-2xl border p-3 ${on ? "border-[var(--birdie)] bg-[var(--birdie-soft)]" : "border-[var(--line)] bg-white opacity-60"}`}><div className={`text-[24px] ${on ? "" : "grayscale"}`}>{b.emoji}</div><div className="mt-1 text-[13px] font-bold text-[var(--text)]">{b.label}</div><div className="text-[11.5px] leading-snug text-[var(--dim)]">{b.desc}</div></div>); })}</div>
      </Sheet>

      <Sheet open={sheet === "deadline"} onClose={close} title="Add a test or deadline">
        <div className="space-y-3">
          <TextField value={title} onChange={setTitle} placeholder="e.g. MTH 201 test, or Assignment 3" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-2xl border-2 border-[var(--line)] bg-white p-3.5 text-[14px] outline-none focus:border-[var(--birdie)]" />
          <div className="no-scrollbar flex gap-2 overflow-x-auto">{[{ id: null as string | null, label: "No course" }, ...courses.map((c) => ({ id: c.id as string | null, label: c.code }))].map((c) => (<button key={c.label} onClick={() => setCid(c.id)} className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold ${cid === c.id ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{c.label}</button>))}</div>
          <Btn variant="birdie" disabled={!title.trim() || !date} onClick={() => { addDeadline(title.trim(), date, cid); setTitle(""); setDate(""); setCid(null); close(); flash("Added. I'll count down for you"); }}>Add</Btn>
          {deadlines.length > 0 && <div className="border-t border-[var(--line)] pt-3">{deadlines.map((d) => (<div key={d.id} className="flex items-center justify-between py-1.5 text-[13px]"><span className="truncate">{d.title} · {d.date}</span><button onClick={() => deleteDeadline(d.id)} aria-label="Delete" className="text-[var(--dim)]"><Trash2 size={14} /></button></div>))}</div>}
        </div>
      </Sheet>

      <Sheet open={sheet === "search"} onClose={close} title="Search your Study">
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[var(--paper-dim)] px-3.5 py-3"><Search size={16} className="text-[var(--dim)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Notes, files, courses, recordings" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#a99fb8]" /></div>
        {q.trim().length < 2 ? <p className="text-[13px] text-[var(--dim)]">Type at least two letters. Birdie searches everything you've added, including the text inside your .txt files.</p> : results.length === 0 ? <Empty title="Nothing found" text="Try a different word." /> : (
          <div className="space-y-2">{results.map((r) => (<button key={r.key} onClick={() => { close(); goStudy({ courseId: r.courseId, tab: r.tab }); }} className="flex w-full items-start gap-3 rounded-2xl border border-[var(--line)] bg-white p-3 text-left active:scale-[0.98]"><span className="mt-0.5 rounded-md bg-[var(--uni-soft)] px-1.5 py-0.5 text-[10.5px] font-bold text-[var(--uni-deep)]">{r.kind}</span><div className="min-w-0"><div className="truncate text-[13.5px] font-semibold">{r.title}</div><div className="truncate text-[12px] text-[var(--dim)]">{r.snip}</div></div></button>))}</div>)}
      </Sheet>

      <Sheet open={sheet === "notices"} onClose={close} title="Notifications">
        {notices.length === 0 ? <Empty icon={<Bell size={20} />} title="All caught up" text="Recommendations, badges, replies and writer messages show up here." /> : (<>
          <div className="space-y-2">{notices.map((n) => (<div key={n.id} className="rounded-2xl border border-[var(--line)] bg-white p-3"><div className="flex justify-between gap-2"><div className="text-[13.5px] font-semibold">{n.title}</div><div className="shrink-0 text-[11px] text-[var(--dim)]">{n.t}</div></div>{n.body && <div className="mt-0.5 text-[12.5px] text-[var(--dim)]">{n.body}</div>}</div>))}</div>
          <button onClick={clearNotices} className="mt-3 w-full py-2 text-[13px] font-semibold text-[var(--dim)]">Clear all</button></>)}
      </Sheet>
    </>
  );
}
