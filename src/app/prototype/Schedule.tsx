"use client";

// Courses > Today and the Timetable: classes, tests, exams and deadlines from every course chat you're in.
// Reps (course owners and admins) add weekly classes and one-off events here, or just post them in the
// course chat and Birdie adds them. Everyone gets a reminder the day before and an hour before.
import { CalendarDays, ChevronRight, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addCourseEvent, addCourseSlot, deleteCourseEvent, deleteCourseSlot, mySchedule, type CourseEvent, type CourseSlot, type EventKind, type Schedule } from "./live/campusData";
import { useApp } from "./store";
import { Page } from "./ui";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const KIND: Record<string, { label: string; color: string }> = {
  class: { label: "Class", color: "#3D83F7" }, lecture: { label: "Lecture", color: "#3D83F7" }, tutorial: { label: "Tutorial", color: "#1B8A85" }, practical: { label: "Practical", color: "#7C4DDB" }, lab: { label: "Lab", color: "#7C4DDB" },
  test: { label: "Test", color: "#E2553F" }, exam: { label: "Exam", color: "#D9467E" }, deadline: { label: "Deadline", color: "#F5A623" }, cancelled: { label: "Cancelled", color: "#7F7F7F" }, other: { label: "Event", color: "#576B95" },
};
const t12 = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
// Times show in Nigeria time, the way reps type them, whatever the phone is set to.
const TZ = "Africa/Lagos";
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: TZ });
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const daysUntil = (iso: string) => { const d = new Date(iso); const t = new Date(); t.setHours(0, 0, 0, 0); const x = new Date(d); x.setHours(0, 0, 0, 0); return Math.round((x.getTime() - t.getTime()) / 86400000); };
const when = (iso: string) => { const n = daysUntil(iso); return n === 0 ? `Today, ${timeOf(iso)}` : n === 1 ? `Tomorrow, ${timeOf(iso)}` : `${new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", timeZone: TZ })}, ${timeOf(iso)}`; };

/** Today's classes and what's next, for every day of a week. */
function useSchedule(active = true) {
  const { auth } = useApp();
  const [s, setS] = useState<Schedule | null>(null);
  const load = useCallback(async () => {
    if (auth.status !== "in") return;
    const from = new Date(); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - from.getDay());
    const to = new Date(from); to.setDate(to.getDate() + 70);
    setS(await mySchedule(from, to));
  }, [auth.status]);
  useEffect(() => { if (active) void Promise.resolve().then(load); }, [active, load]);
  return { s, load };
}

type Item = { key: string; time: string; sort: string; course: string; kind: string; title: string; venue: string | null; cancelled?: boolean; event?: CourseEvent; slot?: CourseSlot };
function dayItems(s: Schedule, day: Date): Item[] {
  const events = s.events.filter((e) => sameDay(new Date(e.starts_at), day));
  const cancelledCourses = new Set(events.filter((e) => e.kind === "cancelled").map((e) => e.group_id));
  const slots: Item[] = s.slots.filter((x) => x.weekday === day.getDay()).map((x) => ({
    key: "s" + x.id, time: `${t12(x.starts)} – ${t12(x.ends)}`, sort: x.starts, course: x.course, kind: x.kind, title: KIND[x.kind]?.label ?? "Class", venue: x.venue, cancelled: cancelledCourses.has(x.group_id), slot: x,
  }));
  const ev: Item[] = events.map((e) => ({ key: "e" + e.id, time: timeOf(e.starts_at), sort: new Date(e.starts_at).toTimeString().slice(0, 5), course: e.course, kind: e.kind, title: e.title, venue: e.venue, event: e }));
  return [...slots, ...ev].sort((a, b) => a.sort.localeCompare(b.sort));
}

