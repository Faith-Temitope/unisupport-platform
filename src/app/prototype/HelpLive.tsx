"use client";

// Help for signed-in students, backed by Supabase: real sessions, messages, fees and files.
// Desk agents and writers answer from the staff app (/prototype/live/staff). Nothing here is simulated.
import { navBack, useBackLayer } from "./nav";
import { EmojiCircle, KeyboardCircle, MoreBtn, PlusCircle, SqAvatar, VoiceCircle, WeHeader } from "./we";
import { HoldButton } from "./Pocket";
import { Linkified } from "./Linkified";
import { BookOpen, Image as ImageIcon, Check, Download, Eye, FileText, Lock, Paperclip, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { CourseShareSheet } from "./CourseShare";
import { useViewState } from "./persist";
import { ACCESS_LABEL, DL_LABEL, SERVICE_LABEL, UNIT_LABEL, clock, listFolder, openUrl, rpcError, safeName, sendMessage, signedUrl, uploadTo, useHelpData, type HJob, type HMessage, type HSession } from "./live/helpData";
import { logEvent } from "./live/analyticsData";
import { naira, uid, useApp } from "./store";
import { Btn, Sheet, scrollToEnd } from "./ui";

const initials = (n: string) => n.split(" ").filter((x) => !/^dr\.?$/i.test(x)).map((x) => x[0]).join("").slice(0, 2).toUpperCase();
const PALETTE = ["#A63FBD", "#4C6EF5", "#D9467E", "#7C4DDB"];
const colorOf = (s: string) => PALETTE[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
const first = (n: string) => (n.startsWith("Dr.") ? n.split(" ")[1] : n.split(" ")[0]);

export default function HelpLive({ active, onBack }: { active: boolean; onBack?: () => void }) {
  const { setWalletOpen, flash, helpIntent, clearHelpIntent, refreshWallet, grantCourseAccess, profile } = useApp();
  const [activeId, setActiveId] = useViewState<string | null>("help.chat", null);
  const [courseShare, setCourseShare] = useState(false);
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
  useEffect(() => { scrollToEnd(endRef.current); }, [messages.length, activeId]);

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
    setActiveId(id); setHome(false);
  }
  useEffect(() => {
    if (!helpIntent) return;
    if (helpIntent.sessionId) setActiveId(helpIntent.sessionId); else void openDesk(helpIntent.courseId);
    clearHelpIntent();
  }, [helpIntent]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Unisupport Help is a folder, like Courses: the help desk and every writer they handed you to.
  // Tapping one opens its chat; the desk chat becomes your writer's chat when they assign one.
  const [home, setHome] = useState(true);
  useBackLayer(!home, () => setHome(true));
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current && !helpIntent) void Promise.resolve().then(() => setHome(true));
    wasActive.current = active;
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (helpIntent) void Promise.resolve().then(() => setHome(false)); }, [helpIntent]);
  const [panel, setPanel] = useState<null | "emoji" | "plus">(null);
  useBackLayer(!!panel, () => setPanel(null));
  const photoIn = useRef<HTMLInputElement>(null);
  const meName = profile.name || "Me";

  if (home || !s) {
    const writerChats = sessions.filter((x) => x.writers);
    const pastDesk = sessions.filter((x) => !x.writers && x.id !== deskChat?.id);
    const deskLine = busy ? "Opening..." : deskChat ? (deskChat.phase === "fee" ? "Waiting to connect you to a writer" : "Continue your chat") : "Tell us what you need. We'll get it done.";
    return (
      <div className="flex h-full min-h-0 flex-col bg-[var(--we-bg)]">
        <WeHeader onBack={onBack} title="Unisupport Help" />
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-10">
          <div className="px-4 pt-2">
            <div className="mb-3 text-[13px] text-[var(--we-sub)]">Your help</div>
            <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4">
              <button onClick={() => void openDesk()} className="flex w-[60px] shrink-0 flex-col items-center gap-1.5"><DeskAvatar size={52} round /><span className="max-w-full truncate text-[12px] text-[var(--we-sub)]">Help Desk</span></button>
              {writerChats.map((w) => (
                <button key={w.id} onClick={() => { setActiveId(w.id); setHome(false); }} className="flex w-[60px] shrink-0 flex-col items-center gap-1.5">
                  <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-[16px] font-semibold text-white" style={{ background: colorOf(w.writers!.display_name) }}>{initials(w.writers!.display_name)}</span>
                  <span className="max-w-full truncate text-[12px] text-[var(--we-sub)]">{first(w.writers!.display_name)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3 px-3 pt-4">
            <button onClick={() => void openDesk()} disabled={busy} className="block w-full overflow-hidden rounded-[8px] bg-[var(--we-cell)] text-left active:opacity-90">
              <div className="flex items-center gap-2.5 px-4 pt-3"><DeskAvatar size={24} round /><span className="flex-1 text-[14px] text-[var(--we-link)]">Help Desk</span>{deskChat && <span className="text-[12px] text-[var(--we-hint)]">{clock(deskChat.created_at)}</span>}</div>
              <div className="px-4 pb-3 pt-2"><div className="text-[16px] font-semibold text-[var(--we-text)]">{deskChat?.title || "Chat with Unisupport"}</div><div className="mt-1 text-[13.5px] text-[var(--we-sub)]">{deskLine}</div></div>
            </button>
            {writerChats.map((w) => (
              <button key={w.id} onClick={() => { setActiveId(w.id); setHome(false); }} className="block w-full overflow-hidden rounded-[8px] bg-[var(--we-cell)] text-left active:opacity-90">
                <div className="flex items-center gap-2.5 px-4 pt-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: colorOf(w.writers!.display_name) }}>{initials(w.writers!.display_name)}</span>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--we-link)]">{w.writers!.display_name}</span>
                  <span className="text-[12px] text-[var(--we-hint)]">{clock(w.created_at)}</span>
                </div>
                <div className="px-4 pb-3 pt-2"><div className="line-clamp-2 text-[16px] font-semibold text-[var(--we-text)]">{w.title || "Your work"}</div><div className="mt-1 text-[13.5px] text-[var(--we-sub)]">Your writer · {w.writers!.specialization ?? "Unisupport"}</div></div>
              </button>
            ))}
            {loading && sessions.length === 0 && <p className="py-2 text-center text-[12.5px] text-[var(--we-sub)]">Loading your chats...</p>}
            {pastDesk.length > 0 && (
              <details className="px-1"><summary className="cursor-pointer py-2 text-[13px] text-[var(--we-sub)]">Earlier chats ({pastDesk.length})</summary>
                <div className="overflow-hidden rounded-[8px] bg-[var(--we-cell)]">{pastDesk.map((x) => (
                  <button key={x.id} onClick={() => { setActiveId(x.id); setHome(false); }} className="block w-full border-b border-[var(--we-sep)] px-4 py-3 text-left last:border-0">
                    <div className="truncate text-[15px] text-[var(--we-text)]">{x.title || "Earlier chat"}</div><div className="text-[12px] text-[var(--we-hint)]">{new Date(x.created_at).toLocaleDateString()}</div>
                  </button>
                ))}</div>
              </details>
            )}
            <p className="px-6 pt-2 text-center text-[12px] leading-snug text-[var(--we-sub)]">Tutorials, printing, internships and Just Do It are in Discover &gt; Mini Programs.</p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- CHAT ----------------
  const wname = writer?.display_name;
  const them = (role: HMessage["sender_role"]) => (role === "writer" && wname ? <SqAvatar name={wname} color={colorOf(wname)} size={40} /> : <DeskAvatar size={40} />);
  const sendDraft = () => { const t = draft.trim(); if (!t) return; void send(t); setDraft(""); };
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--we-chat)]">
      <WeHeader onBack={navBack} title={<span className="block truncate">{wname ?? "Unisupport Help"}<span className="block truncate text-[11.5px] font-normal text-[var(--we-sub)]">{wname ? writer?.specialization ?? "Your writer" : s.phase === "fee" ? "Connecting you to a writer" : "Help Desk · online"}</span></span>}
        right={<>
          <HoldButton item={{ kind: "helpchat", title: wname ? `Chat with ${wname}` : "Unisupport Help", sessionId: s.id }} className="flex h-10 w-9 items-center justify-center text-[var(--we-text)]" />
          {s.phase === "writer" && <MoreBtn onClick={() => setMenu(true)} />}
        </>} />

      <div onClick={() => setPanel(null)} className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {messages.map((x, i) => {
          const prev = messages[i - 1];
          const time = !prev || new Date(x.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60_000 ? <div className="pb-3 text-center text-[12px] text-[var(--we-sub)]">{clock(x.created_at)}</div> : null;
          if (x.sender_role === "system") return <div key={x.id}>{time}<div className="mx-auto w-fit max-w-[80%] rounded-[4px] bg-black/10 px-2 py-0.5 text-center text-[12px] text-[var(--we-sub)]">{x.body}</div></div>;
          if (x.card) return <div key={x.id}>{time}<Card m={x} s={s} job={jobs.find((j) => j.id === x.job_id)} onPayFee={() => void rpc("pay_session_fee", { p_session: s.id })} onView={(j) => void view_(j)} onPayWork={(j) => void rpc("pay_work_fee", { p_job: j.id })} onDownload={(j) => void download(j)} onAccept={(j) => void rpc("accept_job", { p_job: j.id }, "Accepted")} onRate={(j, n) => void rpc("rate_job", { p_job: j.id, p_rating: n }, "Thanks for rating")} /></div>;
          const mine = x.sender_role === "student";
          return (
            <div key={x.id}>
              {time}
              <div className={`flex items-start gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
                {mine ? <SqAvatar name={meName} color="#8A2FA3" size={40} /> : them(x.sender_role)}
                <div className={`relative max-w-[72%] rounded-[4px] px-3 py-[9px] text-[16px] leading-[1.4] ${mine ? "bg-[var(--we-mine)] text-[var(--we-mine-text)]" : "bg-[var(--we-bubble)] text-[var(--we-text)]"}`}>
                  <span className={`absolute top-[13px] h-2.5 w-2.5 rotate-45 ${mine ? "-right-1 bg-[var(--we-mine)]" : "-left-1 bg-[var(--we-bubble)]"}`} />
                  <span className="relative block break-words">{x.attachment_path ? <button onClick={() => void openAttachment(x.attachment_path!)} className="flex items-center gap-2 text-left underline decoration-dotted"><Paperclip size={14} />{x.body.replace(/^📎\s*/, "")}</button> : <Linkified text={x.body} />}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && s.phase === "desk" && (<div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-3 pb-2">{["How does this work?", "How much does it cost?", "I need help understanding a course", "Final year project, 40 pages, 2 weeks"].map((c) => (<button key={c} onClick={() => void send(c)} className="shrink-0 rounded-full bg-[var(--we-cell)] px-3 py-1.5 text-[13px] text-[var(--we-text)] active:opacity-70">{c}</button>))}</div>)}
      <div className="flex shrink-0 items-end gap-2 border-t border-[var(--we-sep)] bg-[var(--we-bar)] px-2 pb-2 pt-2 text-[var(--we-text)]">
        <input ref={fileIn} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void attach(f); e.target.value = ""; }} />
        <input ref={photoIn} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void attach(f); e.target.value = ""; }} />
        <button onClick={() => dictate((t) => setDraft((d) => (d ? d + " " : "") + t), flash)} aria-label="Voice input" className="mb-[3px] shrink-0 active:opacity-60"><VoiceCircle /></button>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onFocus={() => setPanel(null)} rows={1} aria-label="Message"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDraft(); } }}
          className="max-h-28 min-h-9 min-w-0 flex-1 resize-none rounded-[4px] bg-[var(--we-input)] px-2.5 py-[7px] text-[16px] leading-snug text-[var(--we-text)] outline-none" />
        <button onClick={() => setPanel((p) => (p === "emoji" ? null : "emoji"))} aria-label={panel === "emoji" ? "Keyboard" : "Emoji"} className="mb-[3px] shrink-0 active:opacity-60">{panel === "emoji" ? <KeyboardCircle /> : <EmojiCircle />}</button>
        {draft.trim()
          ? <button onClick={sendDraft} className="mb-[2px] h-8 shrink-0 rounded-[4px] bg-[var(--we-accent)] px-3 text-[14px] font-medium text-white">Send</button>
          : <button onClick={() => setPanel((p) => (p === "plus" ? null : "plus"))} aria-label="More" className="mb-[3px] shrink-0 active:opacity-60"><PlusCircle /></button>}
      </div>
      {panel === "emoji" && (
        <div className="no-scrollbar grid h-[230px] shrink-0 grid-cols-8 gap-1 overflow-y-auto bg-[var(--we-bar)] px-3 py-3 text-[26px]">
          {EMOJIS.map((e) => <button key={e} onClick={() => setDraft((d) => d + e)} className="flex h-10 items-center justify-center active:scale-90">{e}</button>)}
        </div>
      )}
      {panel === "plus" && (
        <div className="grid h-[150px] shrink-0 grid-cols-4 gap-y-3 border-t border-[var(--we-sep)] bg-[var(--we-bar)] px-4 pt-4">
          {[
            { label: "Album", Icon: ImageIcon, run: () => photoIn.current?.click() },
            { label: "File", Icon: FileText, run: () => fileIn.current?.click() },
            { label: "Course", Icon: BookOpen, run: () => setCourseShare(true) },
          ].map(({ label, Icon, run }) => (
            <button key={label} onClick={() => { setPanel(null); run(); }} className="flex flex-col items-center gap-1.5">
              <span className="flex h-[58px] w-[58px] items-center justify-center rounded-[14px] bg-[var(--we-cell)] text-[var(--we-text)]"><Icon size={26} strokeWidth={1.5} /></span>
              <span className="text-[12px] text-[var(--we-sub)]">{label}</span>
            </button>
          ))}
        </div>
      )}
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

const EMOJIS = "😀 😂 🤣 😊 😍 😎 🥳 🙂 😉 😋 😜 🤔 😐 🙄 😏 😬 😴 😱 😭 😢 😤 😡 🥺 😳 🤗 🙏 👍 👎 👏 🙌 💪 🤝 👌 ✌️ 🤞 👀 💯 🔥 ✨ 🎉 ❤️ 💔 💜 ⭐ 📚 ✏️ 📝 🎓 💻 📱 💸 💰 ⏰".split(" ");

function DeskAvatar({ size, round }: { size: number; round?: boolean }) {
  return <span className={`flex shrink-0 items-center justify-center bg-[#1F1A2B] font-bold text-[#E6B3F2] ${round ? "rounded-full" : "rounded-[6px]"}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>U</span>;
}

/** Speech to text into the message box (where the browser supports it). */
function dictate(onText: (t: string) => void, flash: (m: string) => void) {
  const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  const R = W.SpeechRecognition ?? W.webkitSpeechRecognition;
  if (!R) { flash("Voice typing isn't available on this phone. Use the microphone on your keyboard."); return; }
  const r = new R(); r.lang = "en-NG"; r.interimResults = false;
  r.onresult = (e) => onText(e.results[0][0].transcript);
  r.onerror = () => flash("Couldn't hear that. Try again.");
  flash("Listening..."); r.start();
}
type SpeechRec = { lang: string; interimResults: boolean; start: () => void; onresult: (e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void; onerror: () => void };
