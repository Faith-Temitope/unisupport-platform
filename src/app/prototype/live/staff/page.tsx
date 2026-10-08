"use client";

// Live staff app for Unisupport: help desk agents (role support/admin) and writers (role writer).
// Same Supabase project as the student app. Roles are set on profiles.role by an admin.
import { Linkified } from "../../Linkified";
import { ArrowLeft, Check, LogOut, Paperclip, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { ACCESS_LABEL, DL_LABEL, SERVICE_LABEL, UNIT_LABEL, clock, openUrl, rpcError, safeName, sendMessage, signedUrl, uploadTo, useHelpData, type HJob, type HMessage, type HSession } from "../helpData";

type Role = "support" | "admin" | "writer";
interface Writer { id: string; display_name: string; specialization: string | null; is_available: boolean; rating: number | null; completed_count: number; earnings: number }
const naira = (n: number) => "₦" + Number(n).toLocaleString("en-NG");
const btn = "rounded-xl px-3.5 py-2 text-[13px] font-semibold transition active:scale-95 disabled:opacity-40";

export default function StaffLive() {
  const [me, setMe] = useState<{ id: string; name: string; role: Role } | null | "loading">("loading");
  const load = useCallback(async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return setMe(null);
    const { data: p } = await sb.from("profiles").select("full_name,role").eq("id", user.id).maybeSingle();
    if (!p || p.role === "student") return setMe(null);
    setMe({ id: user.id, name: (p.full_name as string) || user.email || "Staff", role: p.role as Role });
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (me === "loading") return <Shell><div className="p-10 text-center text-sm text-[#6b5b7e]">Loading...</div></Shell>;
  if (!me) return <Shell><SignIn onDone={load} /></Shell>;
  return <Shell><Workspace me={me} onOut={async () => { await createClient().auth.signOut(); setMe(null); }} /></Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="proto-root min-h-screen bg-[#F4EFF8] text-[#1a1024]" style={{ fontFamily: "system-ui, sans-serif" }}>{children}</div>;
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setErr("");
    const { error } = await createClient().auth.signInWithPassword({ email, password: pw });
    if (error) { setErr(error.message); setBusy(false); return; }
    await onDone(); setBusy(false);
    setErr("This account isn't a Unisupport staff account.");
  }
  return (
    <div className="mx-auto mt-24 w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#8b3fa6]">Unisupport staff</div>
      <h1 className="mb-4 text-2xl font-bold">Sign in</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work email" className="mb-2 w-full rounded-xl bg-[#F4EFF8] px-4 py-3 text-sm outline-none" />
      <input value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void go()} type="password" placeholder="Password" className="mb-3 w-full rounded-xl bg-[#F4EFF8] px-4 py-3 text-sm outline-none" />
      {err && <div role="alert" className="mb-3 text-[13px] text-red-600">{err}</div>}
      <button disabled={busy || !email || !pw} onClick={() => void go()} className={`${btn} w-full bg-[#1a1024] py-3 text-white`}>{busy ? "Signing in..." : "Sign in"}</button>
    </div>
  );
}

function Workspace({ me, onOut }: { me: { id: string; name: string; role: Role }; onOut: () => void }) {
  const desk = me.role !== "writer";
  const [activeId, setActiveId] = useState<string | null>(null);
  const { sessions, messages, jobs, reload } = useHelpData(activeId);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [queue, setQueue] = useState<(HJob & { title?: string })[]>([]);
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<"chats" | "review" | "writers">("chats");
  const s = sessions.find((x) => x.id === activeId) ?? null;

  const flash = (t: string) => { setNote(t); setTimeout(() => setNote(""), 3500); };
  const refreshSide = useCallback(async () => {
    const sb = createClient();
    const w = await sb.from("writers").select("id,display_name,specialization,is_available,rating,completed_count,earnings").order("display_name");
    setWriters((w.data ?? []) as Writer[]);
    if (desk) { const q = await sb.from("jobs").select("*").eq("stage", "review").order("review_due_at"); setQueue((q.data ?? []) as HJob[]); }
  }, [desk]);
  useEffect(() => { void refreshSide(); const i = setInterval(() => void refreshSide(), 15000); return () => clearInterval(i); }, [refreshSide]);
  const mineWriter = writers.find((w) => w.id === me.id);

  async function rpc(fn: string, args: Record<string, unknown>, ok?: string) {
    const { error } = await createClient().rpc(fn, args);
    if (error) { flash(rpcError(error)); return false; }
    if (ok) flash(ok);
    await Promise.all([reload(), refreshSide()]); return true;
  }

  const attention = sessions.filter((x) => (desk ? x.phase !== "writer" || !x.writer_id : true));
  const list = desk ? sessions : sessions;

  return (
    <div className="mx-auto flex h-screen max-w-6xl flex-col p-4">
      <header className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a1024] text-lg font-bold text-[#E6B3F2]">U</div>
        <div className="flex-1"><div className="text-base font-bold leading-tight">{desk ? "Help desk" : "Writer app"}</div><div className="text-xs text-[#6b5b7e]">{me.name} · {me.role}{!desk && mineWriter ? ` · earned ${naira(mineWriter.earnings)} · ${mineWriter.completed_count} done` : ""}</div></div>
        {!desk && mineWriter && <button onClick={async () => { await createClient().from("writers").update({ is_available: !mineWriter.is_available }).eq("id", me.id); void refreshSide(); }} className={`${btn} ${mineWriter.is_available ? "bg-[#DFF3E4] text-[#1f7a3a]" : "bg-[#eee] text-[#666]"}`}>{mineWriter.is_available ? "Available" : "Unavailable"}</button>}
        <button onClick={onOut} className={`${btn} flex items-center gap-1.5 bg-white`}><LogOut size={14} />Sign out</button>
      </header>
      {note && <div role="status" className="mb-2 rounded-xl bg-[#1a1024] px-4 py-2 text-[13px] text-white">{note}</div>}

      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[320px_1fr]">
        <aside className={`${activeId ? "hidden md:flex" : "flex"} min-h-0 flex-col overflow-hidden rounded-2xl bg-white`}>
          {desk && <div className="flex gap-1 border-b border-[#eee] p-2">{(["chats", "review", "writers"] as const).map((t) => (<button key={t} onClick={() => setTab(t)} className={`${btn} flex-1 ${tab === t ? "bg-[#1a1024] text-white" : "bg-[#F4EFF8]"}`}>{t === "chats" ? `Chats${attention.length ? ` (${attention.length})` : ""}` : t === "review" ? `Review (${queue.length})` : "Writers"}</button>))}</div>}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "chats" && (list.length === 0 ? <div className="p-6 text-center text-sm text-[#6b5b7e]">No chats yet. New student requests appear here as they arrive.</div> : list.map((x) => (
              <button key={x.id} onClick={() => setActiveId(x.id)} className={`block w-full border-b border-[#f0eaf5] p-3 text-left ${activeId === x.id ? "bg-[#F4EFF8]" : ""}`}>
                <div className="flex justify-between gap-2"><span className="truncate text-sm font-semibold">{x.title}</span><span className="shrink-0 text-[11px] text-[#8a7fa0]">{clock(x.created_at)}</span></div>
                <div className="text-xs text-[#6b5b7e]">{x.mode === "mentor" ? "Mentor" : "Full write-up"} · {x.phase === "desk" ? "At the desk" : x.phase === "fee" ? "Fee due" : x.writers?.display_name ?? "With writer"}</div>
              </button>)))}
            {tab === "review" && (queue.length === 0 ? <div className="p-6 text-center text-sm text-[#6b5b7e]">Nothing waiting for review.</div> : queue.map((j) => (
              <div key={j.id} className="border-b border-[#f0eaf5] p-3"><div className="text-sm font-semibold">{j.delivery_pages} pages · {naira(Number(j.delivery_price ?? 0))}</div><div className="mb-2 text-xs text-[#6b5b7e]">Both accepted · due {j.review_due_at ? new Date(j.review_due_at).toLocaleString() : ""}</div><div className="flex gap-2"><button className={`${btn} bg-[#8b3fa6] text-white`} onClick={() => void rpc("close_job", { p_job: j.id }, "Closed and writer credited")}>Close project</button><button className={`${btn} bg-[#F4EFF8]`} onClick={() => { setActiveId(j.session_id); setTab("chats"); }}>Open chat</button></div></div>)))}
            {tab === "writers" && writers.map((w) => (<div key={w.id} className="border-b border-[#f0eaf5] p-3"><div className="flex justify-between"><span className="text-sm font-semibold">{w.display_name}</span><span className={`text-xs ${w.is_available ? "text-[#1f7a3a]" : "text-[#999]"}`}>{w.is_available ? "available" : "away"}</span></div><div className="text-xs text-[#6b5b7e]">{w.specialization} · ★ {w.rating ?? "new"} · {w.completed_count} done</div></div>))}
            {tab === "writers" && writers.length === 0 && <div className="p-6 text-center text-sm text-[#6b5b7e]">No writers yet. Add a writer account in Supabase (profiles.role = writer, plus a writers row).</div>}
          </div>
        </aside>

        <main className={`${activeId ? "flex" : "hidden md:flex"} min-h-0 flex-col overflow-hidden rounded-2xl bg-white`}>
          {s ? <Chat key={s.id} s={s} desk={desk} messages={messages} jobs={jobs} writers={writers} onBack={() => setActiveId(null)} rpc={rpc} flash={flash} reload={reload} /> : <div className="flex flex-1 items-center justify-center text-sm text-[#6b5b7e]">Pick a chat</div>}
        </main>
      </div>
    </div>
  );
}