function Row({ it, onDelete }: { it: Item; onDelete?: () => void }) {
  const k = KIND[it.kind] ?? KIND.other;
  return (
    <div className="flex items-center gap-3 border-b border-[var(--we-sep)] py-2.5 last:border-0">
      <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: k.color }} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[15px] ${it.cancelled ? "text-[var(--we-hint)] line-through" : "text-[var(--we-text)]"}`}>{it.course} · {it.title}</span>
        <span className="block truncate text-[12.5px] text-[var(--we-sub)]">{it.time}{it.venue ? ` · ${it.venue}` : ""}{it.cancelled ? " · cancelled" : ""}</span>
      </span>
      <span className="shrink-0 rounded-[4px] px-1.5 py-0.5 text-[11px]" style={{ color: k.color, background: `${k.color}1A` }}>{k.label}</span>
      {onDelete && <button onClick={onDelete} aria-label="Remove" className="text-[var(--we-hint)]"><Trash2 size={16} /></button>}
    </div>
  );
}

const lagosMin = (d: Date) => { const [h, m] = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).split(":").map(Number); return h * 60 + m; };
const hhmmMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const what = (it: { course: string; kind: string }) => `${it.course} ${(KIND[it.kind]?.label ?? "class").toLowerCase()}`;

/** One short line: what's on now, what's next today, or the next test. */
function hintOf(s: Schedule, items: Item[], now: Date) {
  const n = lagosMin(now);
  const live = items.filter((it) => !it.cancelled && it.kind !== "cancelled").map((it) => {
    const start = it.slot ? hhmmMin(it.slot.starts) : lagosMin(new Date(it.event!.starts_at));
    const end = it.slot ? hhmmMin(it.slot.ends) : it.event?.ends_at ? lagosMin(new Date(it.event.ends_at)) : start + 60;
    return { it, start, end };
  });
  const on = live.find((x) => x.start <= n && n < x.end);
  if (on) return `${what(on.it)} is on now${on.it.venue ? ` · ${on.it.venue}` : ""}`;
  const next = live.filter((x) => x.start > n).sort((a, b) => a.start - b.start)[0];
  if (next) { const d = next.start - n; return `Time for ${what(next.it)} ${d < 60 ? `in ${d} min` : d < 180 ? `in ${Math.round(d / 60)} hour${Math.round(d / 60) === 1 ? "" : "s"}` : `at ${next.it.time.split(" – ")[0]}`}`; }
  const test = s.events.find((e) => ["test", "exam", "deadline"].includes(e.kind) && new Date(e.starts_at) > now && daysUntil(e.starts_at) <= 7);
  if (test) { const d = daysUntil(test.starts_at); return `${what(test)} ${d <= 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`}`; }
  return live.length ? "Done for today" : "Nothing on today";
}

/** The card at the top of Courses. */
export function TodaySchedule({ onOpen }: { onOpen: () => void }) {
  const { auth, tab } = useApp();
  const { s } = useSchedule(tab === "study");
  if (auth.status !== "in") return null;
  const today = new Date();
  const items = s ? dayItems(s, today) : [];
  const next = (s?.events ?? []).filter((e) => e.kind !== "cancelled" && new Date(e.starts_at) > today && !sameDay(new Date(e.starts_at), today) && daysUntil(e.starts_at) <= 14).slice(0, 2);
  return (
    <div className="overflow-hidden rounded-[10px] bg-[var(--we-cell)]">
      <button onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--we-accent)] text-white"><CalendarDays size={21} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-medium text-[var(--we-text)]">My Schedule</span>
          <span className="block truncate text-[13.5px] text-[var(--we-sub)]">{s ? hintOf(s, items, today) : " "}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-[var(--we-hint)]" />
      </button>
      {items.length > 0 && <div className="border-t border-[var(--we-sep)] px-4">{items.map((it) => <Row key={it.key} it={it} />)}</div>}
      {next.length > 0 && (
        <div className="border-t border-[var(--we-sep)] px-4 pt-1">
          {next.map((e) => <Row key={e.id} it={{ key: e.id, time: when(e.starts_at), sort: "", course: e.course, kind: e.kind, title: e.title, venue: e.venue }} />)}
        </div>
      )}
    </div>
  );
}

