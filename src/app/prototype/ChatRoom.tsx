"use client";

// One conversation, WeChat style: one-to-one or a group. Text, photos, voice notes (hold to talk),
// files, location, contact cards, courses, transfers and giveaways. Long-press a message to copy,
// reply, delete or unsend it.
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, AudioLines, BellOff, BookOpen, Camera, Contact, CornerUpLeft, Copy, FileText, Gift, Image as ImageIcon, Keyboard, Link2, LogOut, MapPin, Mic, MoreHorizontal, Pin, Plus, Send, Shield, Trash2, Undo2, UserPlus, Wallet, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CourseShareSheet } from "./CourseShare";
import { Linkified } from "./Linkified";
import { GiveawayOpen, GiveawaySheet, PacketCard, TransferCard, TransferSheet } from "./Money";
import { whileVisible } from "./perf";
import { initials } from "./PostCard";
import { groupAdd, groupLeave, groupLink, groupMembers, groupUpdate, type GroupMember } from "./live/groupData";
import { chatMediaUrl, clock, deleteMessage, dmMessages, dmSet, dmThread, groupMessages, myGroups, sendMessage, uploadChatMedia, type ChatMsg, type ChatPerson, type GroupRow, type MsgKind, type Scope } from "./live/chatData";
import { useApp, type Person } from "./store";
import { Avatar, Sheet, Toggle } from "./ui";