function Chat({ s, desk, messages, jobs, writers, onBack, rpc, flash, reload }: { s: HSession; desk: boolean; messages: HMessage[]; jobs: HJob[]; writers: Writer[]; onBack: () => void; rpc: (fn: string, a: Record<string, unknown>, ok?: string) => Promise<boolean>; flash: (t: string) => void; reload: () => Promise<void> }) {
  const [draft, setDraft] = useState("");
  const [service, setService] = useState<"quiz" | "writing">("writing"); const [access, setAccess] = useState<"standard" | "full">("standard");
  const [qty, setQty] = useState("10"); const [dl, setDl] = useState("3d");
  const [pick, setPick] = useState("");
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [dService, setDService] = useState<"quiz" | "writing">("writing"); const [dAccess, setDAccess] = useState<"standard" | "full">("standard");
  const [dQty, setDQty] = useState("10"); const [dPrev, setDPrev] = useState<File | null>(null); const [dFile, setDFile] = useState<File | null>(null); const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  const role = desk ? "desk" : "writer";
  const openJob = [...jobs].reverse().find((j) => j.stage !== "closed");
  const canWrite = desk || s.phase === "writer";

  async function send() { if (!draft.trim()) return; const t = draft; setDraft(""); const e = await sendMessage(s.id, role, t); if (e) flash(e); else void reload(); }
  async function attach(f: File) { const path = `${s.id}/${crypto.randomUUID()}/${safeName(f.name)}`; const e = await uploadTo("session-uploads", path, f); if (e) return flash(e); const er = await sendMessage(s.id, role, `📎 ${f.name}`, path); if (er) flash(er); else void reload(); }
  async function openAtt(p: string) { const u = await signedUrl("session-uploads", p); if (u) openUrl(u); }
  async function deliver() {
    setSending(true);
    const { data, error } = await createClient().rpc("deliver_work", { p_session: s.id, p_qty: Number(dQty), p_service: dService, p_access: dAccess });
    if (error) { flash(rpcError(error)); setSending(false); return; }
    const jid = data as string;
    if (dPrev) { const e = await uploadTo("session-previews", `${s.id}/${jid}/preview-${safeName(dPrev.name)}`, dPrev); if (e) flash("Preview upload failed: " + e); }
    if (dFile) { const e = await uploadTo("session-deliverables", `${s.id}/${jid}/${safeName(dFile.name)}`, dFile); if (e) flash("File upload failed: " + e); }
    setSending(false); setDeliverOpen(false); setDPrev(null); setDFile(null); flash("Delivered"); void reload();
  }
  const free = writers.filter((w) => w.is_available && !s.past_writers.includes(w.id));

  return (
    <>
      <div className="flex items-center gap-3 border-b border-[#eee] p-3">
        <button onClick={onBack} className="md:hidden"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{s.title}</div><div className="text-xs text-[#6b5b7e]">{s.mode === "mentor" ? "Mentor me" : "Do it for me"} · {s.phase === "desk" ? "desk" : s.phase === "fee" ? `fee ${naira(Number(s.fee_amount ?? 0))} due` : `with ${s.writers?.display_name ?? "writer"}`}{s.past_writers.length ? ` · ${s.past_writers.length} earlier writer(s)` : ""}</div></div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#F0E9F6] p-3">
        {messages.map((m) => m.sender_role === "system" ? <div key={m.id} className="mx-auto w-fit rounded-full bg-[#ddd2e8] px-3 py-1 text-[11.5px] text-[#5b4b70]">{m.body}</div>
          : m.card ? <div key={m.id} className="mx-auto w-fit max-w-[90%] rounded-xl border border-dashed border-[#b9a6cc] bg-white/70 px-3 py-2 text-[12px] text-[#5b4b70]">{cardText(m, jobs.find((j) => j.id === m.job_id), s)}</div>
          : (<div key={m.id} className={`flex ${m.sender_role === "student" ? "justify-start" : "justify-end"}`}><div className={`max-w-[75%] rounded-2xl px-3 py-2 text-[14px] shadow-sm ${m.sender_role === "student" ? "bg-white" : "bg-[#EBD3F5]"}`}>
            <div className="mb-0.5 text-[10px] font-bold uppercase text-[#8b3fa6]">{m.sender_role}</div>
            {m.attachment_path ? <button className="flex items-center gap-1.5 underline decoration-dotted" onClick={() => void openAtt(m.attachment_path!)}><Paperclip size={12} />{m.body.replace(/^📎\s*/, "")}</button> : <Linkified text={m.body} />}
            <div className="mt-0.5 text-right text-[10px] text-[#8a7fa0]">{clock(m.created_at)}</div></div></div>))}
        <div ref={endRef} />
      </div>

      <div className="space-y-2 border-t border-[#eee] p-3">
        <div className="flex flex-wrap items-center gap-2">
          {desk && s.phase === "desk" && <button className={`${btn} bg-[#8b3fa6] text-white`} onClick={() => void rpc("request_session_fee", { p_session: s.id }, "Fee card sent")}>Request session fee</button>}
          {desk && s.phase !== "writer" && (<><select value={pick} onChange={(e) => setPick(e.target.value)} className={`${btn} bg-[#F4EFF8]`}><option value="">Assign writer...</option>{free.map((w) => <option key={w.id} value={w.id}>{w.display_name} · {w.specialization}</option>)}</select><button disabled={!pick} className={`${btn} bg-[#1a1024] text-white`} onClick={() => void rpc("assign_writer", { p_session: s.id, p_writer: pick }, "Writer assigned")}>Assign</button></>)}
          {s.phase === "writer" && s.mode === "full" && (<>
            <select value={service} onChange={(e) => setService(e.target.value as "quiz" | "writing")} className={`${btn} bg-[#F4EFF8]`} aria-label="Service"><option value="writing">Writing</option><option value="quiz">Quiz</option></select>
            <select value={access} onChange={(e) => setAccess(e.target.value as "standard" | "full")} className={`${btn} bg-[#F4EFF8]`} aria-label="Access level"><option value="standard">Standard</option><option value="full">Full LMS Access</option></select>
            <input value={qty} onChange={(e) => setQty(e.target.value)} className="w-16 rounded-xl bg-[#F4EFF8] px-2 py-2 text-sm" aria-label={service === "quiz" ? "Quizzes" : "Pages"} />
            <select value={dl} onChange={(e) => setDl(e.target.value)} className={`${btn} bg-[#F4EFF8]`}>{Object.entries(DL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <button className={`${btn} bg-[#F4EFF8]`} onClick={() => void rpc("set_quote", { p_session: s.id, p_service: service, p_access: access, p_qty: Number(qty), p_deadline: dl }, "Quote sent")}>Send quote · {naira(Number(qty || 0) * (service === "quiz" ? (access === "full" ? 6000 : 500) : access === "full" ? 8000 : 1000))}</button>
          </>)}
          {!desk && s.phase === "writer" && <button className={`${btn} bg-[#1a1024] text-white`} disabled={!!openJob?.delivery_pages} onClick={() => setDeliverOpen(true)}>Deliver work</button>}
          {!desk && s.phase === "writer" && openJob?.delivery_paid_at && !openJob.writer_accepted_at && <button className={`${btn} bg-[#DFF3E4] text-[#1f7a3a]`} onClick={() => void rpc("accept_job", { p_job: openJob.id }, "Accepted")}><Check size={13} className="mr-1 inline" />Accept</button>}
          {s.phase === "writer" && <button className={`${btn} bg-[#FBE3E3] text-[#a12b2b]`} onClick={() => void rpc("request_new_writer", { p_session: s.id }, "Sent back to the desk")}>{desk ? "Reassign writer" : "Can't continue"}</button>}
        </div>
        {deliverOpen && (
          <div className="space-y-2 rounded-2xl bg-[#F4EFF8] p-3 text-sm">
            {!openJob?.service && (
              <div className="flex gap-2">
                <select value={dService} onChange={(e) => setDService(e.target.value as "quiz" | "writing")} className="rounded-lg bg-white px-2 py-1.5" aria-label="Service"><option value="writing">Writing</option><option value="quiz">Quiz</option></select>
                <select value={dAccess} onChange={(e) => setDAccess(e.target.value as "standard" | "full")} className="rounded-lg bg-white px-2 py-1.5" aria-label="Access level"><option value="standard">Standard</option><option value="full">Full LMS Access</option></select>
              </div>
            )}
            <label className="flex items-center gap-2">{(openJob?.service ?? dService) === "quiz" ? "Quizzes" : "Pages"} <input value={dQty} onChange={(e) => setDQty(e.target.value)} className="w-16 rounded-lg bg-white px-2 py-1.5" /></label>
            <label className="block text-xs text-[#6b5b7e]">Preview the student sees before paying (image or PDF, optional)<input type="file" accept="image/*,application/pdf" onChange={(e) => setDPrev(e.target.files?.[0] ?? null)} className="mt-1 block text-sm" /></label>
            <label className="block text-xs text-[#6b5b7e]">Final file (unlocks after the student pays)<input type="file" onChange={(e) => setDFile(e.target.files?.[0] ?? null)} className="mt-1 block text-sm" /></label>
            <div className="flex gap-2"><button disabled={sending || !dFile} className={`${btn} bg-[#8b3fa6] text-white`} onClick={() => void deliver()}>{sending ? "Uploading..." : "Deliver"}</button><button className={`${btn} bg-white`} onClick={() => setDeliverOpen(false)}>Cancel</button></div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className={`${btn} cursor-pointer bg-[#F4EFF8]`}><Paperclip size={15} /><input type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void attach(f); e.target.value = ""; }} /></label>
          <input disabled={!canWrite} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void send()} placeholder={canWrite ? (desk ? "Reply as Unisupport Help Desk" : "Message the student") : "Waiting for the desk to connect you"} className="min-w-0 flex-1 rounded-full bg-[#F4EFF8] px-4 py-3 text-sm outline-none" />
          <button disabled={!draft.trim() || !canWrite} onClick={() => void send()} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8b3fa6] text-white disabled:opacity-40"><Send size={16} /></button>
        </div>
      </div>
    </>
  );
}

