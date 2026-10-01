"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BookOpenCheck, Check, CheckCheck, ChevronRight, Compass, Download, Eye, FileText, Lock, MoreVertical, Paperclip, Send, Star, Wallet, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { answer, docsOf, words } from "./engine";
import { firstName, naira, nowTime, uid, useApp } from "./store";
import { Avatar, Btn, DemoControls, Empty, Sheet, TextField, TopBar } from "./ui";
import HelpLive from "./HelpLive";

type Mode = "mentor" | "full";
type Phase = "desk" | "fee" | "writer";
type DL = "24h" | "3d" | "1w";
type Service = "quiz" | "writing";
type Access = "standard" | "full";
interface Writer { name: string; initials: string; color: string; spec: string }
interface Job { id: string; pages?: number; deadline?: DL; service?: Service; access?: Access; quotePrice?: number; delivery?: { pages: number; price: number; paid: boolean }; studentOk: boolean; writerOk: boolean; stage: "active" | "review" | "closed"; rating?: number }
interface HMsg { id: string; from: "me" | "desk" | "writer" | "system"; text: string; t: string; card?: "fee" | "quote" | "delivery" | "close"; jobId?: string }
interface Thread { id: string; mode: Mode; courseId: string | null; title: string; phase: Phase; writer?: Writer; past: string[]; msgs: HMsg[]; userMsgs: number; feePaid: boolean; jobs: Job[]; updated: number; access: Access }

const SESSION_FEE = 2000;
const RATES: Record<Service, Record<Access, number>> = { quiz: { standard: 500, full: 6000 }, writing: { standard: 1000, full: 8000 } };
const MULT: Record<DL, number> = { "24h": 1.4, "3d": 1.15, "1w": 1 };
const DL_LABEL: Record<DL, string> = { "24h": "24 hours", "3d": "3 days", "1w": "1 week" };
const SERVICE_LABEL: Record<Service, string> = { quiz: "Quiz", writing: "Writing" };
const ACCESS_LABEL: Record<Access, string> = { standard: "Standard", full: "Full LMS Access" };
const UNIT_LABEL: Record<Service, string> = { quiz: "quiz", writing: "page" };
const ACCESSES: { id: Access; label: string; sub: string }[] = [
  { id: "standard", label: "Standard", sub: "You submit the finished work yourself" },
  { id: "full", label: "Full LMS Access", sub: "Writer works directly in your school portal" },
];
const MODES: { id: Mode; label: string; sub: string; icon: typeof Compass }[] = [
  { id: "mentor", label: "Mentor me", sub: "Talk it through with a writer. You do the work, they guide you.", icon: Compass },
  { id: "full", label: "Do it for me", sub: "A writer completes it. You review and approve.", icon: Zap },
];
// Staff pool used by the simulated desk. In production writers are real accounts assigned by support.
const POOL: Writer[] = [
  { name: "Dr. Amaka Obi", initials: "AO", color: "#A63FBD", spec: "Sciences and Maths" },
  { name: "Tunde Bakare", initials: "TB", color: "#4C6EF5", spec: "Computing and Engineering" },
  { name: "Ifeoma Eze", initials: "IE", color: "#D9467E", spec: "Health and Life Sciences" },
  { name: "Chinedu Okafor", initials: "CO", color: "#7C4DDB", spec: "Research and Writing" },
];

const price = (mode: Mode, service: Service, access: Access, qty: number, dl: DL) => (mode === "mentor" ? 0 : Math.round((RATES[service][access] * qty * MULT[dl]) / 100) * 100);
const first = (w: Writer) => (w.name.startsWith("Dr.") ? w.name.split(" ")[1] : w.name.split(" ")[0]);
const m = (from: HMsg["from"], text: string, card?: HMsg["card"], jobId?: string): HMsg => ({ id: uid(), from, text, t: nowTime(), card, jobId });

function parseBrief(text: string): { pages?: number; deadline?: DL; service: Service } {
  const t = text.toLowerCase();
  const p = t.match(/(\d+)\s*(pages?|pgs?)\b/);
  let deadline: DL | undefined;
  const h = t.match(/(\d+)\s*(hours?|hrs?)\b/), d = t.match(/(\d+)\s*days?\b/), w = t.match(/(\d+)?\s*weeks?\b/);
  if (/tomorrow|tonight|overnight/.test(t) || (h && +h[1] <= 24)) deadline = "24h";
  else if (d) deadline = +d[1] <= 1 ? "24h" : +d[1] <= 4 ? "3d" : "1w";
  else if (w) deadline = "1w";
  const service: Service = /quiz|test|mcq|exam/i.test(t) ? "quiz" : "writing";
  return { pages: p ? +p[1] : undefined, deadline, service };
}

const DESK_PRICE = `Our rates: a one-off ${naira(SESSION_FEE)} session fee connects you to a writer. On Standard access, quizzes start from ${naira(RATES.quiz.standard)} and writing from ${naira(RATES.writing.standard)} per page. On Full LMS Access, where the writer works directly in your school portal, quizzes start from ${naira(RATES.quiz.full)} and writing from ${naira(RATES.writing.full)} per page (under 24 hours adds 40%, 3 days adds 15%). Mentoring has no page fee. You only pay the work fee when the writer delivers, before you download.`;
const REPLIES: Record<Mode, string[]> = {
  mentor: ["Good question. Before I explain, what have you tried so far?", "You're close. Look at that step again. What happens if you break it into smaller parts?", "Nice. Try the next one on your own and send me your working. I'll check it."],
  full: ["Received. I'll start today and send a first draft before your deadline.", "Quick check: which referencing style does your course outline use? I'll assume APA otherwise.", "Progress update: coming along well. I'll tell you as soon as it's ready to view."],
};