const fmtSize = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);
const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();
function stamp(t: string) {
  const d = new Date(t), now = new Date();
  if (d.toDateString() === now.toDateString()) return clock(t);
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })} ${clock(t)}`;
}

/** A photo shrunk for chat (max 1600px, JPEG). */
async function shrink(f: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b ?? f), "image/jpeg", 0.85));
  } catch { return f; }
}

function useMediaUrl(path?: string) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let on = true; if (path) void chatMediaUrl(path).then((u) => { if (on) setUrl(u); }); return () => { on = false; }; }, [path]);
  return url;
}

function ChatImage({ path }: { path: string }) {
  const { openFile } = useApp();
  const url = useMediaUrl(path);
  return (
    <button onClick={() => url && openFile({ name: "Photo.jpg", url })} className="block overflow-hidden rounded-xl bg-[var(--paper-dim)]" aria-label="Open photo">
      {url ? <img src={url} alt="Photo" className="block max-h-64 max-w-[220px] object-cover" /> : <div className="flex h-40 w-40 items-center justify-center text-[12px] text-[var(--dim)]">Loading...</div>}
    </button>
  );
}

function VoiceNote({ path, seconds, mine }: { path: string; seconds: number; mine: boolean }) {
  const url = useMediaUrl(path);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  function toggle() {
    if (!url) return;
    if (!audio.current) { audio.current = new Audio(url); audio.current.onended = () => setPlaying(false); }
    if (playing) { audio.current.pause(); setPlaying(false); } else { void audio.current.play(); setPlaying(true); }
  }
  useEffect(() => () => audio.current?.pause(), []);
  return (
    <button onClick={toggle} className={`flex items-center gap-2 py-0.5 ${mine ? "flex-row-reverse" : ""}`} style={{ minWidth: Math.min(200, 70 + seconds * 4) }} aria-label="Play voice note">
      <AudioLines size={18} className={playing ? "animate-pulse" : ""} /><span className="text-[13px]">{Math.max(1, Math.round(seconds))}&quot;</span>
    </button>
  );
}

function ChatFile({ path, name, size }: { path: string; name: string; size?: number }) {
  const { openFile, flash } = useApp();
  return (
    <button onClick={async () => { const u = await chatMediaUrl(path); if (u) openFile({ name, url: u }); else flash("Couldn't open the file"); }} className="flex w-[220px] items-center gap-3 text-left">
      <div className="min-w-0 flex-1"><div className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{name}</div>{size ? <div className="text-[11px] text-[var(--dim)]">{fmtSize(size)}</div> : null}</div>
      <FileText size={30} className="shrink-0 text-[var(--uni)]" />
    </button>
  );
}

type Props = { scope: Scope; id: string; onBack: () => void };
type Tool = "album" | "camera" | "voice" | "files" | "location" | "contact" | "transfer" | "course" | "giveaway";
const TOOLS: { id: Tool; label: string; Icon: typeof Copy; dmOnly?: boolean }[] = [
  { id: "album", label: "Album", Icon: ImageIcon }, { id: "camera", label: "Camera", Icon: Camera }, { id: "voice", label: "Voice input", Icon: Mic },
  { id: "files", label: "Files", Icon: FileText }, { id: "location", label: "Location", Icon: MapPin }, { id: "contact", label: "Contact card", Icon: Contact },
  { id: "transfer", label: "Transfer", Icon: Wallet, dmOnly: true }, { id: "course", label: "Course", Icon: BookOpen, dmOnly: true }, { id: "giveaway", label: "Giveaway", Icon: Gift },
];

export default function ChatRoom({ scope, id, onBack }: Props) {
  const { flash, setOverlay, openDm, phone, setWalletOpen } = useApp();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [other, setOther] = useState<ChatPerson | null>(null);
  const [dmState, setDmState] = useState<{ pinned: boolean; muted: boolean }>({ pinned: false, muted: false });
  const [group, setGroup] = useState<GroupRow | null>(null);
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState<ChatMsg | null>(null);
  const [voice, setVoice] = useState(false);
  const [plus, setPlus] = useState(false);
  const [menuFor, setMenuFor] = useState<ChatMsg | null>(null);
  const [info, setInfo] = useState(false);
  const [sheet, setSheet] = useState<null | "transfer" | "giveaway" | "course" | "contact">(null);
  const [openGift, setOpenGift] = useState<string | null>(null);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [more, setMore] = useState(true);
  const list = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const album = useRef<HTMLInputElement>(null), camera = useRef<HTMLInputElement>(null), fileIn = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const m = scope === "dm" ? await dmMessages(id) : await groupMessages(id);
    setMsgs((prev) => {
      // keep earlier pages already loaded
      const older = prev.filter((x) => m.length && x.created_at < m[0].created_at);
      return [...older, ...m];
    });
    setLoaded(true);
  }, [scope, id]);
  const loadHead = useCallback(async () => {
    if (scope === "dm") { const r = await dmThread(id); if (r.data) { setOther(r.data.other); setDmState({ pinned: r.data.pinned, muted: r.data.muted }); } }
    else { const gs = await myGroups(); setGroup(gs.find((g) => g.id === id) ?? null); }
  }, [scope, id]);
  useEffect(() => {
    void Promise.resolve().then(() => { void load(); void loadHead(); });
    const t = setInterval(whileVisible(() => void load()), 4000);
    return () => clearInterval(t);
  }, [load, loadHead]);
  useEffect(() => { if (nearBottom.current) list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [msgs.length]);

  async function earlier() {
    if (!msgs.length) return;
    const first = msgs[0].created_at;
    const m = scope === "dm" ? await dmMessages(id, first) : await groupMessages(id, first);
    if (m.length < 60) setMore(false);
    nearBottom.current = false;
    setMsgs((prev) => [...m.filter((x) => !prev.some((p) => p.id === x.id)), ...prev]);
  }

  async function post(kind: MsgKind, body: string, meta: Record<string, unknown> = {}) {
    nearBottom.current = true;
    const r = await sendMessage(scope, id, kind, body, meta, reply?.id);
    if (r.error) { flash(r.error === "slow_down" ? "You're sending too fast. Wait a moment." : r.error === "not_member" ? "You're not in this chat anymore" : "Couldn't send"); return false; }
    setReply(null);
    if (r.data) setMsgs((p) => (p.some((x) => x.id === r.data!.id) ? p : [...p, r.data!]));
    return true;
  }
  async function sendText() {
    const t = draft.trim(); if (!t) return;
    setDraft("");
    if (!(await post("text", t))) setDraft(t);
  }
  async function sendFiles(files: FileList | null, kind: "image" | "file") {
    if (!files?.length) return;
    setPlus(false);
    for (const f of Array.from(files).slice(0, 9)) {
      setBusy(kind === "image" ? "Sending photo..." : `Sending ${f.name}...`);
      const isImg = kind === "image" || f.type.startsWith("image/");
      const blob = isImg ? await shrink(f) : f;
      const name = isImg ? f.name.replace(/\.[^.]+$/, "") + ".jpg" : f.name;
      const up = await uploadChatMedia(scope, id, blob, name);
      if (up.error || !up.path) { flash(up.error ?? "Couldn't send"); continue; }
      await post(isImg ? "image" : "file", "", isImg ? { path: up.path } : { path: up.path, name: f.name, size: f.size, mime: f.type });
    }
    setBusy(null);
  }
  function runTool(t: Tool) {
    if (t === "album") album.current?.click();
    else if (t === "camera") camera.current?.click();
    else if (t === "files") fileIn.current?.click();
    else if (t === "voice") dictate();
    else if (t === "location") shareLocation();
    else { setPlus(false); setSheet(t); }
  }
  function shareLocation() {
    setPlus(false);
    if (!navigator.geolocation) { flash("Location isn't available on this phone"); return; }
    setBusy("Finding you...");
    navigator.geolocation.getCurrentPosition(
      (p) => { setBusy(null); void post("location", "", { lat: Number(p.coords.latitude.toFixed(5)), lng: Number(p.coords.longitude.toFixed(5)) }); },
      () => { setBusy(null); flash("Couldn't get your location. Allow it in your browser settings."); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }
  function dictate() {
    setPlus(false);
    type SR = { start: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; lang: string };
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) { flash("Voice typing isn't supported in this browser"); return; }
    const r = new Ctor(); r.lang = "en-NG";
    r.onresult = (e) => setDraft((d) => (d ? d + " " : "") + e.results[0][0].transcript);
    r.onend = () => setBusy(null); r.onerror = () => { setBusy(null); flash("Couldn't hear you"); };
    setBusy("Listening..."); r.start();
  }

  // ---------- hold to talk
  const rec = useRef<{ mr: MediaRecorder; chunks: Blob[]; start: number; cancel: boolean } | null>(null);
  const [recording, setRecording] = useState<null | "rec" | "cancel">(null);
  async function startRec(startedAt: number) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const r = { mr, chunks: [] as Blob[], start: startedAt, cancel: false };
      mr.ondataavailable = (e) => { if (e.data.size) r.chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const secs = (performance.now() - r.start) / 1000;
        if (r.cancel || secs < 0.8) { if (!r.cancel) flash("Hold a little longer to record"); return; }
        const type = mr.mimeType || "audio/webm";
        const blob = new Blob(r.chunks, { type });
        setBusy("Sending voice note...");
        const up = await uploadChatMedia(scope, id, blob, `voice.${type.includes("mp4") ? "m4a" : "webm"}`);
        setBusy(null);
        if (up.path) void post("voice", "", { path: up.path, seconds: Math.round(secs), mime: type }); else flash(up.error ?? "Couldn't send");
      };
      rec.current = r; mr.start(); setRecording("rec");
      setTimeout(() => { if (rec.current === r && mr.state === "recording") mr.stop(); }, 60_000);
    } catch { flash("Birdie needs your microphone for voice notes"); }
  }
  function stopRec(cancel: boolean) {
    const r = rec.current; rec.current = null; setRecording(null);
    if (!r) return;
    r.cancel = cancel;
    if (r.mr.state === "recording") r.mr.stop();
  }

  // ---------- long press
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdProps = (m: ChatMsg) => ({
    onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); setMenuFor(m); },
    onTouchStart: () => { press.current = setTimeout(() => setMenuFor(m), 480); },
    onTouchEnd: () => { if (press.current) clearTimeout(press.current); },
    onTouchMove: () => { if (press.current) clearTimeout(press.current); },
  });
  async function del(m: ChatMsg, everyone: boolean) {
    setMenuFor(null);
    const r = await deleteMessage(scope, m.id, everyone);
    if (r.error) { flash(everyone ? "You can only unsend your own messages within 10 minutes" : "Couldn't delete"); return; }
    if (everyone) setMsgs((p) => p.map((x) => (x.id === m.id ? { ...x, kind: "recalled", body: "", meta: {} } : x)));
    else setMsgs((p) => p.filter((x) => x.id !== m.id));
  }

  const title = scope === "dm" ? other?.name ?? "" : group ? `${group.name} (${group.members})` : "Group";
  const isGroupAdmin = group?.role === "owner" || group?.role === "admin";
  // The server only allows unsending your own message within 10 minutes (admins: any message in their group).
  const canUnsend = (m: ChatMsg) => !["transfer", "packet", "recalled"].includes(m.kind) && (m.mine || (scope === "group" && isGroupAdmin));

  function bubble(m: ChatMsg): ReactNode {
    const meta = m.meta as Record<string, unknown>;
    switch (m.kind) {
      case "image": return <ChatImage path={String(meta.path)} />;
      case "voice": return <VoiceNote path={String(meta.path)} seconds={Number(meta.seconds ?? 1)} mine={m.mine} />;
      case "file": return <ChatFile path={String(meta.path)} name={String(meta.name ?? "File")} size={Number(meta.size ?? 0)} />;
      case "location": return (
        <a href={`https://maps.google.com/?q=${meta.lat},${meta.lng}`} target="_blank" rel="noreferrer" className="flex w-[210px] items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E5484D] text-white"><MapPin size={20} /></span>
          <span className="min-w-0"><span className="block text-[13.5px] font-semibold">Shared location</span><span className="block text-[11.5px] text-[var(--dim)]">Open in Maps</span></span>
        </a>
      );
      case "contact": return (
        <button onClick={() => meta.id && void openDm(String(meta.id))} className="w-[210px] text-left">
          <div className="flex items-center gap-2.5"><Avatar initials={initials(String(meta.name ?? "?"))} color={String(meta.color ?? "#7C4DDB")} size={38} /><div className="min-w-0"><div className="truncate text-[14px] font-semibold">{String(meta.name ?? "")}</div>{meta.handle ? <div className="truncate text-[11.5px] text-[var(--dim)]">@{String(meta.handle)}</div> : null}</div></div>
          <div className="mt-2 border-t border-[var(--line)] pt-1 text-[11px] text-[var(--dim)]">Contact card · tap to message</div>
        </button>
      );
      case "course": return (
        <a href={`/course/${String(meta.course_id ?? "")}`} className="flex w-[220px] items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--study)] text-white"><BookOpen size={20} /></span>
          <span className="min-w-0"><span className="block truncate text-[13.5px] font-semibold">{String(meta.title ?? "Course")}</span><span className="block text-[11.5px] text-[var(--dim)]">{meta.role === "edit" ? "Shared with you · you can add notes" : "Shared with you · tap to open"}</span></span>
        </a>
      );
      default: return <Linkified text={m.body} />;
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--paper)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line)] px-3 pb-2.5 pt-2">
        <button onClick={onBack} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-xl active:bg-[var(--paper-dim)]"><ArrowLeft size={19} /></button>
        <button onClick={() => (scope === "dm" && other ? setOverlay({ t: "profile", id: other.id }) : setInfo(true))} className="min-w-0 flex-1 text-center">
          <div className="truncate text-[15.5px] font-bold">{title}</div>
          {scope === "dm" && dmState.muted && <div className="text-[10.5px] text-[var(--dim)]">Muted</div>}
        </button>
        <button onClick={() => setInfo(true)} aria-label="Chat info" className="flex h-9 w-9 items-center justify-center rounded-xl active:bg-[var(--paper-dim)]"><MoreHorizontal size={19} /></button>
      </div>

      <div ref={list} onScroll={(e) => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }} className="no-scrollbar min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-[#EFE8F4] px-3 py-3">
        {loaded && more && msgs.length >= 60 && <button onClick={() => void earlier()} className="mx-auto block rounded-full bg-white/70 px-3 py-1 text-[12px] font-semibold text-[var(--dim)]">Load earlier messages</button>}
        {loaded && msgs.length === 0 && <div className="pt-16 text-center text-[13px] text-[var(--dim)]">{scope === "dm" ? `Say hi to ${other?.name.split(" ")[0] ?? "them"}.` : "Say hi to the group."}</div>}
        {msgs.map((m, i) => {
          const prev = msgs[i - 1];
          const showTime = !prev || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60_000 || !sameDay(m.created_at, prev.created_at);
          const time = showTime ? <div className="py-1 text-center text-[11px] text-[#8a7fa0]">{stamp(m.created_at)}</div> : null;
          if (m.system) return <div key={m.id}>{time}<div className="mx-auto w-fit rounded-full bg-[#ddd2e8] px-3 py-1 text-[11.5px] text-[#5b4b70]">{m.body}</div></div>;
          if (m.kind === "recalled") return <div key={m.id}>{time}<div className="text-center text-[11.5px] text-[#8a7fa0]">{m.mine ? "You unsent a message" : `${scope === "group" ? m.name : other?.name.split(" ")[0] ?? "They"} unsent a message`}</div></div>;
          const card = m.kind === "transfer" || m.kind === "packet";
          const who = scope === "group" ? { name: m.name ?? "", color: m.color ?? "#7C4DDB" } : { name: other?.name ?? "", color: other?.color ?? "#7C4DDB" };
          return (
            <div key={m.id}>
              {time}
              <div className={`flex items-start gap-2 ${m.mine ? "flex-row-reverse" : ""}`}>
                {!m.mine && <button onClick={() => m.sender_id && setOverlay({ t: "profile", id: m.sender_id })} aria-label={who.name}><Avatar initials={initials(who.name || "?")} color={who.color} size={36} /></button>}
                <div className={`flex min-w-0 max-w-[76%] flex-col ${m.mine ? "items-end" : "items-start"}`}>
                  {scope === "group" && !m.mine && <div className="mb-0.5 pl-1 text-[11.5px] text-[#7a6f8c]">{m.name}</div>}
                  <div {...holdProps(m)} className="select-none">
                    {card ? (m.kind === "transfer" ? <TransferCard msg={m} otherName={other?.name ?? ""} /> : <PacketCard msg={m} opened={opened.has(String((m.meta as { giveaway_id?: string }).giveaway_id))} onOpen={() => setOpenGift(String((m.meta as { giveaway_id?: string }).giveaway_id))} />) : (
                      <div className={`rounded-2xl px-3 py-2 text-[14.5px] leading-snug shadow-sm ${m.kind === "image" ? "bg-transparent p-0 shadow-none" : m.mine ? "rounded-tr-md bg-[#D9B8EC]" : "rounded-tl-md bg-white"}`}>{bubble(m)}</div>
                    )}
                  </div>
                  {m.reply && <div className="mt-1 max-w-full truncate rounded-lg bg-[#e3d9ec] px-2.5 py-1 text-[11.5px] text-[#5b4b70]">{m.reply.mine ? "You" : m.reply.name ?? other?.name.split(" ")[0]}: {m.reply.text}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {busy && <div className="shrink-0 bg-[var(--paper-dim)] px-4 py-1.5 text-center text-[12px] font-semibold text-[var(--dim)]">{busy}</div>}
      {reply && (
        <div className="flex shrink-0 items-center gap-2 border-t border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-[12.5px] text-[var(--dim)]">
          <CornerUpLeft size={14} /><span className="min-w-0 flex-1 truncate">Replying to {reply.mine ? "yourself" : reply.name ?? other?.name}: {reply.kind === "text" ? reply.body : `[${reply.kind}]`}</span>
          <button onClick={() => setReply(null)} aria-label="Cancel reply"><X size={15} /></button>
        </div>
      )}
      <div className="flex shrink-0 items-end gap-2 border-t border-[var(--line)] bg-[var(--paper)] px-3 pb-3 pt-2.5">
        <button onClick={() => { setVoice((v) => !v); setPlus(false); }} aria-label={voice ? "Keyboard" : "Voice note"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--line)] text-[var(--text)] active:scale-90">{voice ? <Keyboard size={18} /> : <Mic size={18} />}</button>
        {voice ? (
          <button
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); void startRec(e.timeStamp); }}
            onPointerMove={(e) => { if (!rec.current) return; const r = e.currentTarget.getBoundingClientRect(); setRecording(e.clientY < r.top - 50 ? "cancel" : "rec"); }}
            onPointerUp={(e) => { const r = e.currentTarget.getBoundingClientRect(); stopRec(e.clientY < r.top - 50); }}
            onPointerCancel={() => stopRec(true)}
            className={`h-10 min-w-0 flex-1 touch-none select-none rounded-xl text-[14px] font-semibold transition ${recording ? "bg-[var(--line)]" : "bg-[var(--paper-dim)]"}`}>
            {recording === "cancel" ? "Release to cancel" : recording ? "Release to send · slide up to cancel" : "Hold to talk"}
          </button>
        ) : (
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onFocus={() => setPlus(false)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendText(); } }} rows={1} placeholder="Message"
            className="max-h-28 min-h-10 min-w-0 flex-1 resize-none rounded-xl bg-[var(--paper-dim)] px-3.5 py-2.5 text-[14.5px] leading-snug outline-none" />
        )}
        {draft.trim() && !voice
          ? <button onClick={() => void sendText()} aria-label="Send" className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-[var(--uni)] px-3.5 text-[14px] font-semibold text-white active:scale-95"><Send size={16} /></button>
          : <button onClick={() => setPlus((p) => !p)} aria-label="More" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--line)] transition active:scale-90 ${plus ? "rotate-45" : ""}`}><Plus size={19} /></button>}
      </div>
      <AnimatePresence>
        {plus && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="shrink-0 overflow-hidden bg-[var(--paper)]">
            <div className="grid grid-cols-4 gap-y-4 px-4 pb-6 pt-2">
              {TOOLS.filter((t) => scope === "dm" || !t.dmOnly).map(({ id: tool, label, Icon }) => (
                <button key={tool} onClick={() => runTool(tool)} className="flex flex-col items-center gap-1.5 text-[11.5px] text-[var(--dim)]">
                  <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tool === "giveaway" ? "bg-[#FDE3E3] text-[#E5484D]" : tool === "transfer" ? "bg-[#FDEBD5] text-[#C9711A]" : "bg-[var(--paper-dim)] text-[var(--text)]"}`}><Icon size={22} /></span>{label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <input ref={album} type="file" accept="image/*" multiple hidden onChange={(e) => { void sendFiles(e.target.files, "image"); e.target.value = ""; }} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void sendFiles(e.target.files, "image"); e.target.value = ""; }} />
      <input ref={fileIn} type="file" multiple hidden onChange={(e) => { void sendFiles(e.target.files, "file"); e.target.value = ""; }} />

      {/* long-press menu */}
      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)}>
        {menuFor && (
          <div className="grid grid-cols-4 gap-2 pb-2">
            {menuFor.kind === "text" && <MenuBtn Icon={Copy} label="Copy" onClick={() => { void navigator.clipboard?.writeText(menuFor.body); setMenuFor(null); flash("Copied"); }} />}
            {menuFor.kind !== "packet" && menuFor.kind !== "transfer" && <MenuBtn Icon={CornerUpLeft} label="Reply" onClick={() => { setReply(menuFor); setMenuFor(null); setVoice(false); }} />}
            {menuFor.kind === "packet" && <MenuBtn Icon={Gift} label="Open" onClick={() => { setOpenGift(String((menuFor.meta as { giveaway_id?: string }).giveaway_id)); setMenuFor(null); }} />}
            {menuFor.kind === "transfer" && <MenuBtn Icon={Wallet} label="Wallet" onClick={() => { setMenuFor(null); setWalletOpen(true); }} />}
            <MenuBtn Icon={Trash2} label="Delete" onClick={() => void del(menuFor, false)} />
            {canUnsend(menuFor) && <MenuBtn Icon={Undo2} label={menuFor.mine ? "Unsend" : "Remove"} onClick={() => void del(menuFor, true)} />}
          </div>
        )}
      </Sheet>

      {scope === "dm" && other && <TransferSheet open={sheet === "transfer"} onClose={() => setSheet(null)} thread={id} to={other} onSent={(m) => setMsgs((p) => [...p, m])} />}
      <GiveawaySheet open={sheet === "giveaway"} onClose={() => setSheet(null)} scope={scope} target={id} members={group?.members} onSent={(m) => setMsgs((p) => [...p, m])} />
      <GiveawayOpen id={openGift} onClose={() => setOpenGift(null)} onOpened={(g) => setOpened((s) => (s.has(g) ? s : new Set(s).add(g)))} />
      {scope === "dm" && other && <CourseShareSheet open={sheet === "course"} onClose={() => setSheet(null)} to={{ grantee: other.id }} who={other.name.split(" ")[0]}
        onShared={(c, role) => void post("course", "", { course_id: c.id, title: `${c.code} · ${c.name}`, role })} />}
      <ContactPicker open={sheet === "contact"} onClose={() => setSheet(null)} onPick={(p) => { setSheet(null); void post("contact", "", { id: p.id, name: p.name, handle: p.handle, color: p.color }); }} />

      {phone && <ChatInfo open={info} onClose={() => setInfo(false)} scope={scope} id={id} other={other} dmState={dmState} group={group}
        onChanged={() => void loadHead()} onCleared={() => { setMsgs([]); setInfo(false); }} onLeft={() => { setInfo(false); onBack(); }} />}
    </div>
  );
}

