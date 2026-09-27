"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Banknote, Briefcase, Check, CheckCheck, FileUp, MessageSquare, MoreVertical, Send, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BirdieMark } from "@/components/brand/Bot";

type Stage = "quote" | "active" | "delivered" | "review" | "closed";
interface Job { id: string; pages: number; deadline: "24h" | "3d" | "1w"; price: number; stage: Stage; paid: boolean }
interface Msg { id: string; from: "me" | "student" | "system"; text: string; t: string; card?: "quote" | "delivery"; jobId?: string }
interface Chat { id: string; student: string; mode: "mentor" | "full"; course: string; msgs: Msg[]; jobs: Job[]; ended: boolean }

const RATE = 3500, MULT = { "24h": 1.4, "3d": 1.15, "1w": 1 } as const, SHARE = 0.5;
const uid = () => Math.random().toString(36).slice(2, 8);
const nowT = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
const priceOf = (p: number, d: keyof typeof MULT) => Math.round((RATE * p * MULT[d]) / 100) * 100;
const STUDENT_LINES = ["Thank you! When can I expect the first part?", "Can you also add a short conclusion?", "That looks good so far.", "Please use APA referencing.", "Great, I'll check it tonight."];

const CHATS0: Chat[] = [
  { id: "c1", student: "Tobi", mode: "full", course: "CSC 305", ended: false, jobs: [{ id: "j1", pages: 12, deadline: "3d", price: 48300, stage: "active", paid: false }], msgs: [
    { id: "m1", from: "system", text: "You were assigned to this chat by the Unisupport help desk", t: "Mon" },
    { id: "m2", from: "student", text: "Hi, I need a 12 page write-up on binary search trees, due in 3 days.", t: "Mon 10:02" },
    { id: "m3", from: "me", text: "Understood. Here's the estimate.", t: "Mon 10:05" },
    { id: "m4", from: "me", text: "", t: "Mon 10:05", card: "quote", jobId: "j1" }] },
  { id: "c2", student: "Ngozi", mode: "mentor", course: "ANA 202", ended: false, jobs: [], msgs: [
    { id: "n1", from: "system", text: "You were assigned to this chat by the Unisupport help desk", t: "Tue" },
    { id: "n2", from: "student", text: "Can we go over the cardiac cycle again? I keep mixing up systole and diastole.", t: "Wed 10:20" }] },
  { id: "c3", student: "Chidi", mode: "full", course: "Final year project", ended: false, jobs: [], msgs: [
    { id: "p1", from: "system", text: "You were assigned to this chat by the Unisupport help desk", t: "Today" },
    { id: "p2", from: "student", text: "Hello, the desk said you'd help with my machine learning project. It's 40 pages, due in 2 weeks.", t: "09:12" }] },
];

type Tab = "chats" | "jobs" | "earnings" | "me";