export default function Help({ active }: { active: boolean }) {
  const { auth } = useApp();
  return auth.status === "in" ? <HelpLive active={active} /> : <HelpSim active={active} />;
}

function HelpSim({ active }: { active: boolean }) {
  const { courses, profile, spend, balance, setWalletOpen, flash, helpIntent, clearHelpIntent } = useApp();
  const [view, setView] = useState<"hub" | "chat" | "learn" | "jdi">("hub");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState<Mode>("mentor");
  const [pickCourse, setPickCourse] = useState<string | null>(null);
  const [pickAccess, setPickAccess] = useState<Access>("standard");
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const ref = useRef<Thread[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  ref.current = threads;
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const name = firstName(profile);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  const upd = useCallback((id: string, fn: (t: Thread) => Thread) => setThreads((ts) => ts.map((t) => (t.id === id ? { ...fn(t), updated: Date.now() } : t))), []);
  const say = useCallback((id: string, msg: HMsg, delay = 1100) => { setTyping(true); later(() => { setTyping(false); upd(id, (t) => ({ ...t, msgs: [...t.msgs, msg] })); }, delay); }, [upd]);

  const t = threads.find((x) => x.id === activeId) ?? null;
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [t?.msgs.length, typing, view]);

  const start = useCallback((mode: Mode, courseId: string | null, access: Access = "standard") => {
    const c = courses.find((x) => x.id === courseId) ?? null;
    const title = mode === "mentor" ? (c ? `Mentor · ${c.code}` : "Talk to a writer") : `Get a writer${c ? ` · ${c.code}` : ""}`;
    const id = uid();
    const opener = `Hi ${name}, I'm James from Unisupport Help Desk. ` + (mode === "mentor" ? `What would you like to work through${c ? ` in ${c.code}` : ""}?` : `Tell me about the work you need a hand with${c ? ` for ${c.code}` : ""}, as much or as little as you like.`);
    setThreads((ts) => [{ id, mode, courseId, title, phase: "desk", past: [], msgs: [m("desk", opener)], userMsgs: 0, feePaid: false, jobs: [], updated: Date.now(), access }, ...ts]);
    setActiveId(id); setView("chat");
  }, [courses, name]);

  useEffect(() => { if (helpIntent) { start(helpIntent.mode, helpIntent.courseId); clearHelpIntent(); } }, [helpIntent]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentJob = (th: Thread) => [...th.jobs].reverse().find((j) => j.stage !== "closed");
  const setJob = (id: string, jobId: string, fn: (j: Job) => Job) => upd(id, (th) => ({ ...th, jobs: th.jobs.map((j) => (j.id === jobId ? fn(j) : j)) }));

  function send(text: string) {
    if (!t || !text.trim()) return;
    const id = t.id, count = t.userMsgs + 1, brief = parseBrief(text);
    upd(id, (x) => ({ ...x, msgs: [...x.msgs, m("me", text.trim())], userMsgs: count }));
    const wantsPrice = /price|cost|how much|rate|charge|fee/i.test(text);
    const ready = /ready|go ahead|proceed|start|connect|let'?s go|sure|ok(ay)?\b/i.test(text);

    if (t.phase === "desk") {
      if (wantsPrice) return say(id, m("desk", DESK_PRICE));
      if (count >= 2 || ready || (brief.pages && brief.deadline)) {
        const est = brief.pages && t.mode === "full" ? price("full", brief.service, t.access, brief.pages, brief.deadline ?? "3d") : 0;
        say(id, m("desk", `${est ? `That comes to about ${naira(est)} for ${brief.pages} pages, confirmed by the writer. ` : ""}Thanks ${name}, I'm matching you with a writer who fits. Opening your session is a one-off ${naira(SESSION_FEE)}. After that you chat with your writer directly, and you only pay again if you ever need a different writer.`), 1300);
        later(() => upd(id, (x) => ({ ...x, phase: "fee", msgs: [...x.msgs, m("desk", "", "fee")] })), 1500);
        return;
      }
      return say(id, m("desk", brief.pages || brief.deadline ? "Noted, thanks. Anything else the writer should know before I connect you?" : "Got it. Roughly how many pages and when do you need it by? A rough idea is fine, the writer will confirm."));
    }
    if (t.phase === "fee") return say(id, m("desk", "Whenever you're ready, the card above connects you to your writer."));

    // phase writer: direct chat
    const w = t.writer!;
    if (t.mode === "full" && brief.pages) {
      const dl = brief.deadline ?? "3d", svc = brief.service, acc = t.access, p = price("full", svc, acc, brief.pages, dl);
      const cur = currentJob(t);
      const jobId = cur && !cur.delivery ? cur.id : uid();
      say(id, m("writer", `Understood, ${brief.pages} ${UNIT_LABEL[svc]}${brief.pages === 1 ? "" : "s"} in ${DL_LABEL[dl]}. Here's the estimate.`), 900);
      later(() => upd(id, (x) => ({ ...x, jobs: cur && !cur.delivery ? x.jobs.map((j) => (j.id === jobId ? { ...j, pages: brief.pages, deadline: dl, service: svc, access: acc, quotePrice: p } : j)) : [...x.jobs, { id: jobId, pages: brief.pages, deadline: dl, service: svc, access: acc, quotePrice: p, studentOk: false, writerOk: false, stage: "active" }], msgs: [...x.msgs, m("writer", "", "quote", jobId)] })), 1500);
      return;
    }
    const pool = REPLIES[t.mode];
    say(id, m("writer", pool[(count - 1) % pool.length]));
    void w;
  }

  function connectWriter() {
    if (!t) return;
    if (!spend(SESSION_FEE, `Session fee · ${t.title}`)) { flash("Top up your balance first"); setWalletOpen(true); return; }
    const id = t.id;
    upd(id, (x) => ({ ...x, feePaid: true, msgs: [...x.msgs, m("system", `Session fee of ${naira(SESSION_FEE)} paid`)] }));
    later(() => {
      const th = ref.current.find((x) => x.id === id)!;
      const w = POOL.find((p) => !th.past.includes(p.name)) ?? POOL[0];
      const b = parseBrief(th.msgs.filter((x) => x.from === "me").map((x) => x.text).join(" "));
      const hadJob = th.jobs.find((j) => j.stage !== "closed");
      const newJob: Job | null = th.mode === "full" && b.pages && !hadJob ? { id: uid(), pages: b.pages, deadline: b.deadline ?? "3d", service: b.service, access: th.access, quotePrice: price("full", b.service, th.access, b.pages, b.deadline ?? "3d"), studentOk: false, writerOk: false, stage: "active" } : null;
      const hello = th.past.length
        ? `Hi ${name}, ${first(w)} here. I've read your chat and what ${th.past[th.past.length - 1].split(" ")[0]} did so far. Let's pick it up from here.`
        : th.mode === "mentor" ? `Hi ${name}, ${first(w)} here. I've read your chat with the desk. Where would you like to start?` : `Hi ${name}, ${first(w)} here. I've read your chat with the desk and I'm ready to start.${newJob ? ` Based on what you said, that's ${newJob.pages} pages in ${DL_LABEL[newJob.deadline!]}.` : " Tell me the pages and deadline when you have them and I'll work out the price."}`;
      upd(id, (x) => ({ ...x, phase: "writer", writer: w, jobs: newJob ? [...x.jobs, newJob] : x.jobs, msgs: [...x.msgs, m("system", `${w.name} is now in this chat`), m("writer", hello), ...(newJob ? [m("writer", "", "quote", newJob.id)] : [])] }));
    }, 1600);
  }

  function deliver() {
    if (!t || t.phase !== "writer") return;
    let job = currentJob(t);
    if (job?.delivery) return;
    const svc = job?.service ?? "writing", acc = job?.access ?? t.access;
    const pages = t.mode === "mentor" ? 3 : job?.pages ?? 11;
    const p = price(t.mode, svc, acc, pages, job?.deadline ?? "3d");
    const jobId = job?.id ?? uid();
    upd(t.id, (x) => ({
      ...x, jobs: job ? x.jobs.map((j) => (j.id === jobId ? { ...j, pages, service: svc, access: acc, delivery: { pages, price: p, paid: p === 0 } } : j)) : [...x.jobs, { id: jobId, pages, service: svc, access: acc, delivery: { pages, price: p, paid: p === 0 }, studentOk: false, writerOk: false, stage: "active" }],
      msgs: [...x.msgs, m("writer", p === 0 ? "I've put together notes from our session. They're yours to download." : `The work is ready, ${pages} pages. You can view it now. Downloading unlocks once the work fee is paid.`, "delivery", jobId)],
    }));
  }

  function payWork(jobId: string) {
    if (!t) return; const j = t.jobs.find((x) => x.id === jobId); if (!j?.delivery) return;
    if (!spend(j.delivery.price, `Work fee · ${t.title}`)) { flash("Top up your balance first"); setWalletOpen(true); return; }
    setPreview(null);
    setJob(t.id, jobId, (x) => ({ ...x, delivery: { ...x.delivery!, paid: true } }));
    upd(t.id, (x) => ({ ...x, msgs: [...x.msgs, m("system", `Work fee of ${naira(j.delivery!.price)} paid. Downloads unlocked`)] }));
  }

  function accept(jobId: string) {
    if (!t?.writer) return; const id = t.id, w = t.writer;
    setJob(id, jobId, (j) => ({ ...j, studentOk: true }));
    upd(id, (x) => ({ ...x, msgs: [...x.msgs, m("system", `You accepted the work. Waiting for ${first(w)} to confirm`)] }));
    later(() => { setJob(id, jobId, (j) => ({ ...j, writerOk: true, stage: "review" })); upd(id, (x) => ({ ...x, msgs: [...x.msgs, m("system", `${first(w)} confirmed`), m("desk", "", "close", jobId)] })); }, 2400);
  }

  function finishReview() {
    if (!t) return; const j = t.jobs.find((x) => x.stage === "review"); if (!j) return;
    setJob(t.id, j.id, (x) => ({ ...x, stage: "closed" }));
    upd(t.id, (x) => ({ ...x, msgs: [...x.msgs, m("system", "Unisupport reviewed and closed this project. You can keep chatting with your writer.")] }));
  }

  // Writer can't continue (or student asks for another): back to the desk, new session fee, new writer.
  function reassign(reason: "writer" | "student") {
    if (!t?.writer) return; const id = t.id, w = t.writer;
    upd(id, (x) => ({ ...x, phase: "fee", feePaid: false, past: [...x.past, w.name], writer: undefined, msgs: [...x.msgs, m("system", reason === "writer" ? `${first(w)} can't continue with this` : "You asked for a different writer"), m("desk", reason === "writer" ? `Hi ${name}, James from the Help Desk again. I'm sorry ${first(w)} can't take this further. I'll connect you with another writer who fits, and they'll get the full history. Connecting to a new writer needs a new session fee.` : `No problem ${name}. I'll match you with a different writer and share the full history with them. A new session fee applies.`), m("desk", "", "fee")] }));
    setMenu(false);
  }

  // ---------------- HUB ----------------
  if (view === "hub") {
    const cta = pickMode === "mentor" ? (pickCourse ? `Start mentoring on ${courses.find((c) => c.id === pickCourse)?.code}` : "Talk to a writer") : "Get a writer";
    const sorted = [...threads].sort((a, b) => b.updated - a.updated);
    return (
      <div className="flex h-full flex-col">
        <TopBar title={<h2 className="disp text-[24px] font-bold text-[var(--text)]">Help</h2>} right={<button onClick={() => setWalletOpen(true)} className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white py-1.5 pl-2.5 pr-3.5 text-[13px] font-semibold active:scale-95"><Wallet size={15} className="text-[var(--birdie)]" />{naira(balance)}</button>} />
        <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-5 pb-28">
          {sorted.length > 0 && (
            <section><div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Your writers and chats</div>
              <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
                {sorted.map((x) => { const last = [...x.msgs].reverse().find((y) => y.from !== "system" && !y.card); return (
                  <button key={x.id} onClick={() => { setActiveId(x.id); setView("chat"); }} className="flex w-full items-center gap-3 border-b border-[var(--line)] p-3 text-left last:border-0 active:bg-[var(--paper-dim)]">
                    {x.writer ? <Avatar initials={x.writer.initials} color={x.writer.color} size={44} /> : <div className="disp flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ink)] text-[17px] font-bold text-[var(--birdie)]">U</div>}
                    <div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><span className="truncate text-[14.5px] font-semibold text-[var(--text)]">{x.writer ? x.writer.name : "Unisupport Help Desk"}</span><span className="shrink-0 text-[11px] text-[var(--dim)]">{x.msgs[x.msgs.length - 1]?.t}</span></div><div className="truncate text-[12.5px] text-[var(--dim)]">{x.phase === "fee" ? "Waiting to connect you..." : last?.text || x.title}</div></div>
                  </button>); })}
              </div>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center gap-2"><span className="disp text-[16px] font-bold text-[var(--text)]">Connect with a writer</span><span className="rounded-md bg-[var(--ink)] px-1.5 py-0.5 text-[10px] font-semibold text-[#E6B3F2]">Unisupport</span></div>
            <div className="space-y-2.5">
              {MODES.map((o) => { const on = pickMode === o.id; return (
                <button key={o.id} onClick={() => setPickMode(o.id)} className={`w-full rounded-[18px] border-2 p-3.5 text-left transition active:scale-[0.985] ${on ? "border-[var(--birdie)] bg-[var(--birdie-soft)]" : "border-[var(--line)] bg-white"}`}>
                  <div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--birdie)] text-white"><o.icon size={17} /></div><div className="flex-1"><div className="disp text-[15px] font-bold">{o.label}</div><div className="text-[12px] leading-snug text-[var(--dim)]">{o.sub}</div></div><div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-white ${on ? "border-[var(--birdie)] bg-[var(--birdie)]" : "border-[var(--line)]"}`}>{on && <Check size={12} strokeWidth={3} />}</div></div>
                </button>); })}
            </div>
            <div className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Course (optional)</div>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              {[{ id: null as string | null, label: "No course" }, ...courses.map((c) => ({ id: c.id as string | null, label: c.code }))].map((c) => (<button key={c.label} onClick={() => setPickCourse(c.id)} className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold transition active:scale-95 ${pickCourse === c.id ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{c.label}</button>))}
            </div>
            {pickMode === "full" && (<>
              <div className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Access level</div>
              <div className="space-y-2">
                {ACCESSES.map((a) => { const on = pickAccess === a.id; return (
                  <button key={a.id} onClick={() => setPickAccess(a.id)} className={`w-full rounded-2xl border-2 p-3 text-left transition active:scale-[0.985] ${on ? "border-[var(--birdie)] bg-[var(--birdie-soft)]" : "border-[var(--line)] bg-white"}`}>
                    <div className="flex items-center justify-between gap-2"><div><div className="disp text-[14px] font-bold">{a.label}</div><div className="text-[11.5px] leading-snug text-[var(--dim)]">{a.sub}</div></div><div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-white ${on ? "border-[var(--birdie)] bg-[var(--birdie)]" : "border-[var(--line)]"}`}>{on && <Check size={12} strokeWidth={3} />}</div></div>
                  </button>); })}
              </div>
            </>)}
            <div className="mt-4"><Btn onClick={() => start(pickMode, pickCourse, pickAccess)}>{cta}</Btn></div>
            <p className="mt-2 text-center text-[11.5px] leading-snug text-[var(--dim)]">You start with our help desk. Session fee {naira(SESSION_FEE)}, one-off. After that you chat with your writer directly.</p>
          </section>

          <section className="space-y-2.5"><div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Or work it out with Birdie</div>
            <button onClick={() => setView("learn")} className="flex w-full items-start gap-3.5 rounded-[18px] bg-[var(--study-soft)] p-3.5 text-left active:scale-[0.98]"><BookOpenCheck className="mt-0.5 shrink-0 text-[var(--study)]" size={21} /><div><div className="disp text-[15px] font-bold">Learn (Guide Me)</div><div className="text-[12px] leading-snug text-[var(--dim)]">Birdie asks questions until it clicks. Free.</div></div></button>
            <button onClick={() => setView("jdi")} className="flex w-full items-start gap-3.5 rounded-[18px] bg-[var(--paper-dim)] p-3.5 text-left active:scale-[0.98]"><Zap className="mt-0.5 shrink-0 text-[var(--birdie)]" size={21} /><div><div className="disp text-[15px] font-bold">Just Do It</div><div className="text-[12px] leading-snug text-[var(--dim)]">Birdie drafts an answer from your notes. {naira(500)} credit.</div></div></button>
          </section>
        </div>
        <DemoControls active={active} title="Help: how it works">
          <ol className="list-decimal space-y-1.5 pl-4 text-[13px] leading-snug text-[var(--text)]"><li>Pick a mode, course optional</li><li>Chat with James at the desk. Ask about price, or say "40 pages in 2 weeks"</li><li>Pay the one-off session fee (top up first). Your writer joins the same chat</li><li>Chat with the writer directly any time. No desk, no fee again</li><li>Use the demo buttons to deliver, reassign or finish the review</li></ol>
        </DemoControls>
      </div>
    );
  }

  if (view === "learn") return <Learn onBack={() => setView("hub")} />;
  if (view === "jdi") return <JustDoIt onBack={() => setView("hub")} />;
  if (!t) return null;

  // ---------------- CHAT ----------------
  const w = t.writer;
  const job = currentJob(t);
  const chips = t.phase === "desk" ? (t.mode === "mentor" ? ["How does this work?", "How much does it cost?"] : ["How much does it cost?", "Final year project, 40 pages, 2 weeks", "Assignment, 6 pages, due in 2 days"]) : [];
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--paper)] px-4 pb-2.5 pt-1">
        <button onClick={() => setView("hub")} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-xl active:scale-90"><ArrowLeft size={19} /></button>
        <AnimatePresence mode="wait">
          <motion.div key={w?.name ?? "desk"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-w-0 flex-1 items-center gap-3">
            {w ? <Avatar initials={w.initials} color={w.color} size={38} online /> : <div className="disp relative flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[var(--ink)] text-[16px] font-bold text-[var(--birdie)]">U<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--paper)] bg-[#3FB56B]" /></div>}
            <div className="min-w-0"><div className="truncate text-[14.5px] font-bold leading-tight">{w ? w.name : "Unisupport Help Desk"}</div><div className="text-[11.5px] text-[var(--dim)]">{typing ? "typing..." : w ? `${w.spec} · online` : "James · usually replies in a minute"}</div></div>
          </motion.div>
        </AnimatePresence>
        {w && <button onClick={() => setMenu(true)} aria-label="Options" className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--dim)] active:scale-90"><MoreVertical size={18} /></button>}
      </div>

      <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#F0E9F6] px-4 py-3">
        {t.msgs.map((x) => x.from === "system" ? (
          <div key={x.id} className="mx-auto w-fit max-w-[88%] rounded-full bg-[#ddd2e8] px-3.5 py-1.5 text-center text-[11.5px] text-[#5b4b70]">{x.text}</div>
        ) : x.card ? (
          <Card key={x.id} kind={x.card} t={t} job={t.jobs.find((j) => j.id === x.jobId)} onPayFee={connectWriter} onView={(id) => setPreview(id)} onPayWork={payWork} onAccept={accept} onRate={(id, n) => setJob(t.id, id, (j) => ({ ...j, rating: n }))} />
        ) : (
          <motion.div key={x.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${x.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[14px] leading-snug shadow-sm ${x.from === "me" ? "rounded-tr-md bg-[#EBD3F5]" : "rounded-tl-md bg-white"} text-[var(--text)]`}>
              {x.text}
              <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#8a7fa0]">{x.t}{x.from === "me" && <CheckCheck size={12} className="text-[#7C4DDB]" />}</div>
            </div>
          </motion.div>
        ))}
        {typing && <div className="flex"><div className="flex gap-1 rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm">{[0, 1, 2].map((i) => (<motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-[#a99fb8]" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />))}</div></div>}
        <div ref={endRef} />
      </div>

      {chips.length > 0 && (<div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto bg-[#F0E9F6] px-4 pb-2">{chips.map((c) => (<button key={c} onClick={() => send(c)} className="shrink-0 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text)] active:scale-95">{c}</button>))}</div>)}
      <div className="flex shrink-0 items-center gap-2 bg-[var(--paper)] px-4 pb-4 pt-2.5">
        <input ref={fileIn} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) send(`📎 ${f.name}`); if (fileIn.current) fileIn.current.value = ""; }} />
        <button onClick={() => fileIn.current?.click()} aria-label="Attach" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--paper-dim)] text-[var(--dim)] active:scale-90"><Paperclip size={17} /></button>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { send(draft); setDraft(""); } }} placeholder="Message" className="min-w-0 flex-1 rounded-full bg-[var(--paper-dim)] px-4 py-3 text-[14px] outline-none placeholder:text-[#a99fb8]" />
        <button onClick={() => { send(draft); setDraft(""); }} disabled={!draft.trim()} aria-label="Send" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--uni)] text-white transition active:scale-90 disabled:opacity-40"><Send size={17} /></button>
      </div>

      <Sheet open={!!preview} onClose={() => setPreview(null)} title="Preview (view only)">
        {(() => { const j = t.jobs.find((x) => x.id === preview); if (!j?.delivery) return null; const d = j.delivery; return (<>
          <div className="relative mb-4 space-y-2 overflow-hidden rounded-2xl border border-[var(--line)] bg-white p-4">
            {["Introduction", "Main body", "Conclusion"].map((h, i) => (<div key={h}><div className="text-[13px] font-bold">{h}</div><div className={`mt-1 space-y-1.5 ${d.paid ? "" : "select-none blur-[3.5px]"}`}>{[0, 1, 2].map((l) => (<div key={l} className="h-2 rounded bg-[var(--paper-dim)]" style={{ width: `${92 - l * 14 - i * 3}%` }} />))}</div></div>))}
            {!d.paid && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="-rotate-12 rounded-lg border-2 border-[var(--help)] px-3 py-1 text-[15px] font-bold tracking-widest text-[var(--help)]/70">PREVIEW · UNISUPPORT</span></div>}
          </div>
          {d.paid ? <Btn onClick={() => { setPreview(null); flash("Downloaded"); }}>Download</Btn> : <Btn onClick={() => payWork(j.id)}>Pay {naira(d.price)} to download</Btn>}
        </>); })()}
      </Sheet>

      <Sheet open={menu} onClose={() => setMenu(false)} title={w?.name}>
        <p className="mb-3 text-[13px] leading-snug text-[var(--dim)]">You can message {w ? first(w) : "your writer"} any time, with no help desk and no new fee. Only ask for a different writer if this isn't working out.</p>
        <Btn variant="ghost" onClick={() => reassign("student")}>Request a different writer</Btn>
      </Sheet>

      <DemoControls active={active} title="Writer-side controls (demo)">
        <Btn variant="ink" disabled={t.phase !== "writer" || !!job?.delivery} onClick={deliver}>Writer delivers the work</Btn>
        <Btn variant="ghost" disabled={t.phase !== "writer"} onClick={() => reassign("writer")}>Writer can't continue</Btn>
        <Btn variant="ghost" disabled={!t.jobs.some((j) => j.stage === "review")} onClick={finishReview}>Unisupport finishes the 24h review</Btn>
        <p className="text-[12px] leading-snug text-[var(--dim)]">Phase: <b className="text-[var(--text)]">{t.phase}</b>{job?.quotePrice ? ` · quote ${naira(job.quotePrice)}` : ""}{job?.delivery ? ` · delivery ${job.delivery.paid ? "paid" : "unpaid"}` : ""}</p>
      </DemoControls>
    </div>
  );
}

function Card({ kind, t, job, onPayFee, onView, onPayWork, onAccept, onRate }: { kind: NonNullable<HMsg["card"]>; t: Thread; job?: Job; onPayFee: () => void; onView: (id: string) => void; onPayWork: (id: string) => void; onAccept: (id: string) => void; onRate: (id: string, n: number) => void }) {
  const shell = "mx-auto w-full max-w-[92%] rounded-2xl bg-white p-3.5 shadow-sm";
  if (kind === "fee") return (
    <div className={shell}>
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--uni-deep)]">{t.past.length ? "Connect to a new writer" : "Open your writer session"}</div>
      <div className="disp text-[24px] font-bold">{naira(SESSION_FEE)} <span className="text-[13px] font-medium text-[var(--dim)]">one-off</span></div>
      <ul className="my-2 space-y-1 text-[12.5px] text-[var(--dim)]">{["Then chat with your writer directly, any time", "No help desk and no new fee with the same writer", "Paid from your Birdie balance"].map((x) => (<li key={x} className="flex gap-2"><Check size={13} className="mt-0.5 shrink-0 text-[var(--uni)]" strokeWidth={3} />{x}</li>))}</ul>
      {t.feePaid ? <div className="rounded-xl bg-[var(--uni-soft)] py-2.5 text-center text-[13px] font-semibold text-[var(--uni-deep)]">Paid</div> : <Btn onClick={onPayFee}>Pay {naira(SESSION_FEE)} and connect</Btn>}
    </div>
  );
  if (kind === "quote" && job?.quotePrice) return (
    <div className={shell}>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Estimate from the chat</div>
      {[["Service", `${SERVICE_LABEL[job.service ?? "writing"]} · ${ACCESS_LABEL[job.access ?? "standard"]}`], [job.service === "quiz" ? "Quizzes" : "Pages", String(job.pages)], ["Deadline", DL_LABEL[job.deadline!]], ["Rate", `${naira(RATES[job.service ?? "writing"][job.access ?? "standard"])} per ${UNIT_LABEL[job.service ?? "writing"]}${MULT[job.deadline!] > 1 ? ` + ${Math.round((MULT[job.deadline!] - 1) * 100)}% rush` : ""}`]].map(([a, b]) => (<div key={a} className="flex justify-between py-0.5 text-[13px]"><span className="text-[var(--dim)]">{a}</span><span className="font-semibold">{b}</span></div>))}
      <div className="my-2 h-px bg-[var(--line)]" /><div className="flex justify-between text-[14px] font-bold"><span>Work fee</span><span>{naira(job.quotePrice)}</span></div>
      <p className="mt-2 text-[11.5px] leading-snug text-[var(--dim)]">Nothing to pay now. You pay when the work is delivered, before you download. If the final page count changes, the price updates.</p>
    </div>
  );
  if (kind === "delivery" && job?.delivery) { const d = job.delivery; return (
    <div className={shell}>
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--uni-soft)] text-[var(--uni-deep)]"><FileText size={18} /></div><div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold">{t.mode === "mentor" ? "Session_notes.pdf" : "Final_work.docx"}</div><div className="text-[11.5px] text-[var(--dim)]">{d.pages} page{d.pages === 1 ? "" : "s"}</div></div></div>
      <div className="mt-3 space-y-2">
        <button onClick={() => onView(job.id)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--paper-dim)] py-2.5 text-[13px] font-semibold active:scale-[0.98]"><Eye size={15} /> View</button>
        {d.paid ? (<><button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] py-2.5 text-[13px] font-semibold text-white active:scale-[0.98]"><Download size={15} /> Download</button>{!job.studentOk && <Btn onClick={() => onAccept(job.id)}>Accept and finish</Btn>}</>)
          : (<button onClick={() => onPayWork(job.id)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--uni)] py-3 text-[13.5px] font-bold text-white active:scale-[0.98]"><Lock size={15} /> Pay {naira(d.price)} to download</button>)}
      </div>
      {!d.paid && <p className="mt-2 text-[11.5px] text-[var(--dim)]">{d.pages} {UNIT_LABEL[job.service ?? "writing"]}{d.pages === 1 ? "" : "s"} · {naira(RATES[job.service ?? "writing"][job.access ?? "standard"])}/{UNIT_LABEL[job.service ?? "writing"]}. You can view it now, downloading unlocks after payment.</p>}
    </div>); }
  if (kind === "close" && job) return (
    <div className={shell}>
      <div className="flex items-center gap-2 text-[13px] font-bold"><Check size={16} className="text-[var(--uni)]" strokeWidth={3} /> You and {t.writer ? first(t.writer) : "the writer"} both accepted</div>
      <p className="mt-1.5 text-[12.5px] leading-snug text-[var(--dim)]">{job.stage === "closed" ? "Unisupport reviewed and closed this project." : "Unisupport is reviewing to confirm everything is in order. It closes within 24 hours. You can keep chatting meanwhile."}</p>
      {job.stage === "closed" && (<div className="mt-2.5 flex items-center gap-1.5">{[1, 2, 3, 4, 5].map((n) => (<button key={n} onClick={() => onRate(job.id, n)} aria-label={`${n} stars`}><Star size={24} className={(job.rating ?? 0) >= n ? "fill-[var(--birdie)] text-[var(--birdie)]" : "text-[var(--line)]"} /></button>))}</div>)}
    </div>
  );
  return null;
}

// Guide Me: Socratic, built from the student's own notes. No invented content.
export function Learn({ onBack }: { onBack: () => void }) {
  const { courses, goBirdie, goStudy, setTab } = useApp();
  const [courseId, setCourseId] = useState<string | null>(courses[0]?.id ?? null);
  const [turns, setTurns] = useState<{ from: "bird" | "me"; text: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [step, setStep] = useState(0);
  const course = courses.find((c) => c.id === courseId);
  const docs = course ? docsOf(course) : [];
  const [topic, setTopic] = useState(0);
  const doc = docs[topic % Math.max(docs.length, 1)];

  useEffect(() => { setTurns(doc ? [{ from: "bird", text: `Let's work on "${doc.title}". Before I show you anything from your notes: what do you already know about it?` }] : []); setStep(0); }, [courseId, topic, docs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function reply() {
    if (!draft.trim() || !doc) return;
    const key = Array.from(new Set(words(doc.text))).slice(0, 12);
    const said = new Set(words(draft));
    const hit = key.filter((k) => said.has(k)), miss = key.filter((k) => !said.has(k)).slice(0, 3);
    let next: string;
    if (step === 0) next = hit.length ? `Good start, you touched on ${hit.slice(0, 3).map((h) => `"${h}"`).join(", ")}. ${miss.length ? `Now, what role do you think "${miss[0]}" plays?` : "Now put it in one sentence you could say to a friend."}` : `That's a fair attempt. Here's a nudge without giving it away: think about "${miss[0] ?? doc.title}". What would it mean here?`;
    else if (step === 1) next = hit.length ? "You're getting there. Try once more, this time connecting the ideas together." : "Let's look at your own notes together.";
    else next = `Here's what your notes say:\n\n${doc.text}`;
    setTurns((t) => [...t, { from: "me", text: draft.trim() }]); setDraft("");
    setTimeout(() => setTurns((t) => [...t, { from: "bird", text: next }]), 700); setStep((s) => s + 1);
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar left={<button onClick={onBack} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--paper-dim)]"><ArrowLeft size={17} /></button>} title={<div className="disp text-[17px] font-bold">Learn (Guide Me)</div>} />
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-2">{courses.map((c) => (<button key={c.id} onClick={() => setCourseId(c.id)} className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold ${courseId === c.id ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{c.code}</button>))}</div>
      <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-5 pb-3">
        {!course ? <Empty title="Add a course first" text="Guide Me teaches from your own notes. Create a course in Study and add a note." action={<Btn variant="study" onClick={() => setTab("study")}>Go to Study</Btn>} />
          : docs.length === 0 ? <Empty title="Nothing to teach from yet" text={`Add a note to ${course.code} with full sentences and Birdie will guide you through it.`} action={<Btn variant="study" onClick={() => goStudy({ courseId: course.id, tab: "notes" })}>Add a note</Btn>} />
          : (<>
            {turns.map((x, i) => (<div key={i} className={`flex ${x.from === "me" ? "justify-end" : ""}`}><div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug ${x.from === "me" ? "rounded-br-md bg-[var(--ink)] text-[var(--paper)]" : "rounded-bl-md border border-[var(--line)] bg-white"}`}>{x.text}</div></div>))}
            {step >= 3 && (<div className="space-y-2 pt-1"><Btn variant="birdie" onClick={() => goBirdie({ courseId: course.id, mode: "test" })}>Quiz me on it</Btn><Btn variant="ghost" onClick={() => setTopic((n) => n + 1)}>Next topic</Btn><Btn variant="ghost" onClick={() => setTab("explore")}>Find a video in Explore</Btn></div>)}
          </>)}
      </div>
      {course && docs.length > 0 && step < 3 && (<div className="flex gap-2 px-5 pb-4"><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && reply()} placeholder="Type your thinking..." className="min-w-0 flex-1 rounded-full bg-[var(--paper-dim)] px-4 py-3 text-[14px] outline-none placeholder:text-[#a99fb8]" /><button onClick={reply} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--study)] text-white active:scale-90"><Send size={17} /></button></div>)}
    </div>
  );
}

export function JustDoIt({ onBack }: { onBack: () => void }) {
  const { courses, spend, spendWallet, walletLive, setWalletOpen, flash, goBirdie, addNote, setTab } = useApp();
  const [courseId, setCourseId] = useState<string | null>(courses[0]?.id ?? null);
  const [task, setTask] = useState("");
  const [warn, setWarn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; cite: string } | "none" | null>(null);
  const COST = 500;
  const course = courses.find((c) => c.id === courseId);

  async function go() {
    setWarn(false);
    const a = course ? answer(docsOf(course), task) : null;
    if (!a) { setResult("none"); return; }                       // nothing found: nothing charged
    const ok = walletLive ? await spendWallet(COST, "Birdie: Just Do It") : spend(COST, "Birdie: Just Do It");
    if (!ok) { flash("Top up your balance first"); setWalletOpen(true); return; }
    setBusy(true); setTimeout(() => { setBusy(false); setResult(a); }, 1400);
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar left={<button onClick={onBack} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--paper-dim)]"><ArrowLeft size={17} /></button>} title={<div className="disp text-[17px] font-bold">Just Do It</div>} />
      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 pb-5">
        {!course ? <Empty title="Add a course first" text="Birdie drafts from your own notes. Create a course and add notes in Study." action={<Btn variant="study" onClick={() => setTab("study")}>Go to Study</Btn>} />
          : result === "none" ? <Empty title="Nothing in your notes covers this" text="I only answer from what you've added, so nothing was charged. Add the relevant note, or connect with a writer." action={<div className="space-y-2"><Btn variant="ghost" onClick={() => setResult(null)}>Try again</Btn></div>} />
          : result ? (<div className="space-y-3"><div className="rounded-2xl border border-[var(--line)] bg-white p-4 text-[14px] leading-relaxed"><div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--birdie)]">Draft from your notes</div><div className="whitespace-pre-line">{result.text}</div><div className="mt-2 text-[11px] font-semibold text-[var(--study)]">From: {result.cite}</div></div><Btn variant="ghost" onClick={() => { if (course) addNote(course.id, "Draft: " + task.slice(0, 30), result.text); flash("Saved as a note"); }}>Save as note</Btn><Btn onClick={() => course && goBirdie({ courseId: course.id, prompt: task })}>Continue in Birdie</Btn></div>)
          : (<>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">{courses.map((c) => (<button key={c.id} onClick={() => setCourseId(c.id)} className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold ${courseId === c.id ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{c.code}</button>))}</div>
            <TextField multiline value={task} onChange={setTask} placeholder="Paste the question or describe the assignment..." />
            <Btn disabled={task.trim().length < 6 || busy} onClick={() => setWarn(true)}>{busy ? "Birdie is working..." : `Submit to Birdie · ${naira(COST)} credit`}</Btn>
          </>)}
      </div>
      <Sheet open={warn} onClose={() => setWarn(false)} title="Quick heads up">
        <p className="mb-4 text-[14px] leading-relaxed text-[var(--dim)]">Having AI do this for you won't help you learn it yourself. We won't stop you, we just want you to know before you go ahead.</p>
        <Btn onClick={go}>Continue anyway</Btn><button onClick={() => setWarn(false)} className="mt-2 w-full py-2.5 text-[13.5px] font-semibold text-[var(--dim)]">Let me reconsider</button>
      </Sheet>
    </div>
  );
}