/** The full timetable: this week day by day, everything upcoming, and the rep's tools. */
export function TimetablePage({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { flash } = useApp();
  const { s, load } = useSchedule(open);
  const [view, setView] = useState<"week" | "upcoming" | "manage">("week");
  const [since] = useState(() => Date.now() - 3600e3); // "upcoming" = from an hour ago
  const week = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, []);
  async function del(it: Item) {
    if (!confirm(`Remove "${it.title}" for everyone in ${it.course}?`)) return;
    const r = it.event ? await deleteCourseEvent(it.event.id) : it.slot ? await deleteCourseSlot(it.slot.id) : null;
    if (r?.error) flash("Couldn't remove it"); else void load();
  }
  const canManage = (s?.manage.length ?? 0) > 0;
  return (
    <Page open={open} onClose={onClose} title="Timetable">
      <div className="flex gap-6 bg-[var(--we-bg)] px-4 pb-2 pt-1 text-[15px]">
        {([["week", "This Week"], ["upcoming", "Upcoming"], ...(canManage ? [["manage", "For Reps"]] : [])] as [typeof view, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} className={`pb-1 ${view === id ? "border-b-2 border-[var(--we-accent)] font-medium text-[var(--we-text)]" : "text-[var(--we-link)]"}`}>{label}</button>
        ))}
      </div>
      {!s ? <p className="py-10 text-center text-[13.5px] text-[var(--we-sub)]">Loading...</p> : view === "week" ? (
        <div className="pb-10">{week.map((d) => {
          const items = dayItems(s, d);
          return (
            <div key={d.toISOString()}>
              <div className="px-4 pb-1 pt-3 text-[13px] text-[var(--we-sub)]">{sameDay(d, new Date()) ? "Today" : DAYS[d.getDay()]} · {d.toLocaleDateString([], { day: "numeric", month: "short" })}</div>
              <div className="bg-[var(--we-cell)] px-4">{items.length ? items.map((it) => <Row key={it.key} it={it} />) : <p className="py-3 text-[13.5px] text-[var(--we-hint)]">Nothing</p>}</div>
            </div>
          );
        })}</div>
      ) : view === "upcoming" ? (
        <div className="mt-2 bg-[var(--we-cell)] px-4">
          {s.events.filter((e) => new Date(e.starts_at) >= new Date(since)).length === 0 ? <p className="py-6 text-center text-[14px] text-[var(--we-sub)]">No tests, exams or deadlines coming up</p>
            : s.events.filter((e) => new Date(e.starts_at) >= new Date(since)).map((e) => <Row key={e.id} it={{ key: e.id, time: when(e.starts_at), sort: "", course: e.course, kind: e.kind, title: e.title, venue: e.venue, event: e }} onDelete={e.can_manage ? () => void del({ key: e.id, time: "", sort: "", course: e.course, kind: e.kind, title: e.title, venue: e.venue, event: e }) : undefined} />)}
        </div>
      ) : (
        <RepTools s={s} onChanged={load} onDelete={del} />
      )}
    </Page>
  );
}

