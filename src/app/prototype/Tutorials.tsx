"use client";

import { Calendar, GraduationCap, MapPin, Users, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { naira, useApp } from "./store";
import { Btn, Segmented, Sheet, TextField } from "./ui";

type Tut = {
  id: string; title: string; course_code: string | null; description: string; starts_at: string; duration_min: number; mode: "in_person" | "online";
  location: string | null; price_ngn: number; seats: number; school: string | null; status: "open" | "cancelled"; tutor_name: string | null;
  booked: number; mine: boolean; my_booking: { id: string; status: string } | null;
};
type Dash = { paid_now: number; earned: number; held: number; sessions: Tut[]; booked: Tut[] };
const msg = (e: { message?: string } | null) => (e?.message ?? "").replace(/^.*?exception:\s*/i, "");
const when = (t: Tut) => new Date(t.starts_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const ERRORS: Record<string, string> = {
  full: "This tutorial is full.", already_started: "It has already started.", own_tutorial: "That's your own tutorial.",
  too_late: "That window has passed.", not_started: "You can report a problem once the session has started.",
  school_required: "Add your school in Settings > Edit profile first. In-person tutorials are shown to students at your school.",
  starts_in_past: "Pick a time in the future.", title_required: "Give it a title.",
};

function TutCard({ t, onOpen }: { t: Tut; onOpen: () => void }) {
  const left = Math.max(0, t.seats - t.booked);
  return (
    <button onClick={onOpen} className="w-full rounded-2xl border border-[var(--line)] bg-white p-3.5 text-left active:scale-[0.98]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="text-[14px] font-bold leading-snug">{t.title}</div><div className="text-[12px] text-[var(--dim)]">{[t.course_code, t.tutor_name && `by ${t.tutor_name}`].filter(Boolean).join(" · ")}</div></div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${t.price_ngn ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--study-soft)] text-[var(--study)]"}`}>{t.price_ngn ? naira(t.price_ngn) : "Free"}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--dim)]">
        <span className="inline-flex items-center gap-1"><Calendar size={12} /> {when(t)}</span>
        <span className="inline-flex items-center gap-1">{t.mode === "online" ? <Video size={12} /> : <MapPin size={12} />} {t.mode === "online" ? "Online" : t.school ?? "On campus"}</span>
        <span className="inline-flex items-center gap-1"><Users size={12} /> {left} of {t.seats} seats left</span>
        {t.my_booking && t.my_booking.status !== "cancelled" && <span className="font-bold text-[var(--uni-deep)]">Booked</span>}
      </div>
    </button>
  );
}

/** Help hub section: upcoming tutorials, booking, hosting, and the tutor dashboard. */
export function TutorialsSection({ active }: { active: boolean }) {
  const { auth, flash, refreshWallet, setWalletOpen } = useApp();
  const [list, setList] = useState<Tut[]>([]);
  const [sel, setSel] = useState<Tut | null>(null);
  const [sheet, setSheet] = useState<null | "all" | "host" | "dash">(null);
  const [dash, setDash] = useState<Dash | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [f, setF] = useState({ title: "", course: "", desc: "", date: "", mode: "in_person" as "in_person" | "online", location: "", price: "0", seats: "20", duration: "60" });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(i); }, []);

  const load = useCallback(async () => { const { data } = await createClient().rpc("list_tutorials"); setList((data ?? []) as Tut[]); }, []);
  // Opening the dashboard is also what pays out tutorials that cleared their 24-hour window.
  const applyDash = useCallback((data: unknown) => {
    const d = data as Dash | null; setDash(d);
    if (d?.paid_now) { flash(`${naira(d.paid_now)} from your tutorials was paid into your balance`); void refreshWallet(); }
  }, [flash, refreshWallet]);
  const loadDash = useCallback(async () => applyDash((await createClient().rpc("my_tutoring")).data), [applyDash]);
  useEffect(() => { if (active && auth.status === "in") void createClient().rpc("list_tutorials").then(({ data }) => setList((data ?? []) as Tut[])); }, [active, auth.status]);
  useEffect(() => { if (sheet === "dash") void createClient().rpc("my_tutoring").then(({ data }) => applyDash(data)); }, [sheet, applyDash]);

  if (auth.status !== "in") return null;
  const fresh = (id: string) => list.find((x) => x.id === id) ?? dash?.booked.find((x) => x.id === id) ?? dash?.sessions.find((x) => x.id === id) ?? null;

  async function call(fn: string, args: Record<string, unknown>, ok: string) {
    setBusy(true);
    const { error } = await createClient().rpc(fn, args);
    setBusy(false);
    if (error) {
      if (/insufficient_funds/.test(error.message)) { flash("Top up first to book this tutorial"); setSel(null); setWalletOpen(true); return false; }
      flash(ERRORS[msg(error)] ?? "Something went wrong. Try again."); return false;
    }
    flash(ok); void refreshWallet(); await load(); if (sheet === "dash") await loadDash();
    return true;
  }
  async function host() {
    if (!f.date) return flash("Pick a date and time");
    setBusy(true);
    const { error } = await createClient().rpc("host_tutorial", { p: { title: f.title, course_code: f.course, description: f.desc, starts_at: new Date(f.date).toISOString(), mode: f.mode, location: f.location, price_ngn: Math.round(Number(f.price) || 0), seats: Math.round(Number(f.seats) || 20), duration_min: Math.round(Number(f.duration) || 60) } });
    setBusy(false);
    if (error) return flash(ERRORS[msg(error)] ?? "Couldn't create the tutorial.");
    flash("Your tutorial is live in Help"); setF({ ...f, title: "", course: "", desc: "", date: "", location: "" }); setSheet(null); void load();
  }

  const s = sel ? fresh(sel.id) ?? sel : null;
  const booking = s?.my_booking?.status;
  const ended = s ? new Date(s.starts_at).getTime() < now : false;

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between"><span className="disp text-[16px] font-bold text-[var(--text)]">Tutorials</span>
        <div className="flex gap-3"><button onClick={() => setSheet("dash")} className="text-[12.5px] font-bold text-[var(--uni)]">Mine</button><button onClick={() => setSheet("host")} className="text-[12.5px] font-bold text-[var(--uni)]">Host one</button></div></div>
      {list.length === 0 ? <p className="text-[12.5px] leading-snug text-[var(--dim)]">Exam coming and you understand a course? Host a tutorial and charge for it, or make it free. Classmates&apos; tutorials show up here.</p>
        : list.slice(0, 2).map((t) => <TutCard key={t.id} t={t} onOpen={() => setSel(t)} />)}
      {list.length > 2 && <button onClick={() => setSheet("all")} className="text-[12.5px] font-bold text-[var(--uni)]">See all {list.length} tutorials</button>}

      <Sheet open={sheet === "all"} onClose={() => setSheet(null)} title="Tutorials">
        <div className="space-y-2.5">{list.map((t) => <TutCard key={t.id} t={t} onOpen={() => { setSheet(null); setSel(t); }} />)}</div>
      </Sheet>

      <Sheet open={!!s} onClose={() => { setSel(null); setReason(""); }} title={s?.title}>
        {s && (
          <div className="space-y-3">
            <div className="text-[13px] text-[var(--dim)]">{[s.course_code, s.tutor_name && `by ${s.tutor_name}`].filter(Boolean).join(" · ")}</div>
            {s.description && <p className="whitespace-pre-line text-[13.5px] leading-snug">{s.description}</p>}
            <div className="space-y-1 rounded-xl bg-[var(--paper-dim)] p-3 text-[13px]">
              <div className="flex items-center gap-2"><Calendar size={14} /> {when(s)} · {s.duration_min} min</div>
              <div className="flex items-center gap-2">{s.mode === "online" ? <Video size={14} /> : <MapPin size={14} />} {s.location ?? (s.mode === "online" ? "Online. The link shows here once you book." : "On campus. The venue shows here once you book.")}</div>
              <div className="flex items-center gap-2"><Users size={14} /> {s.booked} booked of {s.seats}</div>
            </div>
            {s.mine ? <p className="text-[12.5px] text-[var(--dim)]">This is your tutorial. Manage it from Tutorials &gt; Mine.</p>
              : booking === "booked" ? (<>
                {!ended && <Btn variant="ghost" disabled={busy} onClick={() => void call("cancel_tutorial_booking", { p_id: s.id }, s.price_ngn ? `Cancelled. ${naira(s.price_ngn)} refunded.` : "Booking cancelled")}>Cancel my booking</Btn>}
                {!ended && <p className="text-[11.5px] text-[var(--dim)]">Free cancellation up to 12 hours before it starts.</p>}
                {ended && (<>
                  <TextField multiline value={reason} onChange={setReason} placeholder="Tutor didn't show up, or it wasn't what was promised? Tell us what happened." />
                  <Btn variant="ghost" disabled={busy || reason.trim().length < 5} onClick={() => void call("report_tutorial", { p_id: s.id, p_reason: reason.trim() }, "Reported. We're holding the payment while we look into it.")}>Report a problem</Btn>
                  <p className="text-[11.5px] text-[var(--dim)]">You can report within 24 hours after it ends. After that the tutor is paid.</p>
                </>)}
              </>)
              : booking === "disputed" ? <p className="text-[13px] text-[var(--dim)]">You reported this tutorial. Unisupport is looking into it and the payment is on hold.</p>
              : (<>
                <Btn variant="study" disabled={busy || s.booked >= s.seats} onClick={() => void call("book_tutorial", { p_id: s.id }, s.price_ngn ? `Booked. ${naira(s.price_ngn)} paid.` : "You're booked")}>{s.booked >= s.seats ? "Full" : s.price_ngn ? `Book for ${naira(s.price_ngn)}` : "Book my seat (free)"}</Btn>
                {s.price_ngn > 0 && <p className="text-[11.5px] leading-snug text-[var(--dim)]">Birdie holds your payment and only pays the tutor 24 hours after the session, so you can report a problem if it doesn&apos;t happen.</p>}
              </>)}
          </div>
        )}
      </Sheet>

      <Sheet open={sheet === "host"} onClose={() => setSheet(null)} title="Host a tutorial">
        <div className="space-y-3">
          <TextField value={f.title} onChange={(v) => setF({ ...f, title: v })} placeholder="e.g. BTG 202 exam revision" />
          <TextField value={f.course} onChange={(v) => setF({ ...f, course: v })} placeholder="Course code (optional)" />
          <TextField multiline value={f.desc} onChange={(v) => setF({ ...f, desc: v })} placeholder="What you'll cover and who it's for" />
          <div><div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">When</div><input type="datetime-local" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="w-full rounded-2xl bg-[var(--paper-dim)] px-4 py-3 text-[14px] outline-none" /></div>
          <Segmented value={f.mode} onChange={(v) => setF({ ...f, mode: v })} options={[{ id: "in_person", label: "On campus" }, { id: "online", label: "Online" }]} />
          <TextField value={f.location} onChange={(v) => setF({ ...f, location: v })} placeholder={f.mode === "online" ? "Meeting link (only booked students see it)" : "Venue, e.g. LT2 (only booked students see it)"} />
          <div className="grid grid-cols-3 gap-2">
            <TextField value={f.price} onChange={(v) => setF({ ...f, price: v.replace(/[^\d]/g, "") })} placeholder="Price ₦ (0 = free)" />
            <TextField value={f.seats} onChange={(v) => setF({ ...f, seats: v.replace(/[^\d]/g, "") })} placeholder="Seats" />
            <TextField value={f.duration} onChange={(v) => setF({ ...f, duration: v.replace(/[^\d]/g, "") })} placeholder="Minutes" />
          </div>
          <p className="text-[11.5px] leading-snug text-[var(--dim)]">{Number(f.price) > 0 ? `You get ${naira(Math.round(Number(f.price) * 0.9))} per student, paid 24 hours after the session.` : "Free tutorials are great for building a following."} {f.mode === "in_person" ? "Shown to students at your school." : "Shown to all students."}</p>
          <Btn variant="study" disabled={busy || !f.title.trim() || !f.date} onClick={() => void host()}><span className="inline-flex items-center gap-2"><GraduationCap size={16} /> {busy ? "Publishing..." : "Publish tutorial"}</span></Btn>
        </div>
      </Sheet>

      <Sheet open={sheet === "dash"} onClose={() => setSheet(null)} title="My tutorials">
        {!dash ? <p className="py-6 text-center text-[13px] text-[var(--dim)]">Loading...</p> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[var(--paper-dim)] p-3"><div className="text-[11px] text-[var(--dim)]">Earned from tutoring</div><div className="disp text-[20px] font-bold">{naira(dash.earned)}</div></div>
              <div className="rounded-xl bg-[var(--paper-dim)] p-3"><div className="text-[11px] text-[var(--dim)]">Waiting to be paid</div><div className="disp text-[20px] font-bold">{naira(dash.held)}</div></div>
            </div>
            <div><div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Tutorials I host</div>
              {dash.sessions.length === 0 ? <p className="text-[13px] text-[var(--dim)]">None yet.</p> : <div className="space-y-2">{dash.sessions.map((t) => (
                <div key={t.id} className="rounded-xl bg-white p-3 ring-1 ring-[var(--line)]">
                  <div className="flex justify-between gap-2"><span className="text-[13.5px] font-bold">{t.title}</span><span className="text-[12px] text-[var(--dim)]">{t.status === "cancelled" ? "Cancelled" : `${t.booked}/${t.seats} booked`}</span></div>
                  <div className="text-[12px] text-[var(--dim)]">{when(t)}</div>
                  {t.status === "open" && new Date(t.starts_at).getTime() > now && <button disabled={busy} onClick={() => { if (confirm(`Cancel "${t.title}"? Everyone who booked is refunded.`)) void call("cancel_tutorial", { p_id: t.id }, "Cancelled. Everyone who booked was refunded."); }} className="mt-1 text-[12px] font-semibold text-[var(--help)]">Cancel tutorial</button>}
                </div>
              ))}</div>}
            </div>
            <div><div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Tutorials I booked</div>
              {dash.booked.length === 0 ? <p className="text-[13px] text-[var(--dim)]">None yet.</p> : <div className="space-y-2">{dash.booked.map((t) => <TutCard key={t.id} t={t} onOpen={() => { setSheet(null); setSel(t); }} />)}</div>}
            </div>
          </div>
        )}
      </Sheet>
    </section>
  );
}