export default function WriterApp() {
  const [tab, setTab] = useState<Tab>("chats");
  const [chats, setChats] = useState(CHATS0);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sheet, setSheet] = useState<null | "quote" | "deliver" | "menu" | "payout">(null);
  const [pages, setPages] = useState(10); const [dl, setDl] = useState<keyof typeof MULT>("3d"); const [file, setFile] = useState("");
  const [bank, setBank] = useState({ bank: "", num: "", name: "" });
  const [payouts, setPayouts] = useState<{ id: string; amount: number; status: string; t: string }[]>([]);
  const [balance, setBalance] = useState(126500);
  const [avail, setAvail] = useState(true);
  const [bio, setBio] = useState("Maths and computing writer. I explain first, then help you finish.");
  const [toast, setToast] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(null), 2200); };

  const c = chats.find((x) => x.id === open) ?? null;
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [c?.msgs.length]);
  const upd = (id: string, fn: (c: Chat) => Chat) => setChats((cs) => cs.map((x) => (x.id === id ? fn(x) : x)));
  const push = (id: string, m: Omit<Msg, "id" | "t">) => upd(id, (x) => ({ ...x, msgs: [...x.msgs, { ...m, id: uid(), t: nowT() }] }));
  const studentReplies = (id: string) => setTimeout(() => push(id, { from: "student", text: STUDENT_LINES[Math.floor(Math.random() * STUDENT_LINES.length)] }), 1500);

  function send() { if (!c || !draft.trim()) return; push(c.id, { from: "me", text: draft.trim() }); setDraft(""); studentReplies(c.id); }
  function sendQuote() {
    if (!c) return; const jid = uid(), price = priceOf(pages, dl);
    upd(c.id, (x) => ({ ...x, jobs: [...x.jobs, { id: jid, pages, deadline: dl, price, stage: "active", paid: false }] }));
    push(c.id, { from: "me", text: `${pages} pages in ${dl === "24h" ? "24 hours" : dl === "3d" ? "3 days" : "1 week"}. Here's the estimate.` }); push(c.id, { from: "me", text: "", card: "quote", jobId: jid });
    setSheet(null); flash("Quote sent. Price was calculated for you");
  }
  function deliver() {
    if (!c) return; const job = [...c.jobs].reverse().find((j) => j.stage === "active");
    const price = c.mode === "mentor" ? 0 : job ? priceOf(pages, job.deadline) : priceOf(pages, "3d"); const jid = job?.id ?? uid();
    upd(c.id, (x) => ({ ...x, jobs: job ? x.jobs.map((j) => (j.id === jid ? { ...j, pages, price, stage: "delivered", paid: price === 0 } : j)) : [...x.jobs, { id: jid, pages, deadline: "3d", price, stage: "delivered", paid: price === 0 }] }));
    push(c.id, { from: "me", text: price === 0 ? "Notes are ready for you." : `Work is ready: ${pages} pages. You can view it now; downloading unlocks after payment.`, card: "delivery", jobId: jid });
    setSheet(null); setFile(""); flash("Delivered. The student can view it, and download after paying");
  }
  const simulate = (what: "pay" | "accept") => {
    if (!c) return; const j = [...c.jobs].reverse().find((k) => k.stage === "delivered" || k.stage === "review"); if (!j) return flash("Deliver something first");
    if (what === "pay") { upd(c.id, (x) => ({ ...x, jobs: x.jobs.map((k) => (k.id === j.id ? { ...k, paid: true } : k)) })); push(c.id, { from: "system", text: `Student paid ${naira(j.price)}. Downloads unlocked` }); }
    else { upd(c.id, (x) => ({ ...x, jobs: x.jobs.map((k) => (k.id === j.id ? { ...k, stage: "review" } : k)) })); push(c.id, { from: "system", text: "Both sides accepted. Unisupport is reviewing (up to 24h)." }); }
  };
  const acceptMine = () => { if (!c) return; const j = c.jobs.find((k) => k.stage === "delivered" && k.paid); if (!j) return flash("Wait for the student to pay first"); push(c.id, { from: "system", text: "You accepted. Waiting for the student." }); setTimeout(() => simulate("accept"), 1200); };
  function cantContinue() { if (!c) return; push(c.id, { from: "system", text: "You handed this chat back to the help desk. The student will be connected to another writer." }); upd(c.id, (x) => ({ ...x, ended: true })); setSheet(null); setOpen(null); flash("Handed back to the desk"); }

  const allJobs = chats.flatMap((x) => x.jobs.map((j) => ({ ...j, student: x.student, course: x.course })));
  const active = chats.filter((x) => !x.ended);
  const earned = allJobs.filter((j) => j.stage === "review" || j.stage === "closed").reduce((a, j) => a + j.price * SHARE, 0);

  return (
    <div className="proto-root flex min-h-screen items-center justify-center bg-[#EAE2F2] px-4 py-8">
      <div className="flex w-full max-w-[900px] flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
        <div className="h-[844px] w-[390px] max-w-full shrink-0 rounded-[48px] bg-[var(--ink)] p-[14px] shadow-[0_40px_80px_-20px_rgba(40,10,70,0.55)]">
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[34px] bg-[var(--paper)]">
            <div className="absolute left-1/2 top-0 z-50 h-[26px] w-[110px] -translate-x-1/2 rounded-b-[18px] bg-[var(--ink)]" />
            <div className="flex h-12 shrink-0 items-center justify-between px-7 text-[13px] font-semibold"><span>9:41</span><span className="tracking-widest">●●●</span></div>

            {!c ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-center gap-3 px-5 pb-3 pt-1"><BirdieMark size={34} /><div><div className="disp text-[19px] font-bold leading-tight">Writer</div><div className="text-[11.5px] text-[var(--dim)]">Dr. Amaka Obi · <span className={avail ? "text-[#0a7a56]" : "text-[var(--help)]"}>{avail ? "Available" : "Unavailable"}</span></div></div></div>
                <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-4">
                  {tab === "chats" && (
                    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
                      {active.length === 0 && <div className="p-8 text-center text-[13px] text-[var(--dim)]">No chats. New students appear when the desk assigns them.</div>}
                      {active.map((x) => { const last = [...x.msgs].reverse().find((m) => m.text); return (
                        <button key={x.id} onClick={() => setOpen(x.id)} className="flex w-full items-center gap-3 border-b border-[var(--line)] p-3.5 text-left last:border-0 active:bg-[var(--paper-dim)]">
                          <div className="disp flex h-11 w-11 items-center justify-center rounded-full bg-[#7C4DDB] text-[16px] font-bold text-white">{x.student[0]}</div>
                          <div className="min-w-0 flex-1"><div className="flex justify-between"><span className="text-[14.5px] font-semibold">{x.student}</span><span className="rounded-md bg-[var(--paper-dim)] px-1.5 py-0.5 text-[10.5px] font-bold text-[var(--dim)]">{x.mode === "mentor" ? "Mentor" : "Full"} · {x.course}</span></div><div className="truncate text-[12.5px] text-[var(--dim)]">{last?.from === "me" ? "You: " : ""}{last?.text}</div></div>
                        </button>); })}
                    </div>)}
                  {tab === "jobs" && (allJobs.length === 0 ? <Empty text="No jobs yet. Send a quote in a chat to create one." /> : <div className="space-y-2.5">{allJobs.map((j) => (<div key={j.id} className="rounded-2xl border border-[var(--line)] bg-white p-3.5"><div className="flex justify-between"><span className="text-[14px] font-semibold">{j.student} · {j.course}</span><Stage s={j.stage} /></div><div className="mt-1 text-[12.5px] text-[var(--dim)]">{j.pages} pages · {naira(j.price)} · you earn {naira(j.price * SHARE)}</div></div>))}</div>)}
                  {tab === "earnings" && (<div className="space-y-3">
                    <div className="rounded-[22px] bg-gradient-to-br from-[var(--ink)] to-[#2b1546] p-5 text-[var(--paper)]"><div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Available to withdraw</div><div className="disp mt-1 text-[32px] font-bold">{naira(balance)}</div><div className="mt-2 text-[12px] text-white/55">You earn {SHARE * 100}% of each work fee. In review: {naira(earned)}</div></div>
                    <button onClick={() => setSheet("payout")} disabled={balance < 5000} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--birdie)] py-3.5 text-[15px] font-semibold text-white active:scale-[0.97] disabled:opacity-40"><Banknote size={18} /> Request payout</button>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Payout history</div>
                    {payouts.length === 0 ? <div className="rounded-2xl border-2 border-dashed border-[var(--line)] p-5 text-center text-[13px] text-[var(--dim)]">No payouts yet.</div> : payouts.map((p) => (<div key={p.id} className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white p-3.5"><div><div className="text-[14px] font-semibold">{naira(p.amount)}</div><div className="text-[11.5px] text-[var(--dim)]">{p.t}</div></div><span className="rounded-full bg-[#FFF0D2] px-2.5 py-1 text-[11.5px] font-bold text-[#8A5A0E]">{p.status}</span></div>))}
                  </div>)}
                  {tab === "me" && (<div className="space-y-3">
                    <div className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white p-4"><div><div className="text-[14.5px] font-semibold">I&apos;m available for new students</div><div className="text-[12px] text-[var(--dim)]">Turn off when you&apos;re full. The desk won&apos;t assign you.</div></div><Toggle on={avail} onChange={setAvail} /></div>
                    <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Bio students see</span><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="w-full resize-none rounded-2xl border-2 border-[var(--line)] bg-white p-3.5 text-[14px] outline-none focus:border-[var(--birdie)]" /></label>
                    <div className="rounded-2xl bg-[var(--paper-dim)] p-4 text-[13px] leading-relaxed text-[var(--dim)]">Rating <b className="text-[var(--text)]">4.9</b> · 214 projects. Students only ever see your first name and this bio, and only after the desk connects you.</div>
                    <Link href="/prototype" className="block rounded-2xl py-3 text-center text-[13.5px] font-semibold text-[var(--dim)]">← Back to the student app</Link>
                  </div>)}
                </div>
                <div className="flex shrink-0 justify-around bg-[var(--ink)] px-2 pb-5 pt-2.5">
                  {([["chats", "Chats", MessageSquare], ["jobs", "Jobs", Briefcase], ["earnings", "Earnings", Banknote], ["me", "Profile", UserRound]] as const).map(([id, label, Icon]) => (
                    <button key={id} onClick={() => setTab(id)} className={`flex flex-col items-center gap-1 px-3 py-1.5 text-[11px] font-semibold ${tab === id ? "text-white" : "text-white/45"}`}><Icon size={20} className={tab === id ? "text-[#D68BE8]" : ""} />{label}</button>))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 pb-2.5 pt-1">
                  <button onClick={() => setOpen(null)} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-xl active:scale-90"><ArrowLeft size={19} /></button>
                  <div className="disp flex h-9 w-9 items-center justify-center rounded-full bg-[#7C4DDB] font-bold text-white">{c.student[0]}</div>
                  <div className="min-w-0 flex-1"><div className="text-[14.5px] font-bold leading-tight">{c.student}</div><div className="text-[11.5px] text-[var(--dim)]">{c.mode === "mentor" ? "Mentoring" : "Full write-up"} · {c.course}</div></div>
                  <button onClick={() => setSheet("menu")} aria-label="Options" className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--dim)]"><MoreVertical size={18} /></button>
                </div>
                <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#F0E9F6] px-4 py-3">
                  {c.msgs.map((m) => m.from === "system" ? <div key={m.id} className="mx-auto w-fit max-w-[88%] rounded-full bg-[#ddd2e8] px-3.5 py-1.5 text-center text-[11.5px] text-[#5b4b70]">{m.text}</div> : m.card ? <Card2 key={m.id} m={m} chat={c} onAccept={acceptMine} /> : (
                    <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : ""}`}><div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[14px] leading-snug shadow-sm ${m.from === "me" ? "rounded-tr-md bg-[#EBD3F5]" : "rounded-tl-md bg-white"}`}>{m.text}<div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#8a7fa0]">{m.t}{m.from === "me" && <CheckCheck size={12} className="text-[#7C4DDB]" />}</div></div></div>))}
                  <div ref={end} />
                </div>
                <div className="flex shrink-0 gap-2 overflow-x-auto bg-[#F0E9F6] px-4 pb-2">
                  {c.mode === "full" && <Chip onClick={() => { setPages(10); setSheet("quote"); }}>Send quote</Chip>}
                  <Chip onClick={() => { setPages(c.jobs.at(-1)?.pages ?? 10); setSheet("deliver"); }}>Deliver work</Chip>
                </div>
                <div className="flex shrink-0 items-center gap-2 bg-[var(--paper)] px-4 pb-4 pt-2.5">
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message" className="min-w-0 flex-1 rounded-full bg-[var(--paper-dim)] px-4 py-3 text-[14px] outline-none placeholder:text-[#a99fb8]" />
                  <button onClick={send} disabled={!draft.trim()} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--uni)] text-white active:scale-90 disabled:opacity-40"><Send size={17} /></button>
                </div>
              </div>
            )}

            <AnimatePresence>
              {sheet && (
                <motion.div className="absolute inset-0 z-[70] flex items-end bg-[#12121A]/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(null)}>
                  <motion.div className="w-full rounded-t-[26px] bg-[var(--paper)] px-5 pb-8 pt-3" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} onClick={(e) => e.stopPropagation()}>
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--line)]" />
                    <div className="mb-4 flex items-center justify-between"><h3 className="disp text-[18px] font-bold">{sheet === "quote" ? "Send a quote" : sheet === "deliver" ? "Deliver the work" : sheet === "payout" ? "Request a payout" : "Chat options"}</h3><button onClick={() => setSheet(null)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--paper-dim)]"><X size={16} /></button></div>
                    {(sheet === "quote" || sheet === "deliver") && (<div className="space-y-4">
                      <div><div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Pages</div><div className="flex items-center justify-between rounded-2xl border-2 border-[var(--line)] bg-white p-1.5"><button onClick={() => setPages((p) => Math.max(1, p - 1))} className="h-10 w-10 rounded-xl bg-[var(--paper-dim)] text-[18px] font-bold">−</button><span className="disp text-[20px] font-bold">{pages}</span><button onClick={() => setPages((p) => p + 1)} className="h-10 w-10 rounded-xl bg-[var(--paper-dim)] text-[18px] font-bold">+</button></div></div>
                      {sheet === "quote" && <div><div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Deadline</div><div className="grid grid-cols-3 gap-2">{(["24h", "3d", "1w"] as const).map((d) => (<button key={d} onClick={() => setDl(d)} className={`rounded-xl py-3 text-[13px] font-bold ${dl === d ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{d === "24h" ? "24 hours" : d === "3d" ? "3 days" : "1 week"}</button>))}</div></div>}
                      {sheet === "deliver" && <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--line)] p-4"><FileUp className="text-[var(--birdie)]" /><span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{file || "Choose the file to deliver"}</span><input type="file" hidden onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} /></label>}
                      <div className="rounded-2xl bg-[var(--uni-soft)] p-3.5 text-[13.5px] text-[var(--uni-deep)]">{c?.mode === "mentor" && sheet === "deliver" ? "Mentoring has no page fee. Notes download freely." : <>Work fee for the student: <b>{naira(priceOf(pages, sheet === "quote" ? dl : c?.jobs.at(-1)?.deadline ?? "3d"))}</b> · you earn <b>{naira(priceOf(pages, sheet === "quote" ? dl : c?.jobs.at(-1)?.deadline ?? "3d") * SHARE)}</b></>}</div>
                      <button onClick={sheet === "quote" ? sendQuote : deliver} disabled={sheet === "deliver" && !file} className="w-full rounded-2xl bg-[var(--uni)] py-3.5 text-[15px] font-semibold text-white active:scale-[0.97] disabled:opacity-40">{sheet === "quote" ? "Send quote" : "Deliver"}</button>
                    </div>)}
                    {sheet === "menu" && (<div className="space-y-2.5">
                      <div className="rounded-2xl bg-[var(--paper-dim)] p-3 text-[12.5px] leading-snug text-[var(--dim)]">Demo helpers: pretend to be the student.</div>
                      <button onClick={() => { simulate("pay"); setSheet(null); }} className="w-full rounded-2xl bg-[var(--paper-dim)] py-3 text-[14px] font-semibold">Student pays the work fee</button>
                      <button onClick={() => { setSheet(null); setTimeout(acceptMine, 100); }} className="w-full rounded-2xl bg-[var(--paper-dim)] py-3 text-[14px] font-semibold">I accept the work</button>
                      <button onClick={cantContinue} className="w-full rounded-2xl py-3.5 text-[15px] font-semibold text-[var(--help)]">I can&apos;t continue with this student</button>
                    </div>)}
                    {sheet === "payout" && (<div className="space-y-3">
                      {(["bank", "num", "name"] as const).map((k) => (<input key={k} value={bank[k]} onChange={(e) => setBank({ ...bank, [k]: e.target.value })} placeholder={k === "bank" ? "Bank name" : k === "num" ? "Account number" : "Account name"} className="w-full rounded-2xl border-2 border-[var(--line)] bg-white p-3.5 text-[14px] outline-none focus:border-[var(--birdie)]" />))}
                      <button disabled={!bank.bank || bank.num.length < 10 || !bank.name} onClick={() => { setPayouts((p) => [{ id: uid(), amount: balance, status: "Pending", t: "Just now" }, ...p]); setBalance(0); setSheet(null); flash("Payout requested. The desk will pay you"); }} className="w-full rounded-2xl bg-[var(--uni)] py-3.5 text-[15px] font-semibold text-white active:scale-[0.97] disabled:opacity-40">Request {naira(balance)}</button>
                    </div>)}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>{toast && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-24 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--ink)] px-4 py-3 text-[13px] font-semibold text-[var(--paper)] shadow-xl"><Check size={15} className="text-[#D68BE8]" strokeWidth={3} /> {toast}</motion.div>}</AnimatePresence>
          </div>
        </div>

        <aside className="w-full max-w-[380px] space-y-4 lg:pt-4">
          <div><div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--uni-deep)]">Writer app · sample workspace</div><h1 className="disp mt-1 text-[26px] font-bold leading-tight">What a writer sees</h1><p className="mt-2 text-[14px] leading-relaxed text-[var(--dim)]">Writers never pick students. The Unisupport desk assigns them. From then on it is a direct chat, with quotes that calculate themselves and delivery that stays view-only until the student pays.</p></div>
          <div className="rounded-2xl border border-[var(--line)] bg-white p-4 text-[13px] leading-snug text-[var(--text)]"><div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Try this</div><ol className="list-decimal space-y-1.5 pl-4"><li>Open Chidi&apos;s chat and tap Send quote</li><li>Open Tobi&apos;s chat, tap Deliver work</li><li>In the ⋮ menu, pretend to be the student paying</li><li>Accept, then watch the job move to review</li><li>Earnings → Request payout</li></ol></div>
          <div className="flex gap-2 text-[13px] font-semibold"><Link href="/prototype/desk" className="rounded-xl bg-[var(--ink)] px-4 py-2.5 text-white">Help desk</Link><Link href="/prototype/console" className="rounded-xl bg-[var(--paper-dim)] px-4 py-2.5">Team console</Link></div>
        </aside>
      </div>
    </div>
  );
}

function Chip({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button onClick={onClick} className="shrink-0 rounded-full border border-[var(--line)] bg-white px-3.5 py-2 text-[13px] font-semibold active:scale-95">{children}</button>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border-2 border-dashed border-[var(--line)] p-8 text-center text-[13px] text-[var(--dim)]">{text}</div>; }
function Toggle({ on, onChange }: { on: boolean; onChange: (b: boolean) => void }) { return <button onClick={() => onChange(!on)} aria-pressed={on} className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${on ? "bg-[var(--uni)]" : "bg-[var(--line)]"}`}><span className={`h-5 w-5 rounded-full bg-white shadow transition ${on ? "translate-x-5" : ""}`} /></button>; }
function Stage({ s }: { s: Stage }) { const t = { quote: ["Quoted", "bg-[#EFE6F6] text-[#6E6480]"], active: ["Working", "bg-[#F1DDF8] text-[#7B2A91]"], delivered: ["Delivered", "bg-[#FFF0D2] text-[#8A5A0E]"], review: ["In review", "bg-[#E3F3F1] text-[#146560]"], closed: ["Closed", "bg-[#DDF5EC] text-[#0a7a56]"] }[s]; return <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${t[1]}`}>{t[0]}</span>; }

function Card2({ m, chat, onAccept }: { m: Msg; chat: Chat; onAccept: () => void }) {
  const j = chat.jobs.find((x) => x.id === m.jobId); if (!j) return null;
  return (
    <div className="mx-auto w-full max-w-[92%] rounded-2xl bg-white p-3.5 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">{m.card === "quote" ? "Quote sent" : "Delivery"}</span><Stage s={j.stage} /></div>
      <div className="flex justify-between text-[13.5px]"><span className="text-[var(--dim)]">{j.pages} pages</span><b>{naira(j.price)}</b></div>
      <div className="mt-1 text-[12px] text-[var(--dim)]">{m.card === "delivery" ? (j.paid ? "Student paid. Downloads unlocked." : "Waiting for the student to pay.") : "Student pays when the work is delivered."}</div>
      {m.card === "delivery" && j.paid && j.stage === "delivered" && <button onClick={onAccept} className="mt-2.5 w-full rounded-xl bg-[var(--uni)] py-2.5 text-[13.5px] font-semibold text-white active:scale-[0.97]">Accept and finish</button>}
    </div>
  );
}