function MenuBtn({ Icon, label, onClick }: { Icon: typeof Copy; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-2xl bg-[var(--paper-dim)] py-3 text-[12px] font-semibold active:scale-95"><Icon size={19} />{label}</button>;
}

function ContactPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (p: Person) => void }) {
  const { findPeople } = useApp();
  const [q, setQ] = useState(""); const [found, setFound] = useState<Person[]>([]);
  useEffect(() => { if (q.trim().length < 2) return; const t = setTimeout(() => void findPeople(q.trim().replace(/^@/, "")).then(setFound), 300); return () => clearTimeout(t); }, [q, findPeople]);
  return (
    <Sheet open={open} onClose={onClose} title="Share a contact">
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} autoCapitalize="none" placeholder="Search by name or @username" className="mb-3 w-full rounded-xl bg-[var(--paper-dim)] px-3.5 py-3 text-[14px] outline-none" />
      <div className="max-h-[45vh] space-y-1 overflow-y-auto">{q.trim().length >= 2 && found.map((p) => (
        <button key={p.id} onClick={() => onPick(p)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left active:bg-[var(--paper-dim)]"><Avatar initials={initials(p.name)} color={p.color} size={36} /><span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{p.name} <span className="font-normal text-[var(--dim)]">@{p.handle}</span></span></button>
      ))}</div>
    </Sheet>
  );
}

