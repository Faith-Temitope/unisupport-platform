"use client";

import { ClipboardCheck, Inbox, Send, Settings2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Btn2, Card, DeskShell, Input, PageTitle, Pill, Switch, nairaS, useToast } from "../staff/kit";

type Phase = "desk" | "fee" | "writer";
interface Msg { id: string; from: "student" | "desk" | "writer" | "system"; text: string; t: string; card?: "fee" }
interface Job { id: string; pages: number; price: number; stage: "active" | "review" | "closed"; dueH?: number }
interface Session { id: string; student: string; mode: "mentor" | "full"; title: string; phase: Phase; writerId?: string; feePaid: boolean; msgs: Msg[]; jobs: Job[] }
interface Writer { id: string; name: string; spec: string; rating: number; completed: number; available: boolean; earnings: number }

const uid = () => Math.random().toString(36).slice(2, 8);
const nowT = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const WRITERS0: Writer[] = [
  { id: "w1", name: "Dr. Amaka Obi", spec: "Sciences and Maths", rating: 4.9, completed: 214, available: true, earnings: 486000 },
  { id: "w2", name: "Tunde Bakare", spec: "Computing and Engineering", rating: 4.8, completed: 168, available: true, earnings: 352500 },
  { id: "w3", name: "Ifeoma Eze", spec: "Health and Life Sciences", rating: 4.9, completed: 131, available: true, earnings: 271000 },
  { id: "w4", name: "Chinedu Okafor", spec: "Research and Writing", rating: 4.7, completed: 96, available: false, earnings: 198000 },
  { id: "w5", name: "Halima Yusuf", spec: "Law and Humanities", rating: 4.8, completed: 77, available: true, earnings: 154500 },
];
const SESSIONS0: Session[] = [
  { id: "s1", student: "Chidi O.", mode: "full", title: "Get a writer", phase: "desk", feePaid: false, jobs: [], msgs: [
    { id: "a1", from: "desk", text: "Hi Chidi, I'm James from Unisupport Help Desk. Tell me about the work you need a hand with.", t: "09:02" },
    { id: "a2", from: "student", text: "Hi, I need help with my final year project", t: "09:03" },
    { id: "a3", from: "student", text: "It's about 40 pages, due in 2 weeks. Computer science, machine learning topic.", t: "09:04" }] },
  { id: "s2", student: "Amina B.", mode: "mentor", title: "Talk to a writer", phase: "fee", feePaid: false, jobs: [], msgs: [
    { id: "b1", from: "desk", text: "Hi Amina, I'm James from Unisupport Help Desk. What would you like to work through?", t: "08:40" },
    { id: "b2", from: "student", text: "I keep failing organic chemistry. I need someone to explain reaction mechanisms.", t: "08:42" },
    { id: "b3", from: "desk", text: "Understood. Opening a session is a one-off ₦2,000, then you chat with your mentor directly.", t: "08:44" },
    { id: "b4", from: "desk", text: "", t: "08:44", card: "fee" }] },
  { id: "s3", student: "Tobi A.", mode: "full", title: "Get a writer · CSC 305", phase: "writer", writerId: "w2", feePaid: true, jobs: [{ id: "j1", pages: 12, price: 48300, stage: "review", dueH: 18 }], msgs: [
    { id: "c1", from: "system", text: "Tunde Bakare is now in this chat", t: "Mon" },
    { id: "c2", from: "writer", text: "The work is ready, 12 pages.", t: "Tue 14:10" },
    { id: "c3", from: "system", text: "Both sides accepted. In review.", t: "Tue 16:30" }] },
  { id: "s4", student: "Ngozi E.", mode: "mentor", title: "Mentor · ANA 202", phase: "writer", writerId: "w3", feePaid: true, jobs: [{ id: "j2", pages: 3, price: 0, stage: "active" }], msgs: [
    { id: "d1", from: "system", text: "Ifeoma Eze is now in this chat", t: "Tue" },
    { id: "d2", from: "student", text: "Can we go over the cardiac cycle again?", t: "Wed 10:20" }] },
];

const NAV = [
  { id: "inbox", label: "Inbox", icon: <Inbox size={18} /> },
  { id: "review", label: "Review queue", icon: <ClipboardCheck size={18} /> },
  { id: "writers", label: "Writers", icon: <Users size={18} /> },
  { id: "rates", label: "Rates and fees", icon: <Settings2 size={18} /> },
];
const QUICK = ["Thanks, give me a moment to find the right writer.", "Could you share the number of pages and your deadline?", "Our rates: ₦3,500 per page for full write-ups, no page fee for mentoring."];

