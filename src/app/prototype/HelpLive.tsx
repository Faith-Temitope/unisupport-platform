"use client";

// Help for signed-in students, backed by Supabase: real sessions, messages, fees and files.
// Desk agents and writers answer from the staff app (/prototype/live/staff). Nothing here is simulated.
import { Linkified } from "./Linkified";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BookOpen, Check, CheckCheck, Download, Eye, FileText, Lock, MoreVertical, Paperclip, PenLine, Pin, Printer, Send, Star, Wallet, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { JustDoIt } from "./JustDoIt";
import { CourseShareSheet } from "./CourseShare";
import { useViewState } from "./persist";
import { ACCESS_LABEL, DL_LABEL, SERVICE_LABEL, UNIT_LABEL, clock, listFolder, openUrl, rpcError, safeName, sendMessage, signedUrl, uploadTo, useHelpData, type HJob, type HMessage, type HSession } from "./live/helpData";
import { logEvent } from "./live/analyticsData";
import { InternshipCard, SlotAd, usePlacements } from "./Sponsored";
import { TutorialsSection } from "./Tutorials";
import { naira, uid, useApp } from "./store";
import { Avatar, Btn, Sheet, TopBar } from "./ui";

const initials = (n: string) => n.split(" ").filter((x) => !/^dr\.?$/i.test(x)).map((x) => x[0]).join("").slice(0, 2).toUpperCase();
const PALETTE = ["#A63FBD", "#4C6EF5", "#D9467E", "#7C4DDB"];
const colorOf = (s: string) => PALETTE[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
const first = (n: string) => (n.startsWith("Dr.") ? n.split(" ")[1] : n.split(" ")[0]);

export default function HelpLive({ active }: { active: boolean }) {
  const { setWalletOpen, balance, flash, helpIntent, clearHelpIntent, refreshWallet, openPrint, grantCourseAccess } = useApp();
  const internships = usePlacements("internship", undefined, active);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [view, setView] = useViewState<"hub" | "chat" | "jdi">("help.view", "hub");
  const [activeId, setActiveId] = useViewState<string | null>("help.chat", null);
  const [courseShare, setCourseShare] = useState(false);
  const [attachMenu, setAttachMenu] = useState(false);
  const { sessions, messages, jobs, loading, reload } = useHelpData(activeId);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [previewJob, setPreviewJob] = useState<HJob | null>(null);
  const [previewFiles, setPreviewFiles] = useState<{ name: string; url: string; type: string }[] | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);

  const s = sessions.find((x) => x.id === activeId) ?? null;
  const writer = s?.writers ?? null;
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, view]);

  // One Unisupport chat: reopen the open help-desk conversation, or start one. The desk handles
  // everything from there (and connects you to a writer when you need one).
  const deskChat = sessions.find((x) => !x.writer_id) ?? null;
  async function openDesk(courseId?: string | null) {
    if (busy) return;
    let id = deskChat?.id ?? null;
    if (!id) {
      setBusy(true);
      const { data, error } = await createClient().rpc("open_help_session", { p_mode: "full", p_label: null });
      setBusy(false);
      if (error) return flash(rpcError(error));
      id = data as string; await reload();
    }
    if (courseId) { const err = await grantCourseAccess(courseId, "view", { session: id }); if (err) flash("Couldn't attach the course"); }
    setActiveId(id); setView("chat");
  }
  useEffect(() => { if (helpIntent) { void openDesk(helpIntent.courseId); clearHelpIntent(); } }, [helpIntent]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(text: string, path?: string) {
    if (!s || !text.trim()) return;
    const err = await sendMessage(s.id, "student", text.trim(), path);
    if (err) flash(err); else void reload();
  }
  async function attach(f: File) {
    if (!s) return; if (f.size > 25 * 1024 * 1024) return flash("Files can be up to 25 MB");
    const path = `${s.id}/${uid()}-${safeName(f.name)}`;
    flash("Uploading...");
    const err = await uploadTo("session-uploads", path, f);
    if (err) return flash(err);
    await send(`📎 ${f.name}`, path);
  }
  const inflight = useRef(new Set<string>());
  async function rpc(fn: string, args: Record<string, unknown>, ok?: string) {
    const key = fn + JSON.stringify(args);
    if (inflight.current.has(key)) return false;               // ignore double taps on money actions
    inflight.current.add(key);
    try { return await rpcOnce(fn, args, ok); } finally { inflight.current.delete(key); }
  }
  async function rpcOnce(fn: string, args: Record<string, unknown>, ok?: string) {
    const { error } = await createClient().rpc(fn, args);
    if (error) {
      if (/insufficient_funds/.test(error.message)) { flash("Top up your balance first"); setWalletOpen(true); } else flash(rpcError(error));
      return false;
    }
    if (ok) flash(ok);
    await Promise.all([reload(), refreshWallet()]); return true;
  }
  async function view_(j: HJob) {
    setPreviewJob(j); setPreviewFiles(null);
    const folder = `${j.session_id}/${j.id}`;
    const files = (await listFolder("session-previews", folder)).filter((f) => f.name.startsWith("preview-"));
    setPreviewFiles(await Promise.all(files.map(async (f) => ({ name: f.name.replace(/^preview-/, ""), type: (f.metadata as { mimetype?: string } | null)?.mimetype ?? "", url: (await signedUrl("session-previews", `${folder}/${f.name}`)) ?? "" }))));
  }
  async function download(j: HJob) {
    const folder = `${j.session_id}/${j.id}`;
    const files = (await listFolder("session-deliverables", folder)).filter((f) => !f.name.startsWith("preview-"));
    if (!files.length) return flash("The writer hasn't attached a file yet. Message them.");
    for (const f of files) { const u = await signedUrl("session-deliverables", `${folder}/${f.name}`, f.name); if (u) { openUrl(u); void logEvent("download", f.name); } }
  }
  async function openAttachment(path: string) { const u = await signedUrl("session-uploads", path); if (u) openUrl(u); else flash("Couldn't open that file"); }

  // ---------------- HUB ----------------
  if (view === "jdi") return <JustDoIt onBack={() => setView("hub")} />;
  if (view === "hub" || !s) {
    const writerChats = sessions.filter((x) => x.writers);
    const pastDesk = sessions.filter((x) => !x.writers && x.id !== deskChat?.id);
    const row = (x: HSession) => (
      <button key={x.id} onClick={() => { setActiveId(x.id); setView("chat"); }} className="flex w-full items-center gap-3 border-b border-[var(--line)] p-3 text-left last:border-0 active:bg-[var(--paper-dim)]">
        {x.writers ? <Avatar initials={initials(x.writers.display_name)} color={colorOf(x.writers.display_name)} size={46} /> : <div className="disp flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-[17px] font-bold text-[var(--birdie)]">U</div>}
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-2"><span className="flex min-w-0 items-center gap-1.5 truncate text-[14.5px] font-semibold text-[var(--text)]">{x.writers ? x.writers.display_name : "Unisupport Help"}{x.writers && <Pin size={12} className="shrink-0 text-[var(--dim)]" />}</span><span className="shrink-0 text-[11px] text-[var(--dim)]">{clock(x.created_at)}</span></div>
          <div className="truncate text-[12.5px] text-[var(--dim)]">{x.writers ? `Your writer · ${x.writers.specialization ?? x.title}` : x.phase === "fee" ? "Waiting to connect you to a writer" : x.title || "Earlier chat"}</div>
        </div>
      </button>
    );
    return (
      <div className="flex h-full flex-col">
        <TopBar title={<h2 className="disp text-[24px] font-bold text-[var(--text)]">Help</h2>} right={<button onClick={() => setWalletOpen(true)} className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white py-1.5 pl-2.5 pr-3.5 text-[13px] font-semibold active:scale-95"><Wallet size={15} className="text-[var(--birdie)]" />{naira(balance)}</button>} />
        <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-5 pb-28">
          <section>
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
              {/* Unisupport Help is always on top, like a pinned chat. */}
              <button onClick={() => void openDesk()} disabled={busy} className="flex w-full items-center gap-3 border-b border-[var(--line)] p-3 text-left last:border-0 active:bg-[var(--paper-dim)]">
                <div className="disp relative flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-[17px] font-bold text-[var(--birdie)]">U<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#3FB56B]" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[14.5px] font-semibold text-[var(--text)]">Unisupport Help <Pin size={12} className="text-[var(--dim)]" /></div>
                  <div className="truncate text-[12.5px] text-[var(--dim)]">{busy ? "Opening..." : deskChat ? "Continue your chat" : "Tell us what you need. We're here to help."}</div>
                </div>
              </button>
              {writerChats.map(row)}
            </div>
            {loading && sessions.length === 0 && <div className="py-2 text-center text-[12.5px] text-[var(--dim)]">Loading your chats...</div>}
            {pastDesk.length > 0 && (
              <details className="mt-2"><summary className="cursor-pointer text-[12px] font-semibold text-[var(--dim)]">Earlier chats ({pastDesk.length})</summary>
                <div className="mt-2 overflow-hidden rounded-2xl border border-[var(--line)] bg-white">{pastDesk.map(row)}</div>
              </details>
            )}
            <p className="mt-2 text-center text-[11.5px] leading-snug text-[var(--dim)]">Writers the help desk connects you with are pinned here. Share a course in any chat with the clip button.</p>
          </section>

          <TutorialsSection active={active} />

          <section className="space-y-2.5">
            <div className="flex items-center justify-between"><span className="disp text-[16px] font-bold text-[var(--text)]">Print &amp; deliver</span><button onClick={() => openPrint({ kind: "orders" })} className="text-[12.5px] font-bold text-[var(--uni)]">My orders</button></div>
            <button onClick={() => openPrint({ kind: "print" })} className="flex w-full items-start gap-3.5 rounded-[18px] border border-[var(--line)] bg-white p-3.5 text-left active:scale-[0.98]"><Printer className="mt-0.5 shrink-0 text-[var(--uni)]" size={21} /><div><div className="disp text-[15px] font-bold">Print my project or assignment</div><div className="text-[12px] leading-snug text-[var(--dim)]">Printed and bound by a print shop near you. Pick up or get it delivered.</div></div></button>
            <button onClick={() => openPrint({ kind: "handwrite" })} className="flex w-full items-start gap-3.5 rounded-[18px] border border-[var(--line)] bg-white p-3.5 text-left active:scale-[0.98]"><PenLine className="mt-0.5 shrink-0 text-[var(--uni)]" size={21} /><div><div className="disp text-[15px] font-bold">Handwrite my assignment</div><div className="text-[12px] leading-snug text-[var(--dim)]">Send the softcopy. It&apos;s written out with your name and matric number.</div></div></button>
            <a href="/partner" className="block text-center text-[12px] font-semibold text-[var(--dim)] underline decoration-dotted">Own a print shop? Become a Birdie print partner</a>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center justify-between"><span className="disp text-[16px] font-bold text-[var(--text)]">Internships &amp; SIWES</span>{internships.length > 2 && <button onClick={() => setJobsOpen(true)} className="text-[12.5px] font-bold text-[var(--uni)]">See all ({internships.length})</button>}</div>
            {internships.length === 0 ? <p className="text-[12.5px] leading-snug text-[var(--dim)]">Placements and internships for students in your area will show up here. Make sure your school and region are on your profile.</p>
              : internships.slice(0, 2).map((p) => <InternshipCard key={p.id} p={p} />)}
          </section>

          <SlotAd surface="help" active={active} />

          {/* Deliberately last and low-key: Birdie should teach first, not do the work. */}
          <button onClick={() => setView("jdi")} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left opacity-80 active:scale-[0.98]">
            <Zap className="shrink-0 text-[var(--dim)]" size={17} />
            <div><div className="text-[13.5px] font-semibold text-[var(--text)]">Birdie: Just Do It</div><div className="text-[11.5px] leading-snug text-[var(--dim)]">Snap or pick a question and Birdie answers it</div></div>
          </button>
        </div>
        <Sheet open={jobsOpen} onClose={() => setJobsOpen(false)} title="Internships & SIWES">
          <div className="space-y-3">{internships.map((p) => <InternshipCard key={p.id} p={p} />)}</div>
        </Sheet>
      </div>
    );
  }

  // ---------------- CHAT ----------------
  const wname = writer?.display_name;
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--paper)] px-4 pb-2.5 pt-1">
        <button onClick={() => { setView("hub"); setActiveId(null); }} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-xl active:scale-90"><ArrowLeft size={19} /></button>
        <AnimatePresence mode="wait">
          <motion.div key={wname ?? "desk"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-w-0 flex-1 items-center gap-3">
            {wname ? <Avatar initials={initials(wname)} color={colorOf(wname)} size={38} online /> : <div className="disp relative flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[var(--ink)] text-[16px] font-bold text-[var(--birdie)]">U<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--paper)] bg-[#3FB56B]" /></div>}
            <div className="min-w-0"><div className="truncate text-[14.5px] font-bold leading-tight">{wname ?? "Unisupport Help Desk"}</div><div className="truncate text-[11.5px] text-[var(--dim)]">{wname ? writer?.specialization ?? s.title : s.title}</div></div>
          </motion.div>
        </AnimatePresence>
        {s.phase === "writer" && <button onClick={() => setMenu(true)} aria-label="Options" className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--dim)] active:scale-90"><MoreVertical size={18} /></button>}
      </div>

      <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#F0E9F6] px-4 py-3">
        {messages.map((x) => x.sender_role === "system" ? (
          <div key={x.id} className="mx-auto w-fit max-w-[88%] rounded-full bg-[#ddd2e8] px-3.5 py-1.5 text-center text-[11.5px] text-[#5b4b70]">{x.body}</div>
        ) : x.card ? (
          <Card key={x.id} m={x} s={s} job={jobs.find((j) => j.id === x.job_id)} onPayFee={() => void rpc("pay_session_fee", { p_session: s.id })} onView={(j) => void view_(j)} onPayWork={(j) => void rpc("pay_work_fee", { p_job: j.id })} onDownload={(j) => void download(j)} onAccept={(j) => void rpc("accept_job", { p_job: j.id }, "Accepted")} onRate={(j, n) => void rpc("rate_job", { p_job: j.id, p_rating: n }, "Thanks for rating")} />
        ) : (
          <motion.div key={x.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${x.sender_role === "student" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[14px] leading-snug shadow-sm ${x.sender_role === "student" ? "rounded-tr-md bg-[#EBD3F5]" : "rounded-tl-md bg-white"} text-[var(--text)]`}>
              {x.attachment_path ? <button onClick={() => void openAttachment(x.attachment_path!)} className="flex items-center gap-2 text-left underline decoration-dotted"><Paperclip size={13} />{x.body.replace(/^📎\s*/, "")}</button> : <Linkified text={x.body} />}
              <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#8a7fa0]">{clock(x.created_at)}{x.sender_role === "student" && <CheckCheck size={12} className="text-[#7C4DDB]" />}</div>
            </div>
          </motion.div>
        ))}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && s.phase === "desk" && (<div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto bg-[#F0E9F6] px-4 pb-2">{["How does this work?", "How much does it cost?", "I need help understanding a course", "Final year project, 40 pages, 2 weeks"].map((c) => (<button key={c} onClick={() => void send(c)} className="shrink-0 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text)] active:scale-95">{c}</button>))}</div>)}
      <div className="flex shrink-0 items-center gap-2 bg-[var(--paper)] px-4 pb-4 pt-2.5">
        <input ref={fileIn} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void attach(f); if (fileIn.current) fileIn.current.value = ""; }} />
        <button onClick={() => setAttachMenu(true)} aria-label="Attach" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--paper-dim)] text-[var(--dim)] active:scale-90"><Paperclip size={17} /></button>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { void send(draft); setDraft(""); } }} placeholder="Message" className="min-w-0 flex-1 rounded-full bg-[var(--paper-dim)] px-4 py-3 text-[14px] outline-none placeholder:text-[#a99fb8]" />
        <button onClick={() => { void send(draft); setDraft(""); }} disabled={!draft.trim()} aria-label="Send" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--uni)] text-white transition active:scale-90 disabled:opacity-40"><Send size={17} /></button>
      </div>

      <Sheet open={!!previewJob} onClose={() => setPreviewJob(null)} title="Preview (view only)">
        {previewJob && (<>
          <div className="mb-4 space-y-3">
            {previewFiles === null ? <div className="py-6 text-center text-[13px] text-[var(--dim)]">Loading preview...</div>
              : previewFiles.length === 0 ? <div className="rounded-2xl border border-[var(--line)] bg-white p-4 text-[13px] text-[var(--dim)]">Your writer hasn&apos;t attached a preview yet. Ask them in the chat.</div>
              : previewFiles.map((f) => /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif)$/i.test(f.name)
                ? <img key={f.name} src={f.url} alt={f.name} className="w-full rounded-2xl border border-[var(--line)]" />
                : /pdf/.test(f.type) || /\.pdf$/i.test(f.name) ? <iframe key={f.name} src={f.url} title={f.name} className="h-[360px] w-full rounded-2xl border border-[var(--line)]" />
                : <a key={f.name} href={f.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-[var(--line)] bg-white p-3 text-[13px] font-semibold">{f.name}</a>)}
          </div>
          {previewJob.delivery_paid_at ? <Btn onClick={() => void download(previewJob)}>Download</Btn> : <Btn onClick={async () => { const ok = await rpc("pay_work_fee", { p_job: previewJob.id }); if (ok) setPreviewJob(null); }}>Pay {naira(Number(previewJob.delivery_price ?? 0))} to download</Btn>}
        </>)}
      </Sheet>

      <Sheet open={attachMenu} onClose={() => setAttachMenu(false)} title="Attach">
        <div className="space-y-2">
          <Btn variant="ghost" onClick={() => { setAttachMenu(false); fileIn.current?.click(); }}><span className="inline-flex items-center gap-2"><Paperclip size={15} /> A file or photo</span></Btn>
          <Btn variant="ghost" onClick={() => { setAttachMenu(false); setCourseShare(true); }}><span className="inline-flex items-center gap-2"><BookOpen size={15} /> One of my courses</span></Btn>
        </div>
      </Sheet>
      <CourseShareSheet open={courseShare} onClose={() => { setCourseShare(false); void reload(); }} to={{ session: s.id }} who={wname ? first(wname) : "Unisupport"} />

      <Sheet open={menu} onClose={() => setMenu(false)} title={wname}>
        <p className="mb-3 text-[13px] leading-snug text-[var(--dim)]">You can message {wname ? first(wname) : "your writer"} any time, with no help desk and no new fee. Only ask for a different writer if this isn&apos;t working out.</p>
        <Btn variant="ghost" onClick={async () => { setMenu(false); await rpc("request_new_writer", { p_session: s.id }); }}>Request a different writer</Btn>
      </Sheet>
    </div>
  );
}

function Card({ m, s, job, onPayFee, onView, onPayWork, onDownload, onAccept, onRate }: { m: HMessage; s: HSession; job?: HJob; onPayFee: () => void; onView: (j: HJob) => void; onPayWork: (j: HJob) => void; onDownload: (j: HJob) => void; onAccept: (j: HJob) => void; onRate: (j: HJob, n: number) => void }) {
  const shell = "mx-auto w-full max-w-[92%] rounded-2xl bg-white p-3.5 shadow-sm";
  const wname = s.writers?.display_name;
  if (m.card === "fee") {
    const open = s.phase === "fee" && !s.fee_paid_at, amount = Number(s.fee_amount ?? 0);
    return (
      <div className={shell}>
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--uni-deep)]">{s.past_writers.length ? "Connect to a new writer" : "Open your writer session"}</div>
        <div className="disp text-[24px] font-bold">{naira(amount)} <span className="text-[13px] font-medium text-[var(--dim)]">one-off</span></div>
        <ul className="my-2 space-y-1 text-[12.5px] text-[var(--dim)]">{["Then chat with your writer directly, any time", "No help desk and no new fee with the same writer", "Paid from your Birdie balance"].map((x) => (<li key={x} className="flex gap-2"><Check size={13} className="mt-0.5 shrink-0 text-[var(--uni)]" strokeWidth={3} />{x}</li>))}</ul>
        {open ? <Btn onClick={onPayFee}>Pay {naira(amount)} and connect</Btn> : <div className="rounded-xl bg-[var(--uni-soft)] py-2.5 text-center text-[13px] font-semibold text-[var(--uni-deep)]">{s.phase === "fee" ? "Waiting" : "Paid"}</div>}
      </div>
    );
  }
  if (m.card === "quote" && job?.quote_price != null) return (
    <div className={shell}>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Estimate</div>
      {[["Service", job.service ? `${SERVICE_LABEL[job.service]} · ${ACCESS_LABEL[job.access ?? "standard"]}` : "-"], [job.service === "quiz" ? "Quizzes" : "Pages", String(job.pages)], ["Deadline", DL_LABEL[job.deadline ?? ""] ?? job.deadline ?? ""]].map(([a, b]) => (<div key={a} className="flex justify-between py-0.5 text-[13px]"><span className="text-[var(--dim)]">{a}</span><span className="font-semibold">{b}</span></div>))}
      <div className="my-2 h-px bg-[var(--line)]" /><div className="flex justify-between text-[14px] font-bold"><span>Work fee</span><span>{naira(Number(job.quote_price))}</span></div>
      <p className="mt-2 text-[11.5px] leading-snug text-[var(--dim)]">Nothing to pay now. You pay when the work is delivered, before you download. If the final page count changes, the price updates.</p>
    </div>
  );
  if (m.card === "delivery" && job?.delivery_pages != null) {
    const paid = !!job.delivery_paid_at, price = Number(job.delivery_price ?? 0);
    return (
      <div className={shell}>
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--uni-soft)] text-[var(--uni-deep)]"><FileText size={18} /></div><div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold">{s.mode === "mentor" ? "Session notes" : "Your finished work"}</div><div className="text-[11.5px] text-[var(--dim)]">{job.delivery_pages} {job.service ? UNIT_LABEL[job.service] : "page"}{job.delivery_pages === 1 ? "" : "s"}{job.access ? ` · ${ACCESS_LABEL[job.access]}` : ""}</div></div></div>
        <div className="mt-3 space-y-2">
          <button onClick={() => onView(job)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--paper-dim)] py-2.5 text-[13px] font-semibold active:scale-[0.98]"><Eye size={15} /> View</button>
          {paid ? (<>
            <button onClick={() => onDownload(job)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] py-2.5 text-[13px] font-semibold text-white active:scale-[0.98]"><Download size={15} /> Download</button>
            {job.stage === "active" && !job.student_accepted_at && <Btn onClick={() => onAccept(job)}>Accept and finish</Btn>}
            {job.stage === "active" && job.student_accepted_at && !job.writer_accepted_at && <div className="rounded-xl bg-[var(--uni-soft)] py-2.5 text-center text-[12.5px] font-semibold text-[var(--uni-deep)]">You accepted. Waiting for {wname ? first(wname) : "your writer"} to confirm</div>}
          </>) : (<button onClick={() => onPayWork(job)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--uni)] py-3 text-[13.5px] font-bold text-white active:scale-[0.98]"><Lock size={15} /> Pay {naira(price)} to download</button>)}
        </div>
        {!paid && <p className="mt-2 text-[11.5px] text-[var(--dim)]">You can view it now, downloading unlocks after payment.</p>}
      </div>
    );
  }
  if (m.card === "close" && job) return (
    <div className={shell}>
      <div className="flex items-center gap-2 text-[13px] font-bold"><Check size={16} className="text-[var(--uni)]" strokeWidth={3} /> You and {wname ? first(wname) : "the writer"} both accepted</div>
      <p className="mt-1.5 text-[12.5px] leading-snug text-[var(--dim)]">{job.stage === "closed" ? "Unisupport reviewed and closed this project." : "Unisupport is reviewing to confirm everything is in order. It closes within 24 hours. You can keep chatting meanwhile."}</p>
      {job.stage === "closed" && (<div className="mt-2.5 flex items-center gap-1.5">{[1, 2, 3, 4, 5].map((n) => (<button key={n} disabled={job.rating != null} onClick={() => onRate(job, n)} aria-label={`${n} stars`}><Star size={24} className={(job.rating ?? 0) >= n ? "fill-[var(--birdie)] text-[var(--birdie)]" : "text-[var(--line)]"} /></button>))}</div>)}
    </div>
  );
  return null;
}