/** "..." in a chat: WeChat's Chat Info. Members, invite link, mute, pin, clear, leave. */
function ChatInfo({ open, onClose, scope, id, other, dmState, group, onChanged, onCleared, onLeft }: {
  open: boolean; onClose: () => void; scope: Scope; id: string; other: ChatPerson | null; dmState: { pinned: boolean; muted: boolean }; group: GroupRow | null;
  onChanged: () => void; onCleared: () => void; onLeft: () => void;
}) {
  const { flash, setOverlay, findPeople } = useApp();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [q, setQ] = useState(""); const [found, setFound] = useState<Person[]>([]);
  const [all, setAll] = useState(false);
  useEffect(() => { if (open && scope === "group") void groupMembers(id).then(setMembers); }, [open, scope, id]);
  useEffect(() => { if (q.trim().length < 2) return; const t = setTimeout(() => void findPeople(q).then(setFound), 300); return () => clearTimeout(t); }, [q, findPeople]);
  const isAdmin = group?.role === "owner" || group?.role === "admin";
  async function share() {
    if (!group?.invite_code) return;
    const url = groupLink(group.invite_code), text = `Join "${group.name}" on Birdie`;
    try { if (navigator.share) await navigator.share({ title: group.name, text, url }); else { await navigator.clipboard.writeText(`${text}: ${url}`); flash("Invite link copied"); } } catch { /* cancelled */ }
  }
  return (
    <Sheet open={open} onClose={onClose} title={scope === "dm" ? "Chat info" : `Chat info (${group?.members ?? members.length})`}>
      <div className="space-y-3">
        {scope === "dm" && other && (
          <button onClick={() => { onClose(); setOverlay({ t: "profile", id: other.id }); }} className="flex items-center gap-3 text-left"><Avatar initials={initials(other.name)} color={other.color} size={52} /><div><div className="text-[16px] font-bold">{other.name}</div>{other.handle && <div className="text-[12.5px] text-[var(--dim)]">@{other.handle}</div>}</div></button>
        )}
        {scope === "group" && (
          <>
            <div className="grid grid-cols-5 gap-2">
              {(all ? members : members.slice(0, 14)).map((m) => (
                <button key={m.user_id} onClick={() => { onClose(); setOverlay({ t: "profile", id: m.user_id }); }} className="flex flex-col items-center gap-1"><Avatar initials={initials(m.name)} color={m.color} size={44} /><span className="w-full truncate text-center text-[10.5px] text-[var(--dim)]">{m.name.split(" ")[0]}</span></button>
              ))}
            </div>
            {members.length > 14 && !all && <button onClick={() => setAll(true)} className="w-full text-center text-[12.5px] font-semibold text-[var(--dim)]">View all members</button>}
            {group?.about && <p className="rounded-xl bg-[var(--paper-dim)] p-3 text-[13px] text-[var(--dim)]"><b className="text-[var(--text)]">Group notice:</b> {group.about}</p>}
            {group?.invite_code && <button onClick={() => void share()} className="flex w-full items-center gap-2 rounded-xl bg-[var(--paper-dim)] px-3 py-3 text-[13.5px] font-semibold"><Link2 size={15} /> Share invite link</button>}
            {isAdmin && (
              <div>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add someone by username" className="w-full rounded-xl bg-[var(--paper-dim)] px-3 py-2.5 text-[13.5px] outline-none" />
                {q.trim().length >= 2 && found.slice(0, 5).map((p) => (
                  <button key={p.id} onClick={async () => { const err = await groupAdd(id, p.id); flash(err ? "Couldn't add them" : `${p.name.split(" ")[0]} added`); setQ(""); void groupMembers(id).then(setMembers); onChanged(); }} className="mt-1.5 flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-[13.5px] active:bg-[var(--paper-dim)]"><Avatar initials={initials(p.name)} color={p.color} size={28} /><span className="min-w-0 flex-1 truncate">{p.name} <span className="text-[var(--dim)]">@{p.handle}</span></span><UserPlus size={14} /></button>
                ))}
                <div className="mt-2 space-y-1">{members.filter((m) => m.role === "member").slice(0, all ? 500 : 6).map((m) => (
                  <div key={m.user_id} className="flex items-center gap-2 text-[12.5px]"><span className="min-w-0 flex-1 truncate">{m.name}</span>
                    <button onClick={async () => { await groupUpdate(id, { admin: m.user_id }); void groupMembers(id).then(setMembers); }} className="flex items-center gap-1 font-semibold text-[var(--dim)]"><Shield size={11} /> Make admin</button>
                    <button onClick={async () => { await groupLeave(id, m.user_id); void groupMembers(id).then(setMembers); onChanged(); }} className="font-semibold text-[var(--help)]">Remove</button></div>
                ))}</div>
              </div>
            )}
          </>
        )}
        <div className="rounded-2xl border border-[var(--line)] bg-white px-3.5">
          {scope === "dm"
            ? <><Toggle on={dmState.pinned} onChange={async (v) => { await dmSet(id, { pinned: v }); onChanged(); }} label="Sticky on top" />
              <Toggle on={dmState.muted} onChange={async (v) => { await dmSet(id, { muted: v }); onChanged(); }} label="Mute notifications" /></>
            : <Toggle on={!!group?.muted} onChange={async (v) => { await groupUpdate(id, { muted: v }); onChanged(); }} label="Mute notifications" />}
        </div>
        {scope === "dm" && <button onClick={async () => { if (!confirm("Clear this chat? It's only cleared for you.")) return; await dmSet(id, { clear: true }); onCleared(); flash("Chat cleared"); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold"><Trash2 size={15} /> Clear chat history</button>}
        {scope === "group" && group?.role !== "owner" && <button onClick={async () => { if (!confirm("Leave this group?")) return; await groupLeave(id); onLeft(); flash("You left the group"); }} className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-[var(--help)]"><LogOut size={15} /> Leave</button>}
        {scope === "dm" && dmState.muted && <div className="flex items-center gap-1.5 text-[12px] text-[var(--dim)]"><BellOff size={13} /> You won&apos;t get notifications from this chat.</div>}
        {scope === "dm" && dmState.pinned && <div className="flex items-center gap-1.5 text-[12px] text-[var(--dim)]"><Pin size={13} /> Pinned to the top of Chats.</div>}
      </div>
    </Sheet>
  );
}