export default function Desk() {
  const [page, setPage] = useState("inbox");
  const [sessions, setSessions] = useState(SESSIONS0);
  const [writers, setWriters] = useState(WRITERS0);
  const [sel, setSel] = useState("s1");
  const [draft, setDraft] = useState("");
  const [pick, setPick] = useState("");
  const [rates, setRates] = useState({ full: "3500", fee: "2000", share: "50", review: "24", rush24: "1.40", rush3: "1.15" });
  const [inv, setInv] = useState({ name: "", email: "", spec: "" });
  const toast = useToast();

  const s = sessions.find((x) => x.id === sel)!;
  const writerOf = (id?: string) => writers.find((w) => w.id === id);
  const upd = (id: string, fn: (s: Session) => Session) => setSessions((ss) => ss.map((x) => (x.id === id ? fn(x) : x)));
  const say = (id: string, from: Msg["from"], text: string, card?: Msg["card"]) => upd(id, (x) => ({ ...x, msgs: [...x.msgs, { id: uid(), from, text, t: nowT(), card }] }));
  const reviewJobs = useMemo(() => sessions.flatMap((x) => x.jobs.filter((j) => j.stage === "review").map((j) => ({ s: x, j }))), [sessions]);
  const open = sessions.filter((x) => x.phase !== "writer").length;

  function requestFee() { upd(s.id, (x) => ({ ...x, phase: "fee" })); say(s.id, "desk", `Thanks ${s.student.split(" ")[0]}, I'm matching you with a writer. Opening your session is a one-off ${nairaS(Number(rates.fee))}.`); say(s.id, "desk", "", "fee"); toast.show("Session fee requested"); }
  function simulatePaid() {
    const w = writerOf(s.writerId);
    upd(s.id, (x) => ({ ...x, feePaid: true, phase: x.writerId ? "writer" : x.phase }));
    say(s.id, "system", `Session fee of ${nairaS(Number(rates.fee))} paid`);
    if (w) say(s.id, "system", `${w.name} is now in this chat`);
    toast.show(w ? `Paid. ${w.name} joined the chat` : "Student paid (simulated). Now assign a writer");
  }
  function assign() {
    const w = writers.find((x) => x.id === pick); if (!w) return;
    upd(s.id, (x) => ({ ...x, writerId: w.id, phase: x.feePaid ? "writer" : x.phase }));
    if (s.feePaid) say(s.id, "system", `${w.name} is now in this chat`);
    toast.show(s.feePaid ? `${w.name} joined the chat` : `${w.name} assigned. Joins when the fee is paid`); setPick("");
  }
  function send() { if (!draft.trim()) return; say(s.id, "desk", draft.trim()); setDraft(""); }
  function closeJob(sid: string, jid: string) {
    const ss = sessions.find((x) => x.id === sid)!; const j = ss.jobs.find((x) => x.id === jid)!;
    upd(sid, (x) => ({ ...x, jobs: x.jobs.map((k) => (k.id === jid ? { ...k, stage: "closed" } : k)) }));
    setWriters((ws) => ws.map((w) => (w.id === ss.writerId ? { ...w, earnings: w.earnings + Math.round(j.price * (Number(rates.share) / 100)), completed: w.completed + 1 } : w)));
    say(sid, "system", "Unisupport reviewed and closed this project."); toast.show(`Closed. Writer credited ${nairaS(j.price * (Number(rates.share) / 100))}`);
  }
  function reassign() { const w = writerOf(s.writerId); upd(s.id, (x) => ({ ...x, phase: "fee", feePaid: false, writerId: undefined })); say(s.id, "system", `${w?.name ?? "The writer"} can't continue with this`); say(s.id, "desk", "I'll connect you with another writer. A new session fee applies.", undefined); say(s.id, "desk", "", "fee"); toast.show("Back to fee. Assign a new writer after payment"); }

  return (
    <DeskShell app="Help Desk" tagline="Unisupport team" nav={NAV.map((n) => ({ ...n, badge: n.id === "inbox" ? open : n.id === "review" ? reviewJobs.length : undefined }))} active={page} onNav={setPage} right="Signed in as James (support)">
      {toast.node}
      {page === "inbox" && (
        <>
          <PageTitle title="Inbox" sub="Students talk to the desk first. You match them with a writer, then the writer takes over the same chat." />
          <div className="grid gap-4 lg:grid-cols-[330px_1fr]">
            <Card pad={false}>
              <div className="max-h-[640px] divide-y divide-[#F0E8F7] overflow-y-auto">
                {sessions.map((x) => { const last = [...x.msgs].reverse().find((m) => m.text); return (
                  <button key={x.id} onClick={() => setSel(x.id)} className={`block w-full px-4 py-3.5 text-left transition hover:bg-[#FBF6FE] ${sel === x.id ? "bg-[#F6EAFB]" : ""}`}>
                    <div className="flex items-center justify-between"><span className="text-[14.5px] font-bold">{x.student}</span><Pill tone={x.phase === "desk" ? "red" : x.phase === "fee" ? "amber" : "green"}>{x.phase === "desk" ? "Needs reply" : x.phase === "fee" ? "Awaiting fee" : "With writer"}</Pill></div>
                    <div className="text-[12px] text-[var(--dim)]">{x.title}</div>
                    <div className="mt-1 truncate text-[13px] text-[#5b5170]">{last?.text}</div>
                  </button>); })}
              </div>
            </Card>

            <Card title={`${s.student} · ${s.title}`} sub={s.phase === "writer" ? `With ${writerOf(s.writerId)?.name}` : s.phase === "fee" ? "Waiting for the session fee" : "Waiting for the desk"} right={s.phase === "writer" ? <Btn2 tone="danger" small onClick={reassign}>Writer can&apos;t continue</Btn2> : undefined} pad={false}>
              <div className="flex h-[440px] flex-col gap-2 overflow-y-auto bg-[#F0E9F6] p-4">
                {s.msgs.map((m) => m.from === "system" ? <div key={m.id} className="mx-auto rounded-full bg-[#ddd2e8] px-3 py-1 text-[11.5px] text-[#5b4b70]">{m.text}</div> : m.card ? <div key={m.id} className="mx-auto rounded-xl bg-white px-4 py-2 text-[12.5px] shadow-sm">💳 Session fee card sent · {s.feePaid ? "paid" : "unpaid"}</div> : (
                  <div key={m.id} className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug shadow-sm ${m.from === "student" ? "self-start rounded-tl-md bg-white" : "self-end rounded-tr-md bg-[#EBD3F5]"}`}>{m.text}<div className="mt-0.5 text-right text-[10px] text-[#8a7fa0]">{m.from === "student" ? s.student : m.from === "writer" ? "Writer" : "You"} · {m.t}</div></div>))}
              </div>
              <div className="space-y-3 border-t border-[#EFE6F6] p-4">
                {s.phase !== "writer" ? (<>
                  <div className="flex flex-wrap gap-2">{QUICK.map((q) => <button key={q} onClick={() => setDraft(q)} className="rounded-full bg-[#F1E9F8] px-3 py-1.5 text-[12px] font-semibold text-[#6E2A80] hover:bg-[#E8D9F3]">{q.length > 40 ? q.slice(0, 40) + "…" : q}</button>)}</div>
                  <div className="flex gap-2"><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Reply as James" className="min-w-0 flex-1 rounded-xl border-2 border-[#E6DCF0] px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--birdie)]" /><Btn2 onClick={send} disabled={!draft.trim()}><Send size={15} /></Btn2></div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-[#F0E8F7] pt-3">
                    <Btn2 tone="dark" small disabled={s.phase !== "desk"} onClick={requestFee}>Request session fee</Btn2>
                    <select value={pick} onChange={(e) => setPick(e.target.value)} className="rounded-xl border-2 border-[#E6DCF0] bg-white px-3 py-1.5 text-[13px]"><option value="">Choose a writer…</option>{writers.filter((w) => w.available).map((w) => <option key={w.id} value={w.id}>{w.name} · {w.spec} · ★{w.rating}</option>)}</select>
                    <Btn2 small disabled={!pick} onClick={assign}>Assign writer</Btn2>
                    {s.phase === "fee" && !s.feePaid && <Btn2 tone="ghost" small onClick={simulatePaid}>Simulate: student paid</Btn2>}
                  </div>
                </>) : <p className="text-[13px] text-[var(--dim)]">This chat is now between the student and {writerOf(s.writerId)?.name}. You can step in from the review queue or reassign if needed.</p>}
              </div>
            </Card>
          </div>
        </>
      )}

      {page === "review" && (
        <>
          <PageTitle title="Review queue" sub="Both sides accepted. Confirm everything is in order and close within the review window." />
          <Card pad={false}>
            {reviewJobs.length === 0 ? <div className="p-10 text-center text-[var(--dim)]">Nothing waiting for review.</div> : (
              <table className="w-full text-left text-[14px]"><thead className="bg-[#FBF6FE] text-[12px] uppercase tracking-wider text-[var(--dim)]"><tr><th className="p-4">Student</th><th>Writer</th><th>Work</th><th>Paid</th><th>Due</th><th /></tr></thead>
                <tbody>{reviewJobs.map(({ s: x, j }) => (<tr key={j.id} className="border-t border-[#F0E8F7]"><td className="p-4 font-semibold">{x.student}<div className="text-[12px] font-normal text-[var(--dim)]">{x.title}</div></td><td>{writerOf(x.writerId)?.name}</td><td>{j.pages} pages</td><td>{nairaS(j.price)}</td><td><Pill tone={(j.dueH ?? 24) < 6 ? "red" : "amber"}>{j.dueH ?? 24}h left</Pill></td><td className="pr-4 text-right"><Btn2 small onClick={() => closeJob(x.id, j.id)}>Close and pay writer</Btn2></td></tr>))}</tbody></table>)}
          </Card>
        </>
      )}

      {page === "writers" && (
        <>
          <PageTitle title="Writers" sub="Availability decides who you can assign." />
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <Card pad={false}>
              <table className="w-full text-left text-[14px]"><thead className="bg-[#FBF6FE] text-[12px] uppercase tracking-wider text-[var(--dim)]"><tr><th className="p-4">Writer</th><th>Rating</th><th>Done</th><th>Earnings</th><th>Available</th></tr></thead>
                <tbody>{writers.map((w) => (<tr key={w.id} className="border-t border-[#F0E8F7]"><td className="p-4 font-semibold">{w.name}<div className="text-[12px] font-normal text-[var(--dim)]">{w.spec}</div></td><td>★ {w.rating}</td><td>{w.completed}</td><td>{nairaS(w.earnings)}</td><td><Switch on={w.available} onChange={(v) => setWriters((ws) => ws.map((x) => (x.id === w.id ? { ...x, available: v } : x)))} label={`Toggle ${w.name}`} /></td></tr>))}</tbody></table>
            </Card>
            <Card title="Invite a writer" sub="They get an email to set up their writer app.">
              <div className="space-y-3"><Input value={inv.name} onChange={(v) => setInv({ ...inv, name: v })} placeholder="Full name" /><Input value={inv.email} onChange={(v) => setInv({ ...inv, email: v })} placeholder="Email" /><Input value={inv.spec} onChange={(v) => setInv({ ...inv, spec: v })} placeholder="Specialization" />
                <Btn2 disabled={!inv.name || !inv.email} onClick={() => { setWriters((ws) => [...ws, { id: uid(), name: inv.name, spec: inv.spec || "General", rating: 5, completed: 0, available: false, earnings: 0 }]); setInv({ name: "", email: "", spec: "" }); toast.show("Invite sent"); }}>Send invite</Btn2></div>
            </Card>
          </div>
        </>
      )}

      {page === "rates" && (
        <>
          <PageTitle title="Rates and fees" sub="These drive every quote a student sees. Changes apply to new quotes." />
          <Card>
            <div className="grid max-w-[640px] gap-4 sm:grid-cols-2">
              {([["full", "Full write-up, per page", "₦"], ["fee", "Session fee (one-off)", "₦"], ["share", "Writer share of work fee", "%"], ["review", "Review window", "hours"], ["rush24", "Rush multiplier, under 24h", "×"], ["rush3", "Rush multiplier, 3 days", "×"]] as const).map(([k, label, suf]) => (
                <label key={k} className="block"><span className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--dim)]">{label}</span><Input value={rates[k]} onChange={(v) => setRates({ ...rates, [k]: v })} suffix={suf} /></label>))}
            </div>
            <div className="mt-6 rounded-xl bg-[#F6EAFB] p-4 text-[13.5px] text-[#5b2a6b]">Example: 12 pages in 3 days = {nairaS(Math.round((Number(rates.full) * 12 * Number(rates.rush3)) / 100) * 100)}. Writer receives {nairaS(Math.round((Number(rates.full) * 12 * Number(rates.rush3)) / 100) * 100 * Number(rates.share) / 100)}.</div>
            <div className="mt-5"><Btn2 onClick={() => toast.show("Rates saved")}>Save changes</Btn2></div>
          </Card>
        </>
      )}
    </DeskShell>
  );
}