function cardText(m: HMessage, j: HJob | undefined, s: HSession) {
  if (m.card === "fee") return `Session fee card · ${naira(Number(s.fee_amount ?? 0))}${s.fee_paid_at && s.phase === "writer" ? " · paid" : ""}`;
  if (m.card === "quote") return j ? `Quote · ${j.service ? `${SERVICE_LABEL[j.service]} · ${ACCESS_LABEL[j.access ?? "standard"]} · ` : ""}${j.pages} ${j.service ? UNIT_LABEL[j.service] : "page"}${j.pages === 1 ? "" : "s"} · ${DL_LABEL[j.deadline ?? ""] ?? j.deadline} · ${naira(Number(j.quote_price ?? 0))}` : "Quote";
  if (m.card === "delivery") return j ? `Delivery · ${j.delivery_pages} ${j.service ? UNIT_LABEL[j.service] : "page"}${j.delivery_pages === 1 ? "" : "s"} · ${j.delivery_paid_at ? "paid, download unlocked" : `unpaid ${naira(Number(j.delivery_price ?? 0))}`}${j.student_accepted_at ? " · student accepted" : ""}${j.writer_accepted_at ? " · writer accepted" : ""}` : "Delivery";
  return j ? `Both accepted · ${j.stage === "closed" ? "closed" : "in Unisupport review"}${j.rating ? ` · ${j.rating}★` : ""}` : "Close";
}