function RepTools({ s, onChanged, onDelete }: { s: Schedule; onChanged: () => void; onDelete: (it: Item) => void }) {
  const { flash } = useApp();
  const [group, setGroup] = useState(s.manage[0]?.group_id ?? "");
  const [slot, setSlot] = useState({ weekday: 1, starts: "08:00", ends: "10:00", kind: "lecture" as CourseSlot["kind"], venue: "" });
  const [ev, setEv] = useState({ kind: "test" as EventKind, title: "", date: "", time: "10:00", venue: "" });
  const [busy, setBusy] = useState(false);
  const field = "w-full rounded-[6px] bg-[var(--we-bg)] px-3 py-2.5 text-[15px] text-[var(--we-text)] outline-none";
  async function addSlot() {
    setBusy(true); const r = await addCourseSlot(group, slot); setBusy(false);
    if (r.error) return flash(r.error === "too_many" ? "That's the most classes a course can have" : "Couldn't add the class");
    flash("Added to everyone's weekly timetable"); onChanged();
  }
  async function addEvent() {
    if (!ev.date) return flash("Pick a date");
    setBusy(true); const r = await addCourseEvent(group, { kind: ev.kind, title: ev.title.trim() || `${s.manage.find((m) => m.group_id === group)?.course ?? ""} ${KIND[ev.kind].label.toLowerCase()}`.trim(), starts: new Date(`${ev.date}T${ev.time || "09:00"}:00+01:00`), venue: ev.venue || null }); setBusy(false);
    if (r.error) return flash(r.error === "bad_time" ? "That date is in the past" : "Couldn't add it");
    flash("Added. Everyone in the course was told."); setEv((x) => ({ ...x, title: "", date: "" })); onChanged();
  }
  const slots = s.slots.filter((x) => x.group_id === group);
  return (
    <div className="pb-10">
      <p className="px-4 pt-3 text-[12.5px] leading-snug text-[var(--we-sub)]">You can also just post it in the course chat (&quot;CSC 301 test Thursday 10am LT2&quot;) and Birdie adds it for everyone.</p>
      <div className="px-4 pb-1.5 pt-3 text-[13px] text-[var(--we-sub)]">Course</div>
      <div className="bg-[var(--we-cell)] px-4 py-3"><select value={group} onChange={(e) => setGroup(e.target.value)} className={field}>{s.manage.map((m) => <option key={m.group_id} value={m.group_id}>{m.course}</option>)}</select></div>

      <div className="px-4 pb-1.5 pt-4 text-[13px] text-[var(--we-sub)]">Weekly classes</div>
      <div className="bg-[var(--we-cell)] px-4">{slots.length ? slots.map((x) => { const it: Item = { key: x.id, time: `${DAYS[x.weekday]} · ${t12(x.starts)} – ${t12(x.ends)}`, sort: "", course: x.course, kind: x.kind, title: KIND[x.kind].label, venue: x.venue, slot: x }; return <Row key={x.id} it={it} onDelete={() => onDelete(it)} />; }) : <p className="py-3 text-[13.5px] text-[var(--we-hint)]">No weekly classes yet</p>}</div>
      <div className="grid grid-cols-2 gap-2 bg-[var(--we-cell)] px-4 pb-4 pt-1">
        <select value={slot.weekday} onChange={(e) => setSlot((x) => ({ ...x, weekday: Number(e.target.value) }))} className={field}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
        <select value={slot.kind} onChange={(e) => setSlot((x) => ({ ...x, kind: e.target.value as CourseSlot["kind"] }))} className={field}>{["lecture", "tutorial", "practical", "lab"].map((k) => <option key={k} value={k}>{KIND[k].label}</option>)}</select>
        <input type="time" value={slot.starts} onChange={(e) => setSlot((x) => ({ ...x, starts: e.target.value }))} className={field} aria-label="Starts" />
        <input type="time" value={slot.ends} onChange={(e) => setSlot((x) => ({ ...x, ends: e.target.value }))} className={field} aria-label="Ends" />
        <input value={slot.venue} onChange={(e) => setSlot((x) => ({ ...x, venue: e.target.value }))} placeholder="Venue, e.g. LT1" className={`${field} col-span-2`} />
        <button disabled={busy || !group || slot.ends <= slot.starts} onClick={() => void addSlot()} className="col-span-2 rounded-[6px] bg-[var(--we-accent)] py-2.5 text-[15px] font-medium text-white disabled:opacity-40">Add Weekly Class</button>
      </div>

      <div className="px-4 pb-1.5 pt-4 text-[13px] text-[var(--we-sub)]">Test, exam, deadline or cancelled class</div>
      <div className="grid grid-cols-2 gap-2 bg-[var(--we-cell)] px-4 py-4">
        <select value={ev.kind} onChange={(e) => setEv((x) => ({ ...x, kind: e.target.value as EventKind }))} className={field}>{(["test", "exam", "deadline", "cancelled", "class", "other"] as EventKind[]).map((k) => <option key={k} value={k}>{KIND[k].label}</option>)}</select>
        <input value={ev.venue} onChange={(e) => setEv((x) => ({ ...x, venue: e.target.value }))} placeholder="Venue" className={field} />
        <input value={ev.title} onChange={(e) => setEv((x) => ({ ...x, title: e.target.value.slice(0, 140) }))} placeholder="Title (optional), e.g. CSC 301 mid-semester test" className={`${field} col-span-2`} />
        <input type="date" value={ev.date} onChange={(e) => setEv((x) => ({ ...x, date: e.target.value }))} className={field} aria-label="Date" />
        <input type="time" value={ev.time} onChange={(e) => setEv((x) => ({ ...x, time: e.target.value }))} className={field} aria-label="Time" />
        <button disabled={busy || !group} onClick={() => void addEvent()} className="col-span-2 rounded-[6px] bg-[var(--we-accent)] py-2.5 text-[15px] font-medium text-white disabled:opacity-40">Add for Everyone</button>
      </div>
    </div>
  );
}
