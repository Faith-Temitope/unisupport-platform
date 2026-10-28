"use client";

// The Rep Desk: a course rep's chat with Birdie. The rep says it once ("CSC 301 class today 2pm LT1",
// "no class tomorrow", "assignment 2 due Friday") and Birdie puts it on everyone's timetable, posts the
// announcement in the class groups and the course chat, and everyone gets notified. Every action can be
// undone. Reps also make their class groups here: up to 3, like an Information group only they post in
// and a General group for everyone.
import { CalendarDays, ChevronRight, Megaphone, Plus, Send, Undo2, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { askAI } from "./aiClient";
import { BirdieAvatar } from "./ChatRoom";
import { addCourseEvent, deleteCourseEvent, type EventKind } from "./live/campusData";
import { deleteMessage, sendMessage } from "./live/chatData";
import { repCreateGroup, repGroups, repSetAnnounce, type RepCourse } from "./live/verifyData";
import { useApp } from "./store";
import { Page, Toggle } from "./ui";

export const openRepDesk = () => window.dispatchEvent(new Event("birdie-open-repdesk"));

type Done = { kind: "event" | "message"; id: string; group?: string; label: string; undone?: boolean };
type Msg = { id: string; from: "me" | "birdie"; text: string; done?: Done[]; at: number };
type Action =
  | { type: "event"; course: string; kind: EventKind; title: string; date: string; time?: string | null; venue?: string | null }
  | { type: "announce"; course: string; to: "info" | "general" | "course" | "all"; text: string };

const KEY = (uid: string) => `birdie-repdesk-${uid}`;
const TZ = "Africa/Lagos";
const intro: Msg = { id: "intro", from: "birdie", at: 0, text: "Tell me what's happening and I'll tell the class.\n\nFor example:\n\"CSC 301 class today 2pm in LT1\"\n\"No MTH 201 class tomorrow\"\n\"Assignment 2 is due Friday, submit to the HOD's office\"\n\nI put it on everyone's timetable, post it in your class groups and notify everyone. You can undo anything." };

export function RepDeskHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => { const on = () => setOpen(true); window.addEventListener("birdie-open-repdesk", on); return () => window.removeEventListener("birdie-open-repdesk", on); }, []);
  return <RepDesk open={open} onClose={() => setOpen(false)} />;
}

function RepDesk({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { auth, profile, flash, isRep } = useApp();
  const uid = auth.userId ?? "guest";
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [courses, setCourses] = useState<RepCourse[] | null>(null);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const load = useCallback(() => { void repGroups().then(setCourses); }, []);
  useEffect(() => {
    if (!open) return;
    void Promise.resolve().then(() => { try { setMsgs(JSON.parse(localStorage.getItem(KEY(uid)) ?? "[]")); } catch { setMsgs([]); } load(); });
  }, [open, uid, load]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length, busy]);
  const save = (next: Msg[]) => { setMsgs(next); try { localStorage.setItem(KEY(uid), JSON.stringify(next.slice(-60))); } catch { /* full */ } };

  async function run(actions: Action[]): Promise<Done[]> {
    const done: Done[] = [];
    for (const a of actions) {
      const c = courses?.find((x) => x.group_id === a.course);
      if (!c) continue;
      if (a.type === "event" && /^\d{4}-\d{2}-\d{2}$/.test(a.date)) {
        const time = a.time && /^\d{1,2}:\d{2}$/.test(a.time) ? a.time.padStart(5, "0") : a.kind === "deadline" ? "23:59" : "09:00";
        const starts = new Date(`${a.date}T${time}:00+01:00`);
        const kind = (["class", "test", "exam", "deadline", "cancelled", "other"].includes(a.kind) ? a.kind : "other") as EventKind;
        const r = await addCourseEvent(c.group_id, { kind, title: (a.title || c.course).slice(0, 140), starts, venue: a.venue || null });
        if (r.data) done.push({ kind: "event", id: r.data.id, label: `On the timetable: ${r.data.title}, ${starts.toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: TZ })}` });
        else flash(r.error === "bad_time" ? "That date has passed" : "Couldn't add it to the timetable");
      }
      if (a.type === "announce" && a.text?.trim()) {
        const info = c.groups.filter((g) => g.kind === "info"), general = c.groups.filter((g) => g.kind === "general");
        const targets = a.to === "all" ? [{ id: c.group_id, name: `${c.course} course chat` }, ...c.groups]
          : a.to === "general" ? (general.length ? general : [{ id: c.group_id, name: `${c.course} course chat` }])
          : a.to === "course" ? [{ id: c.group_id, name: `${c.course} course chat` }]
          : (info.length ? info : [{ id: c.group_id, name: `${c.course} course chat` }]);
        for (const g of targets) {
          const r = await sendMessage("group", g.id, "text", a.text.trim().slice(0, 1500), { birdie: true, asked_by: profile.name || "the course rep", rep: true });
          if (r.data) done.push({ kind: "message", id: r.data.id, group: g.id, label: `Posted in ${g.name}` });
        }
      }
    }
    return done;
  }

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    const mine: Msg = { id: crypto.randomUUID(), from: "me", text, at: Date.now() };
    const history = [...msgs, mine];
    save(history);
    if (!courses?.length) { save([...history, { id: crypto.randomUUID(), from: "birdie", at: Date.now(), text: "I can't find your class yet. Share your course from Courses so your classmates join its course chat, then tell me again." }]); return; }
    setBusy(true);
    const today = new Date().toLocaleDateString("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const now = new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
    const list = courses.map((c) => `- ${c.course} (id ${c.group_id}, ${c.members} students; groups: ${c.groups.map((g) => `${g.name} [${g.kind}]`).join(", ") || "none yet"})`).join("\n");
    const r = await askAI({ brain: "spark", tier: "quick", feature: "chat",
      system: `You are Birdie, helping ${profile.name || "a course rep"}, the course rep, manage their class on the Birdie student app. Today is ${today}, ${now} (Nigeria time).
The rep's courses:
${list}

When the rep tells you something for the class, act on it. Reply with JSON only, no code fences:
{"reply": "one or two short sentences to the rep saying what you did, or a question if something is unclear",
 "actions": [
   {"type": "event", "course": "<course id>", "kind": "class|test|exam|deadline|cancelled|other", "title": "short, like CSC 301 class", "date": "YYYY-MM-DD", "time": "HH:MM or null", "venue": "place or null"},
   {"type": "announce", "course": "<course id>", "to": "info|general|course|all", "text": "the announcement to post, written like a friendly, clear course rep. Include the day, date, time and venue. No hashtags."}
 ]}
Rules: anything with a date or time (a class, test, exam, deadline, a cancelled or moved class) gets an "event" AND an "announce" (to "info" unless the rep says otherwise). General news without a date gets only an "announce". A moved class is a "cancelled" event for the old time plus a "class" event for the new time. If the rep only asks you something, answer in "reply" with no actions. If it isn't clear which course, or the day is unclear, ask in "reply" and do nothing. Never invent a time or venue the rep didn't give.`,
      messages: history.filter((m) => m.id !== "intro").slice(-8).map((m) => ({ role: m.from === "me" ? "user" as const : "assistant" as const, content: m.text })) });
    let reply = "Sorry, I couldn't do that right now. Try again in a moment.", done: Done[] = [];
    if (r.ok) {
      try {
        const j = JSON.parse(r.text.replace(/^[^{]*/, "").replace(/[^}]*$/, "")) as { reply?: string; actions?: Action[] };
        done = await run(Array.isArray(j.actions) ? j.actions.slice(0, 8) : []);
        reply = j.reply?.trim() || (done.length ? "Done." : "Tell me a bit more.");
      } catch { reply = r.text.trim().slice(0, 600) || reply; }
    } else if (r.message) reply = r.message;
    setBusy(false);
    save([...history, { id: crypto.randomUUID(), from: "birdie", text: reply, done, at: Date.now() }]);
  }

  async function undo(m: Msg, d: Done) {
    const ok = d.kind === "event" ? !(await deleteCourseEvent(d.id)).error : !(await deleteMessage("group", d.id, true)).error;
    if (!ok) return flash("Couldn't undo that");
    save(msgs.map((x) => (x.id === m.id ? { ...x, done: x.done?.map((y) => (y.id === d.id ? { ...y, undone: true } : y)) } : x)));
    flash("Undone");
  }

  const shown = msgs.length ? msgs : [intro];
  return (
    <Page open={open} onClose={onClose} title="Rep Desk" right={<button onClick={() => setGroupsOpen(true)} aria-label="Class groups" className="flex h-10 w-10 items-center justify-center"><Users size={21} /></button>}>
      {!isRep ? <p className="px-10 py-16 text-center text-[14.5px] text-[var(--we-sub)]">The Rep Desk is for approved course reps. Apply in Settings &gt; Course rep.</p> : (
        <div className="flex min-h-full flex-col bg-[var(--we-chat,var(--we-bg))]">
          <div className="flex-1 space-y-4 px-3 py-4">
            {shown.map((m) => m.from === "birdie" ? (
              <div key={m.id} className="flex items-start gap-2.5">
                <BirdieAvatar />
                <div className="max-w-[78%] space-y-1.5">
                  <div className="whitespace-pre-line rounded-[6px] bg-[var(--we-bubble,var(--we-cell))] px-3 py-2.5 text-[15.5px] leading-snug text-[var(--we-text)]">{m.text}</div>
                  {m.done?.map((d) => (
                    <div key={d.id} className={`flex items-center gap-2 rounded-[6px] bg-[var(--we-cell)] px-3 py-2 text-[13.5px] ${d.undone ? "text-[var(--we-hint)] line-through" : "text-[var(--we-text)]"}`}>
                      {d.kind === "event" ? <CalendarDays size={15} className="shrink-0 text-[var(--we-accent)]" /> : <Megaphone size={15} className="shrink-0 text-[var(--we-accent)]" />}
                      <span className="min-w-0 flex-1">{d.label}</span>
                      {!d.undone && <button onClick={() => void undo(m, d)} aria-label="Undo" className="flex shrink-0 items-center gap-1 text-[var(--we-link)]"><Undo2 size={14} />Undo</button>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-end"><div className="max-w-[78%] whitespace-pre-line rounded-[6px] bg-[var(--we-mine)] px-3 py-2.5 text-[15.5px] leading-snug text-[var(--we-text)]">{m.text}</div></div>
            ))}
            {busy && <div className="flex items-center gap-2.5"><BirdieAvatar /><span className="rounded-[6px] bg-[var(--we-bubble,var(--we-cell))] px-3 py-2.5 text-[15px] text-[var(--we-sub)]">Working on it...</span></div>}
            {courses && courses.every((c) => c.groups.length === 0) && msgs.length === 0 && (
              <button onClick={() => setGroupsOpen(true)} className="mx-auto flex items-center gap-1.5 rounded-full bg-[var(--we-cell)] px-4 py-2 text-[13.5px] text-[var(--we-link)]"><Plus size={15} /> Make your class groups</button>
            )}
            <div ref={end} />
          </div>
          <div className="sticky bottom-0 flex items-end gap-2 border-t border-[var(--we-sep)] bg-[var(--we-bar,var(--we-bg))] px-3 py-2">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={1} placeholder="e.g. CSC 301 class today 2pm LT1" aria-label="Message Birdie"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              className="max-h-28 min-h-[38px] flex-1 resize-none rounded-[4px] bg-[var(--we-input,var(--we-cell))] px-3 py-2 text-[16px] text-[var(--we-text)] outline-none" />
            <button onClick={() => void send()} disabled={!draft.trim() || busy} aria-label="Send" className="mb-0.5 flex h-[36px] items-center gap-1 rounded-[4px] bg-[var(--we-accent)] px-3 text-[15px] font-medium text-white disabled:opacity-40"><Send size={16} /></button>
          </div>
        </div>
      )}
      <ClassGroups open={groupsOpen} onClose={() => setGroupsOpen(false)} courses={courses} reload={load} />
    </Page>
  );
}

function ClassGroups({ open, onClose, courses, reload }: { open: boolean; onClose: () => void; courses: RepCourse[] | null; reload: () => void }) {
  const { flash, setTab, setChatView } = useApp();
  const [making, setMaking] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", kind: "info" as "info" | "general" });
  const total = (courses ?? []).reduce((a, c) => a + c.groups.length, 0);
  async function create() {
    const r = await repCreateGroup(making!, f.name.trim(), f.kind);
    if (r.error) return flash(r.error === "three_max" ? "You already have 3 class groups" : r.error === "reps_only" ? "Only approved reps can do this" : "Couldn't make the group");
    setMaking(null); setF({ name: "", kind: "info" }); flash("Group made. Everyone in the course chat is in it."); reload();
  }
  return (
    <Page open={open} onClose={onClose} title="Class Groups">
      <p className="px-4 pb-1 pt-3 text-[13px] text-[var(--we-sub)]">Up to 3 groups. Everyone in the course chat is added, and anyone who joins later too. {3 - total} left.</p>
      {(courses ?? []).map((c) => (
        <div key={c.group_id}>
          <div className="px-4 pb-1.5 pt-4 text-[13px] text-[var(--we-sub)]">{c.course} · {c.members} students</div>
          <div className="bg-[var(--we-cell)]">
            {c.groups.map((g) => (
              <div key={g.id} className="border-b border-[var(--we-sep)] px-4 last:border-0">
                <button onClick={() => { onClose(); setTab("chats"); setChatView({ k: "group", id: g.id }); }} className="flex w-full items-center gap-3 py-3 text-left">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-[6px] text-white ${g.kind === "info" ? "bg-[#3D83F7]" : "bg-[#2AAE67]"}`}>{g.kind === "info" ? <Megaphone size={19} /> : <Users size={19} />}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[16px] text-[var(--we-text)]">{g.name}</span><span className="block text-[13px] text-[var(--we-sub)]">{g.members} members · {g.announce_only ? "Only you post" : "Everyone chats"}</span></span>
                  <ChevronRight size={18} className="text-[var(--we-hint)]" />
                </button>
                <div className="-mt-1 pb-1"><Toggle on={g.announce_only} onChange={async (v) => { const r = await repSetAnnounce(g.id, v); if (r.error) flash("Couldn't change it"); else reload(); }} label="Only I can post" /></div>
              </div>
            ))}
            {total < 3 && <button onClick={() => { setMaking(c.group_id); setF({ name: `${c.course} ${c.groups.some((g) => g.kind === "info") ? "General" : "Information"}`, kind: c.groups.some((g) => g.kind === "info") ? "general" : "info" }); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-[16px] text-[var(--we-link)]"><Plus size={20} /> New class group</button>}
          </div>
        </div>
      ))}
      {courses && courses.length === 0 && <p className="px-10 py-12 text-center text-[14px] text-[var(--we-sub)]">Share your course from Courses first. Your class joins its course chat, and your groups come from there.</p>}
      <Page open={!!making} onClose={() => setMaking(null)} title="New Class Group"
        right={<button disabled={f.name.trim().length < 2} onClick={() => void create()} className="mr-2 rounded-[4px] bg-[var(--we-accent)] px-3 py-1.5 text-[14px] font-medium text-white disabled:opacity-40">Create</button>}>
        <div className="mt-2 bg-[var(--we-cell)] px-4"><input value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value.slice(0, 60) }))} placeholder="Group name" className="w-full bg-transparent py-3.5 text-[16px] text-[var(--we-text)] outline-none" /></div>
        <div className="mt-2 bg-[var(--we-cell)]">
          {([["info", "Information", "Only you (and Birdie) post. Class times, tests, deadlines. Nothing gets buried."], ["general", "General", "Everyone chats."]] as const).map(([k, l, d]) => (
            <button key={k} onClick={() => setF((x) => ({ ...x, kind: k }))} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 text-left last:border-0">
              <span className="min-w-0 flex-1"><span className="block text-[16px] text-[var(--we-text)]">{l}</span><span className="block text-[13px] text-[var(--we-sub)]">{d}</span></span>
              <span className={`h-5 w-5 rounded-full border-2 ${f.kind === k ? "border-[var(--we-accent)] bg-[var(--we-accent)] shadow-[inset_0_0_0_3px_var(--we-cell)]" : "border-[var(--we-hint)]"}`} />
            </button>
          ))}
        </div>
      </Page>
    </Page>
  );
}
