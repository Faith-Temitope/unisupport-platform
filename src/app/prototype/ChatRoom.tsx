"use client";

// One conversation, laid out like WeChat: square avatars on both sides, bubbles with tails, the
// [voice] [input] [emoji] [+] bar, the emoji/sticker panel, the two-page + panel, and the dark
// long-press menu (Copy, Forward, Favorite, Delete, Quote, Unsend, Translate, Search).
import { useBackLayer } from "./nav";
import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, BellOff, BookOpen, Camera, Contact, Copy, CornerUpLeft, FileText, Forward, Gift, Image as ImageIcon, Languages, MapPin, Mic, Plus, Search, Smile, Sparkles, Star, Trash2, Undo2, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { askAI } from "./aiClient";
import ChatInfo, { chatBackground, clearedAt, showNames } from "./ChatInfo";
import { CourseShareSheet } from "./CourseShare";
import { Linkified } from "./Linkified";
import { Rich } from "./Rich";
import { groupMembers, type GroupMember } from "./live/groupData";
import { GiveawayOpen, GiveawaySheet, PacketCard, TransferCard, TransferSheet } from "./Money";
import { whileVisible } from "./perf";
import { chatMediaUrl, clock, deleteMessage, dmMessages, dmThread, forwardMedia, groupMessages, myDms, myGroups, sendMessage, uploadChatMedia, uploadSticker, type ChatMsg, type ChatPerson, type GroupRow, type MsgKind, type Scope } from "./live/chatData";
import { useApp, type Person } from "./store";
import { Sheet } from "./ui";
import { EmojiCircle, GridAvatar, KeyboardCircle, MoreBtn, PlusCircle, SqAvatar, VoiceCircle, WeHeader } from "./we";

const fmtSize = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);
const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();
function stamp(t: string) {
  const d = new Date(t), now = new Date();
  if (d.toDateString() === now.toDateString()) return clock(t);
  const y = new Date(now.getTime() - 86_400_000);
  if (d.toDateString() === y.toDateString()) return `Yesterday ${clock(t)}`;
  return `${d.toLocaleDateString([], { month: "numeric", day: "numeric", year: "2-digit" })} ${clock(t)}`;
}
const DICE = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const RPS: Record<string, string> = { rock: "✊", paper: "✋", scissors: "✌️" };
const EMOJIS = "😀 😂 🤣 😊 😍 😘 😎 🤩 🥳 😇 🙂 😉 😌 😋 😜 🤪 🤔 🤨 😐 😑 😶 🙄 😏 😬 😴 🤤 😪 😵 🤯 🥵 🥶 😱 😭 😢 😤 😡 🤬 🥺 😳 🤗 🤭 🤫 🙏 👍 👎 👏 🙌 💪 🤝 👌 ✌️ 🤞 👀 💯 🔥 ✨ 🎉 ❤️ 💔 💜 💙 💚 💛 🧡 🤍 🖤 ⭐ 🌹 🌸 🍕 🍔 🍟 🍚 🥤 ☕ 📚 ✏️ 📝 🎓 💻 📱 💸 💰 🎁 ⏰ 🙈 🙉 🙊 🐐 🦅 🐦".split(" ");

/** WeChat's favourites, kept on this phone. */
export interface Fav { id: string; kind: MsgKind; body: string; meta: Record<string, unknown>; from: string; at: string }
export const readFavs = (): Fav[] => { try { return JSON.parse(localStorage.getItem("birdie-favorites") ?? "[]"); } catch { return []; } };
export const writeFavs = (f: Fav[]) => { try { localStorage.setItem("birdie-favorites", JSON.stringify(f.slice(0, 300))); } catch { /* full */ } };
const readStickers = (): string[] => { try { return JSON.parse(localStorage.getItem("birdie-stickers") ?? "[]"); } catch { return []; } };

/** A photo shrunk for chat (max 1600px, JPEG). */
export async function shrink(f: Blob, max = 1600, type = "image/jpeg"): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b ?? f), type, 0.85));
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
    <button onClick={() => url && openFile({ name: "Photo.jpg", url })} className="block overflow-hidden rounded-[4px] bg-[var(--we-sep)]" aria-label="Open photo">
      {url ? <img src={url} alt="Photo" className="block max-h-56 max-w-[170px] object-cover" /> : <div className="h-32 w-28" />}
    </button>
  );
}
function StickerImg({ path }: { path: string }) {
  const url = useMediaUrl(path);
  return url ? <img src={url} alt="Sticker" className="block h-[120px] w-[120px] object-contain" /> : <div className="h-[120px] w-[120px]" />;
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
    <button onClick={toggle} className={`flex items-center gap-2 ${mine ? "flex-row-reverse" : ""}`} style={{ width: Math.min(190, 60 + seconds * 3) }} aria-label="Play voice message">
      <AudioLines size={18} className={`${playing ? "animate-pulse" : ""} ${mine ? "-scale-x-100" : ""}`} /><span className={`flex-1 text-[15px] ${mine ? "text-right" : ""}`}>{Math.max(1, Math.round(seconds))}&quot;</span>
    </button>
  );
}
function ChatFile({ path, name, size }: { path: string; name: string; size?: number }) {
  const { openFile, flash } = useApp();
  return (
    <button onClick={async () => { const u = await chatMediaUrl(path); if (u) openFile({ name, url: u }); else flash("Couldn't open the file"); }} className="flex w-[210px] items-start gap-3 text-left">
      <div className="min-w-0 flex-1"><div className="line-clamp-2 text-[15px] leading-snug">{name}</div>{size ? <div className="mt-1 text-[12px] text-[var(--we-sub)]">{fmtSize(size)}</div> : null}</div>
      <FileText size={36} strokeWidth={1.4} className="shrink-0 text-[#3D83F7]" />
    </button>
  );
}

type Props = { scope: Scope; id: string; onBack: () => void; onOpenCourse?: (sharedId: string) => void };
type Panel = null | "emoji" | "plus";
type Pop = { m: ChatMsg; x: number; y: number; above: boolean };

export default function ChatRoom({ scope, id, onBack, onOpenCourse }: Props) {
  const { flash, setOverlay, openDm, setWalletOpen, profile, goBirdie, chatBadge, courses, settings, auth } = useApp();
  const meName = profile.name || "Me";
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [other, setOther] = useState<ChatPerson | null>(null);
  const [dmState, setDmState] = useState({ pinned: false, muted: false });
  const [group, setGroup] = useState<GroupRow | null>(null);
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState<ChatMsg | null>(null);
  const [voice, setVoice] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const [info, setInfo] = useState(false);
  const [sheet, setSheet] = useState<null | "transfer" | "giveaway" | "course" | "contact" | "favorites">(null);
  const [forwarding, setForwarding] = useState<ChatMsg | null>(null);
  const [openGift, setOpenGift] = useState<string | null>(null);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  // @mentions: people (and @All in groups, for owners and admins) get notified; @Birdie answers,
  // either privately (only you see it, e.g. "what should I reply?") or in the chat for everyone.
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [everyone, setEveryone] = useState(false);
  const [askBirdie, setAskBirdie] = useState<null | "private" | "public">(null);
  const [priv, setPriv] = useState<Priv[]>([]);
  const privKey = `birdie-private-${scope}-${id}`;
  useEffect(() => { try { const raw = localStorage.getItem(privKey); void Promise.resolve().then(() => setPriv(raw ? JSON.parse(raw) : [])); } catch { /* ignore */ } }, [privKey]);
  const savePriv = (next: Priv[]) => { setPriv(next); try { localStorage.setItem(privKey, JSON.stringify(next.slice(-50))); } catch { /* full */ } };
  useEffect(() => { if (scope === "group") void groupMembers(id).then(setMembers); }, [scope, id]);
  useBackLayer(info, () => setInfo(false));
  useBackLayer(!!panel, () => setPanel(null));
  useBackLayer(!!pop, () => setPop(null));
  const [more, setMore] = useState(true);
  const [translated, setTranslated] = useState<Record<string, string>>({});
  const [prefsTick, setPrefsTick] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const album = useRef<HTMLInputElement>(null), camera = useRef<HTMLInputElement>(null), fileIn = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const m = scope === "dm" ? await dmMessages(id) : await groupMessages(id);
    setMsgs((prev) => [...prev.filter((x) => m.length && x.created_at < m[0].created_at), ...m]);
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
  useEffect(() => { if (nearBottom.current) list.current?.scrollTo({ top: list.current.scrollHeight }); }, [msgs.length, panel]);

  // Chat Info settings stored on this phone: background, cleared history (groups), on-screen names.
  const bg = useMemo(() => chatBackground(scope, id), [scope, id, prefsTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const cleared = useMemo(() => (scope === "group" ? clearedAt(id) : null), [scope, id, prefsTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const names = useMemo(() => scope === "group" && showNames(id), [scope, id, prefsTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = cleared ? msgs.filter((m) => m.created_at > cleared) : msgs;

  async function earlier() {
    if (!msgs.length) return;
    const first = msgs[0].created_at;
    const m = scope === "dm" ? await dmMessages(id, first) : await groupMessages(id, first);
    if (m.length < 60) setMore(false);
    nearBottom.current = false;
    setMsgs((prev) => [...m.filter((x) => !prev.some((p) => p.id === x.id)), ...prev]);
  }

  async function post(kind: MsgKind, body: string, meta: Record<string, unknown> = {}, to?: { scope: Scope; id: string }) {
    nearBottom.current = true;
    const target = to ?? { scope, id };
    const r = await sendMessage(target.scope, target.id, kind, body, meta, to ? null : reply?.id);
    if (r.error) { flash(r.error === "slow_down" ? "You're sending too fast. Wait a moment." : r.error === "not_member" ? "You're not in this chat anymore" : "Couldn't send"); return false; }
    if (!to) { setReply(null); if (r.data) setMsgs((p) => (p.some((x) => x.id === r.data!.id) ? p : [...p, r.data!])); }
    return true;
  }
  async function sendText() {
    const t = draft.trim(); if (!t) return;
    setDraft("");
    if (askBirdie && /@Birdie\b/i.test(t)) { const mode = askBirdie; setAskBirdie(null); void birdie(t, mode); return; }
    const meta: Record<string, unknown> = {};
    const ids = [...new Set(tags.filter((x) => t.includes(`@${x.name}`)).map((x) => x.id))];
    if (ids.length) meta.mentions = ids;
    if (everyone && t.includes("@All")) meta.everyone = true;
    setTags([]); setEveryone(false); setAskBirdie(null);
    if (!(await post("text", t, meta))) setDraft(t);
  }
  /** Ask Birdie inside this chat. It knows the recent messages and who you are (name, school, courses). */
  async function birdie(text: string, mode: "private" | "public") {
    const q = text.replace(/@Birdie\b/gi, "").trim() || "What should I say here?";
    const where = scope === "dm" ? `a one-to-one chat with ${other?.name ?? "a classmate"}` : `the group chat "${group?.name ?? "a group"}"`;
    const recent = shown.filter((m) => m.kind === "text").slice(-25).map((m) => `${(m.meta as { birdie?: boolean }).birdie ? "Birdie AI" : m.mine ? meName : (scope === "group" ? m.name : other?.name) ?? "Someone"}: ${m.body}`).join("\n");
    const about = [profile.name && `Name: ${profile.name}`, profile.institution && `School: ${profile.institution}`, profile.level && `Level: ${profile.level}`, profile.program && `Course of study: ${profile.program}`,
      courses.length ? `Courses: ${courses.slice(0, 15).map((c) => `${c.code} ${c.name}`).join(", ")}` : ""].filter(Boolean).join(". ");
    const system = mode === "private"
      ? `You are Birdie AI inside the Birdie student app. ${meName} is in ${where} and asked you privately: only they see your answer. Help them directly. If they want to know what to reply, give the exact message they can send, in their own voice, then nothing else. Be brief and warm. Use what you know about them where it helps. About them: ${about}.\n\nRecent messages:\n${recent}`
      : `You are Birdie AI, answering in ${where} where everyone can read your reply. ${meName} asked you. Be helpful, brief and friendly, like a smart classmate. Don't share private details about anyone. About who asked: ${about}.\n\nRecent messages:\n${recent}`;
    if (mode === "private") {
      const item: Priv = { id: Math.random().toString(36).slice(2), at: new Date().toISOString(), q, a: null };
      const next = [...priv, item]; savePriv(next);
      const r = await askAI({ brain: "spark", tier: settings.aiTier, feature: "chat", system, messages: [{ role: "user", content: q }] });
      savePriv(next.map((x) => (x.id === item.id ? { ...x, a: r.ok ? r.text.trim() : "I couldn't answer right now. Try again." } : x)));
      return;
    }
    if (!(await post("text", text))) return;
    setBusy("Birdie is answering...");
    const r = await askAI({ brain: "spark", tier: settings.aiTier, feature: "chat", system, messages: [{ role: "user", content: q }] });
    setBusy(null);
    if (!r.ok) return flash("Birdie couldn't answer right now");
    await post("text", r.text.trim().slice(0, 3900), { birdie: true, asked_by: meName });
  }
  // Typing "@" opens the picker: Birdie (private / in the chat), All, and the people in this chat.
  const atMatch = /(^|\s)@([^\s@]*)$/.exec(draft);
  const atQuery = atMatch ? atMatch[2].toLowerCase() : null;
  const canAll = scope === "group" && (group?.role === "owner" || group?.role === "admin");
  const people: { id: string; name: string; color: string }[] = scope === "group"
    ? members.filter((x) => x.user_id !== auth.userId).map((x) => ({ id: x.user_id, name: x.name, color: x.color }))
    : other ? [{ id: other.id, name: other.name, color: other.color }] : [];
  function pickMention(kind: "birdie-private" | "birdie-public" | "all" | { id: string; name: string }) {
    const name = kind === "all" ? "All" : typeof kind === "string" ? "Birdie" : kind.name;
    setDraft((d) => d.replace(/@([^\s@]*)$/, `@${name} `));
    if (kind === "birdie-private") setAskBirdie("private");
    else if (kind === "birdie-public") setAskBirdie("public");
    else if (kind === "all") setEveryone(true);
    else setTags((t) => [...t, kind]);
  }
  const mentionNames = useMemo(() => ["Birdie", "All", ...members.map((x) => x.name), ...(other ? [other.name] : []), meName].filter(Boolean).sort((a, b) => b.length - a.length), [members, other, meName]);
  const privAfter = useMemo(() => {
    const out: Record<string, Priv[]> = {};
    for (const p of priv) {
      const anchor = [...shown].reverse().find((m) => !m.system && m.kind !== "recalled" && m.created_at <= p.at);
      (out[anchor?.id ?? "__start"] ??= []).push(p);
    }
    return out;
  }, [priv, shown]);
  const renderPriv = (p: Priv) => (
    <div key={p.id} className="mt-4 flex items-start gap-2.5">
      <BirdieAvatar />
      <div className="min-w-0 max-w-[78%]">
        <div className="mb-1 text-[12px] text-[var(--we-sub)]">Birdie AI · only you can see this</div>
        <div className="rounded-[4px] border border-dashed border-[var(--we-accent)] bg-[var(--we-bubble)] px-3 py-[9px] text-[15px] leading-[1.45] text-[var(--we-text)]">
          <div className="mb-1.5 text-[12.5px] text-[var(--we-sub)]">You asked: {p.q}</div>
          {p.a === null ? <span className="text-[var(--we-sub)]">Thinking...</span> : <Rich text={p.a} />}
        </div>
        {p.a && <div className="mt-1 flex gap-4 text-[12.5px] text-[var(--we-link)]">
          <button onClick={() => { setDraft(p.a!.replace(/[*_`#>]/g, "").trim()); setPanel(null); }}>Use as reply</button>
          <button onClick={() => savePriv(priv.filter((x) => x.id !== p.id))}>Dismiss</button>
        </div>}
      </div>
    </div>
  );
  async function sendFiles(files: FileList | null, kind: "image" | "file") {
    if (!files?.length) return;
    setPanel(null);
    for (const f of Array.from(files).slice(0, 9)) {
      setBusy(kind === "image" ? "Sending photo..." : `Sending ${f.name}...`);
      const isImg = kind === "image" || f.type.startsWith("image/");
      const blob = isImg ? await shrink(f) : f;
      const up = await uploadChatMedia(scope, id, blob, isImg ? f.name.replace(/\.[^.]+$/, "") + ".jpg" : f.name);
      if (up.error || !up.path) { flash(up.error ?? "Couldn't send"); continue; }
      await post(isImg ? "image" : "file", "", isImg ? { path: up.path } : { path: up.path, name: f.name, size: f.size, mime: f.type });
    }
    setBusy(null);
  }
  function shareLocation() {
    setPanel(null);
    if (!navigator.geolocation) { flash("Location isn't available on this phone"); return; }
    setBusy("Finding you...");
    navigator.geolocation.getCurrentPosition(
      (p) => { setBusy(null); void post("location", "", { lat: Number(p.coords.latitude.toFixed(5)), lng: Number(p.coords.longitude.toFixed(5)) }); },
      () => { setBusy(null); flash("Couldn't get your location. Allow it in your browser settings."); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }
  function dictate() {
    setPanel(null);
    type SR = { start: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; lang: string };
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) { flash("Voice input isn't supported in this browser"); return; }
    const r = new Ctor(); r.lang = "en-NG";
    r.onresult = (e) => setDraft((d) => (d ? d + " " : "") + e.results[0][0].transcript);
    r.onend = () => setBusy(null); r.onerror = () => { setBusy(null); flash("Couldn't hear you"); };
    setVoice(false); setBusy("Listening..."); r.start();
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
        if (r.cancel || secs < 0.8) { if (!r.cancel) flash("Too short"); return; }
        const type = mr.mimeType || "audio/webm";
        setBusy("Sending voice message...");
        const up = await uploadChatMedia(scope, id, new Blob(r.chunks, { type }), `voice.${type.includes("mp4") ? "m4a" : "webm"}`);
        setBusy(null);
        if (up.path) void post("voice", "", { path: up.path, seconds: Math.round(secs), mime: type }); else flash(up.error ?? "Couldn't send");
      };
      rec.current = r; mr.start(); setRecording("rec");
      setTimeout(() => { if (rec.current === r && mr.state === "recording") mr.stop(); }, 60_000);
    } catch { flash("Birdie needs your microphone for voice messages"); }
  }
  function stopRec(cancel: boolean) {
    const r = rec.current; rec.current = null; setRecording(null);
    if (!r) return;
    r.cancel = cancel;
    if (r.mr.state === "recording") r.mr.stop();
  }

  // ---------- long press: WeChat's dark menu above the bubble
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  function openPop(m: ChatMsg, el: HTMLElement) {
    const r = el.getBoundingClientRect(), base = root.current!.getBoundingClientRect();
    const above = r.top - base.top > 170;
    setPop({ m, x: Math.min(Math.max(r.left - base.left + r.width / 2, 150), base.width - 150), y: above ? r.top - base.top - 8 : r.bottom - base.top + 8, above });
  }
  const holdProps = (m: ChatMsg) => ({
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => { e.preventDefault(); openPop(m, e.currentTarget); },
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => { const el = e.currentTarget; press.current = setTimeout(() => openPop(m, el), 450); },
    onTouchEnd: () => { if (press.current) clearTimeout(press.current); },
    onTouchMove: () => { if (press.current) clearTimeout(press.current); },
  });
  async function del(m: ChatMsg, everyone: boolean) {
    setPop(null);
    const r = await deleteMessage(scope, m.id, everyone);
    if (r.error) { flash(everyone ? "You can only unsend your own messages within 10 minutes" : "Couldn't delete"); return; }
    if (everyone) setMsgs((p) => p.map((x) => (x.id === m.id ? { ...x, kind: "recalled", body: "", meta: {} } : x)));
    else setMsgs((p) => p.filter((x) => x.id !== m.id));
  }
  async function translate(m: ChatMsg) {
    setPop(null);
    setTranslated((t) => ({ ...t, [m.id]: "Translating..." }));
    const r = await askAI({ brain: "spark", tier: "quick", feature: "chat", system: "Translate the user's message into clear English. If it is already English, translate it into Nigerian Pidgin. Reply with only the translation.", messages: [{ role: "user", content: m.body }] });
    setTranslated((t) => ({ ...t, [m.id]: r.ok ? r.text.trim() : "Couldn't translate right now" }));
  }
  function favorite(m: ChatMsg) {
    setPop(null);
    writeFavs([{ id: m.id, kind: m.kind, body: m.body, meta: m.meta, from: m.mine ? profile.name || "Me" : (scope === "group" ? m.name : other?.name) ?? "", at: m.created_at }, ...readFavs().filter((f) => f.id !== m.id)]);
    flash("Added to Favorites");
  }

  const isGroupAdmin = group?.role === "owner" || group?.role === "admin";
  // The server only allows unsending your own message within 10 minutes (admins: any message in their group).
  const canUnsend = (m: ChatMsg) => !["transfer", "packet", "recalled"].includes(m.kind) && (m.mine || (scope === "group" && isGroupAdmin));
  const title = scope === "dm" ? other?.name ?? "" : group ? `${group.remark || group.name}(${group.members})` : "";

  function content(m: ChatMsg): ReactNode {
    const meta = m.meta as Record<string, unknown>;
    switch (m.kind) {
      case "image": return <ChatImage path={String(meta.path)} />;
      case "voice": return <VoiceNote path={String(meta.path)} seconds={Number(meta.seconds ?? 1)} mine={m.mine} />;
      case "file": return <ChatFile path={String(meta.path)} name={String(meta.name ?? "File")} size={Number(meta.size ?? 0)} />;
      case "location": return (
        <a href={`https://maps.google.com/?q=${meta.lat},${meta.lng}`} target="_blank" rel="noreferrer" className="block w-[220px]">
          <div className="text-[15px]">Shared location</div><div className="mt-0.5 text-[12px] text-[var(--we-sub)]">{String(meta.lat)}, {String(meta.lng)}</div>
          <div className="mt-2 flex h-20 items-center justify-center rounded-[3px] bg-[#E3EEDB]"><MapPin size={26} className="fill-[#FA5151] text-white" /></div>
        </a>
      );
      case "contact": return (
        <button onClick={() => meta.id && setOverlay({ t: "contact", id: String(meta.id) })} className="w-[220px] text-left">
          <div className="flex items-center gap-2.5 pb-2"><SqAvatar name={String(meta.name ?? "?")} color={String(meta.color ?? "#7C4DDB")} size={42} /><div className="min-w-0"><div className="truncate text-[15px]">{String(meta.name ?? "")}</div>{meta.handle ? <div className="truncate text-[12px] text-[var(--we-sub)]">{String(meta.handle)}</div> : null}</div></div>
          <div className="border-t border-[var(--we-sep)] pt-1 text-[11px] text-[var(--we-sub)]">Contact Card</div>
        </button>
      );
      case "course": return (
        <a href={`/course/${String(meta.course_id ?? "")}`} className="block w-[220px]">
          <div className="flex items-start gap-3 pb-2"><div className="min-w-0 flex-1"><div className="line-clamp-2 text-[15px]">{String(meta.title ?? "Course")}</div><div className="mt-0.5 text-[12px] text-[var(--we-sub)]">{meta.role === "edit" ? "You can add notes" : "Shared course"}</div></div><BookOpen size={34} strokeWidth={1.4} className="shrink-0 text-[var(--study)]" /></div>
          <div className="border-t border-[var(--we-sep)] pt-1 text-[11px] text-[var(--we-sub)]">Birdie course</div>
        </a>
      );
      default: return <WithMentions text={m.body} names={mentionNames} />;
    }
  }
  function sticker(m: ChatMsg): ReactNode {
    const meta = m.meta as { game?: string; value?: number | string; emoji?: string; path?: string };
    if (meta.game === "dice") return <span className="block text-[64px] leading-none">{DICE[Number(meta.value) - 1] ?? "🎲"}</span>;
    if (meta.game === "rps") return <span className="block text-[60px] leading-none">{RPS[String(meta.value)] ?? "✊"}</span>;
    if (meta.emoji) return <span className="block text-[64px] leading-none">{meta.emoji}</span>;
    return meta.path ? <StickerImg path={meta.path} /> : null;
  }

  return (
    <div ref={root} className="relative flex min-h-0 flex-1 flex-col bg-[var(--we-chat)]" onClick={() => pop && setPop(null)}>
      <WeHeader onBack={onBack} title={<span className="inline-flex max-w-full items-center gap-1"><span className="truncate">{title}</span>{(scope === "dm" ? dmState.muted : group?.muted) && <BellOff size={14} className="shrink-0 text-[var(--we-sub)]" />}</span>}
        right={<MoreBtn onClick={() => setInfo(true)} />} />
      {chatBadge > 0 && <span className="pointer-events-none absolute left-11 top-3 z-20 text-[15px] text-[var(--we-text)]">{chatBadge > 99 ? "99+" : chatBadge}</span>}

      <div ref={list} onScroll={(e) => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }}
        onClick={() => setPanel(null)}
        className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3" style={bg ? { background: bg.startsWith("data:") ? `center / cover url(${bg})` : bg } : undefined}>
        {loaded && more && msgs.length >= 60 && <button onClick={() => void earlier()} className="mx-auto block text-[12px] text-[var(--we-link)]">View earlier messages</button>}
        {shown.map((m, i) => {
          const prev = shown[i - 1];
          const showTime = !prev || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60_000 || !sameDay(m.created_at, prev.created_at);
          const time = showTime ? <div className="pb-3 text-center text-[12px] text-[var(--we-sub)]">{stamp(m.created_at)}</div> : null;
          if (m.system) return <div key={m.id}>{time}<div className="mx-auto w-fit max-w-[80%] rounded-[4px] bg-black/10 px-2 py-0.5 text-center text-[12px] text-[var(--we-sub)]">{m.body}</div></div>;
          if (m.kind === "recalled") return <div key={m.id}>{time}<div className="text-center text-[12px] text-[var(--we-sub)]">{m.mine ? "You recalled a message" : `"${scope === "group" ? m.name : other?.name}" recalled a message`}</div></div>;
          const bm = m.meta as { birdie?: boolean; asked_by?: string };
          if (bm.birdie) return (
            <div key={m.id}>
              {time}
              <div className="flex items-start gap-2.5">
                <BirdieAvatar />
                <div className="min-w-0 max-w-[78%]">
                  <div className="mb-1 text-[12px] text-[var(--we-sub)]">Birdie AI{bm.asked_by ? ` · for ${bm.asked_by}` : ""}</div>
                  <div {...holdProps(m)} className="relative select-none rounded-[4px] bg-[var(--we-bubble)] px-3 py-[9px] text-[15px] leading-[1.45] text-[var(--we-text)]">
                    <span className="absolute -left-1 top-[13px] h-2.5 w-2.5 rotate-45 bg-[var(--we-bubble)]" />
                    <div className="relative"><Rich text={m.body} /></div>
                  </div>
                </div>
              </div>
              {privAfter[m.id]?.map(renderPriv)}
            </div>
          );
          const who = scope === "group" ? { name: m.name ?? "", color: m.color ?? "#7C4DDB" } : { name: other?.name ?? "", color: other?.color ?? "#7C4DDB" };
          return (
            <div key={m.id}>
              {time}
              <div className={`flex items-start gap-2.5 ${m.mine ? "flex-row-reverse" : ""}`}>
                {m.mine ? <SqAvatar name={meName} color="#8A2FA3" size={40} /> : <SqAvatar name={who.name || "?"} color={who.color} size={40} onClick={() => m.sender_id && setOverlay({ t: "contact", id: m.sender_id })} />}
                <div className={`flex min-w-0 max-w-[72%] flex-col ${m.mine ? "items-end" : "items-start"}`}>
                  {scope === "group" && !m.mine && names && <div className="mb-1 text-[12px] text-[var(--we-sub)]">{m.name}</div>}
                  <div {...holdProps(m)} className="relative select-none">
                    {m.kind === "transfer" ? <TransferCard msg={m} otherName={other?.name ?? ""} />
                      : m.kind === "packet" ? <PacketCard msg={m} opened={opened.has(String((m.meta as { giveaway_id?: string }).giveaway_id))} onOpen={() => setOpenGift(String((m.meta as { giveaway_id?: string }).giveaway_id))} />
                      : m.kind === "sticker" ? sticker(m)
                      : m.kind === "image" ? content(m)
                      : (
                        <div className={`relative rounded-[4px] px-3 py-[9px] text-[16px] leading-[1.4] ${m.mine ? "bg-[var(--we-mine)] text-[var(--we-mine-text)]" : "bg-[var(--we-bubble)] text-[var(--we-text)]"}`}>
                          <span className={`absolute top-[13px] h-2.5 w-2.5 rotate-45 ${m.mine ? "-right-1 bg-[var(--we-mine)]" : "-left-1 bg-[var(--we-bubble)]"}`} />
                          <span className="relative block break-words">{content(m)}</span>
                        </div>
                      )}
                  </div>
                  {translated[m.id] && <div className="mt-1 max-w-full rounded-[4px] bg-[var(--we-bubble)] px-2.5 py-1.5 text-[13px] text-[var(--we-text)]"><span className="text-[11px] text-[var(--we-sub)]">Translation · </span>{translated[m.id]}</div>}
                  {m.reply && <div className="mt-1 max-w-full truncate rounded-[3px] bg-black/5 px-2 py-1 text-[12.5px] text-[var(--we-sub)]">{m.reply.mine ? meName : m.reply.name ?? other?.name}: {m.reply.text}</div>}
                </div>
              </div>
              {privAfter[m.id]?.map(renderPriv)}
            </div>
          );
        })}
        {privAfter.__start?.map(renderPriv)}
        {loaded && shown.length === 0 && <div className="pt-20 text-center text-[13px] text-[var(--we-sub)]">{scope === "dm" ? "Say hi" : "Say hi to the group"}</div>}
      </div>

      {/* long-press menu */}
      {pop && (
        <div onClick={(e) => e.stopPropagation()} className="absolute z-40 w-[296px] rounded-[8px] bg-[var(--we-pop)] px-1 py-2 text-white shadow-2xl"
          style={{ left: pop.x - 148, top: pop.above ? undefined : pop.y, bottom: pop.above ? `calc(100% - ${pop.y}px)` : undefined }}>
          <div className="grid grid-cols-5 gap-y-2">
            {[
              pop.m.kind === "text" && { label: "Copy", Icon: Copy, run: () => { void navigator.clipboard?.writeText(pop.m.body); setPop(null); flash("Copied"); } },
              !["transfer", "packet"].includes(pop.m.kind) && { label: "Forward", Icon: Forward, run: () => { setForwarding(pop.m); setPop(null); } },
              !["transfer", "packet"].includes(pop.m.kind) && { label: "Favorite", Icon: Star, run: () => favorite(pop.m) },
              { label: "Delete", Icon: Trash2, run: () => void del(pop.m, false) },
              !["transfer", "packet"].includes(pop.m.kind) && { label: "Quote", Icon: CornerUpLeft, run: () => { setReply(pop.m); setPop(null); setVoice(false); } },
              canUnsend(pop.m) && { label: pop.m.mine ? "Unsend" : "Remove", Icon: Undo2, run: () => void del(pop.m, true) },
              pop.m.kind === "text" && { label: "Translate", Icon: Languages, run: () => void translate(pop.m) },
              pop.m.kind === "text" && { label: "Search", Icon: Sparkles, run: () => { setPop(null); goBirdie({ courseId: "general", prompt: pop.m.body }); } },
              pop.m.kind === "packet" && { label: "Open", Icon: Gift, run: () => { setOpenGift(String((pop.m.meta as { giveaway_id?: string }).giveaway_id)); setPop(null); } },
              pop.m.kind === "transfer" && { label: "Wallet", Icon: Wallet, run: () => { setPop(null); setWalletOpen(true); } },
            ].filter(Boolean).map((it) => { const { label, Icon, run } = it as { label: string; Icon: typeof Copy; run: () => void }; return (
              <button key={label} onClick={run} className="flex flex-col items-center gap-1.5 py-1 text-[11.5px]"><Icon size={20} strokeWidth={1.6} />{label}</button>
            ); })}
          </div>
          <span className={`absolute h-3 w-3 rotate-45 bg-[var(--we-pop)] ${pop.above ? "-bottom-1.5" : "-top-1.5"}`} style={{ left: 142 }} />
        </div>
      )}

      {busy && <div className="shrink-0 bg-[var(--we-bar)] py-1 text-center text-[12px] text-[var(--we-sub)]">{busy}</div>}
      {reply && (
        <div className="flex shrink-0 items-center gap-2 bg-[var(--we-bar)] px-3 pt-2 text-[12.5px] text-[var(--we-sub)]">
          <span className="min-w-0 flex-1 truncate rounded-[3px] bg-black/5 px-2 py-1">{reply.mine ? meName : reply.name ?? other?.name}: {reply.kind === "text" ? reply.body : `[${reply.kind}]`}</span>
          <button onClick={() => setReply(null)} aria-label="Cancel quote" className="text-[18px] leading-none">×</button>
        </div>
      )}
      {atQuery !== null && !voice && (
        <div role="listbox" aria-label="Mention" className="no-scrollbar max-h-[260px] shrink-0 overflow-y-auto border-t border-[var(--we-sep)] bg-[var(--we-cell)]">
          {[
            { key: "bp", show: "birdie".startsWith(atQuery) || atQuery === "", node: <BirdieAvatar size={34} />, label: "Birdie AI", sub: "Only you see the answer", run: () => pickMention("birdie-private") },
            { key: "bq", show: "birdie".startsWith(atQuery) || atQuery === "", node: <BirdieAvatar size={34} />, label: "Birdie AI", sub: "Answers in the chat for everyone", run: () => pickMention("birdie-public") },
            { key: "all", show: canAll && ("all".startsWith(atQuery) || atQuery === ""), node: <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[4px] bg-[var(--we-accent)] text-[13px] font-bold text-white">@</span>, label: "All", sub: "Notify everyone in the group", run: () => pickMention("all") },
            ...people.filter((x) => x.name.toLowerCase().includes(atQuery)).map((x) => ({ key: x.id, show: true, node: <SqAvatar name={x.name} color={x.color} size={34} />, label: x.name, sub: "", run: () => pickMention(x) })),
          ].filter((x) => x.show).map((x) => (
            <button key={x.key} onClick={x.run} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] px-4 py-2 text-left last:border-0 active:bg-black/5">
              {x.node}<span className="min-w-0"><span className="block truncate text-[15px] text-[var(--we-text)]">{x.label}</span>{x.sub && <span className="block truncate text-[12px] text-[var(--we-sub)]">{x.sub}</span>}</span>
            </button>
          ))}
        </div>
      )}
      {askBirdie && (
        <div className="flex shrink-0 items-center gap-2 bg-[var(--we-bar)] px-3 pt-2 text-[12.5px] text-[var(--we-sub)]">
          <BirdieAvatar size={18} /><span className="flex-1">{askBirdie === "private" ? "Asking Birdie privately. Only you will see the answer." : "Birdie will answer in the chat for everyone."}</span>
          <button onClick={() => setAskBirdie((a) => (a === "private" ? "public" : "private"))} className="text-[var(--we-link)]">{askBirdie === "private" ? "Make public" : "Make private"}</button>
          <button onClick={() => { setAskBirdie(null); setDraft((d) => d.replace(/@Birdie\s?/gi, "")); }} aria-label="Cancel" className="text-[18px] leading-none">×</button>
        </div>
      )}
      <div className="flex shrink-0 items-end gap-2 border-t border-[var(--we-sep)] bg-[var(--we-bar)] px-2 pb-2 pt-2 text-[var(--we-text)]">
        <button onClick={() => { setVoice((v) => !v); setPanel(null); }} aria-label={voice ? "Keyboard" : "Voice message"} className="mb-[3px] shrink-0 active:opacity-60">{voice ? <KeyboardCircle /> : <VoiceCircle />}</button>
        {voice ? (
          <button
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); void startRec(e.timeStamp); }}
            onPointerMove={(e) => { if (!rec.current) return; const r = e.currentTarget.getBoundingClientRect(); setRecording(e.clientY < r.top - 50 ? "cancel" : "rec"); }}
            onPointerUp={(e) => { const r = e.currentTarget.getBoundingClientRect(); stopRec(e.clientY < r.top - 50); }}
            onPointerCancel={() => stopRec(true)}
            className={`h-9 min-w-0 flex-1 touch-none select-none rounded-[4px] text-[15px] font-semibold ${recording ? "bg-[var(--we-sep)]" : "bg-[var(--we-input)]"}`}>
            {recording === "cancel" ? "Release to Cancel" : recording ? "Release to Send" : "Hold to Talk"}
          </button>
        ) : (
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onFocus={() => setPanel(null)} rows={1} aria-label="Message"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendText(); } }}
            className="max-h-28 min-h-9 min-w-0 flex-1 resize-none rounded-[4px] bg-[var(--we-input)] px-2.5 py-[7px] text-[16px] leading-snug text-[var(--we-text)] outline-none" />
        )}
        <button onClick={() => { setPanel((p) => (p === "emoji" ? null : "emoji")); setVoice(false); }} aria-label={panel === "emoji" ? "Keyboard" : "Stickers"} className="mb-[3px] shrink-0 active:opacity-60">{panel === "emoji" ? <KeyboardCircle /> : <EmojiCircle />}</button>
        {draft.trim() && !voice
          ? <button onClick={() => void sendText()} className="mb-[2px] h-8 shrink-0 rounded-[4px] bg-[var(--we-accent)] px-3 text-[14px] font-medium text-white">Send</button>
          : <button onClick={() => setPanel((p) => (p === "plus" ? null : "plus"))} aria-label="More" className="mb-[3px] shrink-0 active:opacity-60"><PlusCircle /></button>}
      </div>
      <AnimatePresence initial={false}>
        {panel === "emoji" && <motion.div key="emoji" initial={{ height: 0 }} animate={{ height: 270 }} exit={{ height: 0 }} className="shrink-0 overflow-hidden bg-[var(--we-bar)]"><EmojiPanel onEmoji={(e) => setDraft((d) => d + e)} onSend={() => void sendText()} canSend={!!draft.trim()} onBackspace={() => setDraft((d) => Array.from(d).slice(0, -1).join(""))} onSticker={(meta) => void post("sticker", "", meta)} /></motion.div>}
        {panel === "plus" && <motion.div key="plus" initial={{ height: 0 }} animate={{ height: 230 }} exit={{ height: 0 }} className="shrink-0 overflow-hidden bg-[var(--we-bar)]"><PlusPanel scope={scope} run={(t) => {
          if (t === "album") album.current?.click(); else if (t === "camera") camera.current?.click(); else if (t === "files") fileIn.current?.click();
          else if (t === "voice") dictate(); else if (t === "location") shareLocation(); else { setPanel(null); setSheet(t); }
        }} /></motion.div>}
      </AnimatePresence>
      <input ref={album} type="file" accept="image/*" multiple hidden onChange={(e) => { void sendFiles(e.target.files, "image"); e.target.value = ""; }} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void sendFiles(e.target.files, "image"); e.target.value = ""; }} />
      <input ref={fileIn} type="file" multiple hidden onChange={(e) => { void sendFiles(e.target.files, "file"); e.target.value = ""; }} />

      {scope === "dm" && other && <TransferSheet open={sheet === "transfer"} onClose={() => setSheet(null)} thread={id} to={other} onSent={(m) => setMsgs((p) => [...p, m])} />}
      <GiveawaySheet open={sheet === "giveaway"} onClose={() => setSheet(null)} scope={scope} target={id} members={group?.members} onSent={(m) => setMsgs((p) => [...p, m])} />
      <GiveawayOpen id={openGift} onClose={() => setOpenGift(null)} onOpened={(g) => setOpened((s) => (s.has(g) ? s : new Set(s).add(g)))} />
      {scope === "dm" && other && <CourseShareSheet open={sheet === "course"} onClose={() => setSheet(null)} to={{ grantee: other.id }} who={other.name.split(" ")[0]}
        onShared={(c, role) => void post("course", "", { course_id: c.id, title: `${c.code} · ${c.name}`, role })} />}
      <ContactPicker open={sheet === "contact"} onClose={() => setSheet(null)} onPick={(p) => { setSheet(null); void post("contact", "", { id: p.id, name: p.name, handle: p.handle, color: p.color }); }} />
      <FavoritesPicker open={sheet === "favorites"} onClose={() => setSheet(null)} onPick={async (f) => {
        setSheet(null);
        let meta = f.meta;
        if (["image", "voice", "file"].includes(f.kind)) { const p = await forwardMedia(String(meta.path), scope, id); if (!p) return flash("Couldn't send that"); meta = { ...meta, path: p }; }
        void post(f.kind, f.body, meta);
      }} />
      <ForwardSheet msg={forwarding} onClose={() => setForwarding(null)} onSend={async (to, label) => {
        const m = forwarding!; setForwarding(null);
        let meta = m.meta;
        if (["image", "voice", "file"].includes(m.kind)) { const p = await forwardMedia(String(meta.path), to.scope, to.id); if (!p) return flash("Couldn't forward that"); meta = { ...meta, path: p }; }
        if (await post(m.kind, m.body, meta, to)) flash(`Sent to ${label}`);
      }} />

      {info && <ChatInfo scope={scope} id={id} other={other} dmState={dmState} group={group} onClose={() => setInfo(false)}
        onChanged={() => { void loadHead(); setPrefsTick((t) => t + 1); }} onCleared={() => { if (scope === "dm") setMsgs([]); setPrefsTick((t) => t + 1); }}
        onLeft={() => { setInfo(false); onBack(); }} onOpenCourse={onOpenCourse} onOpenDm={(u) => void openDm(u)} />}
    </div>
  );
}

function EmojiPanel({ onEmoji, onSend, canSend, onBackspace, onSticker }: { onEmoji: (e: string) => void; onSend: () => void; canSend: boolean; onBackspace: () => void; onSticker: (meta: Record<string, unknown>) => void }) {
  const { flash } = useApp();
  const [tab, setTab] = useState<"emoji" | "mine">("emoji");
  const [stickers, setStickers] = useState<string[]>([]);
  const add = useRef<HTMLInputElement>(null);
  useEffect(() => { void Promise.resolve().then(() => setStickers(readStickers())); }, []);
  async function addSticker(f?: File) {
    if (!f) return;
    const up = await uploadSticker(await shrink(f, 240, "image/png"));
    if (!up.path) return flash(up.error ?? "Couldn't add the sticker");
    const next = [up.path, ...stickers].slice(0, 120);
    setStickers(next); try { localStorage.setItem("birdie-stickers", JSON.stringify(next)); } catch { /* full */ }
    flash("Sticker added");
  }
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1 px-3 pt-2">
        <button onClick={() => setTab("emoji")} aria-label="Emoji" className={`flex h-9 w-11 items-center justify-center rounded-[6px] ${tab === "emoji" ? "bg-[var(--we-cell)]" : ""}`}><Smile size={21} /></button>
        <button onClick={() => setTab("mine")} aria-label="Custom stickers" className={`flex h-9 w-11 items-center justify-center rounded-[6px] text-[18px] ${tab === "mine" ? "bg-[var(--we-cell)]" : ""}`}>♡</button>
      </div>
      {tab === "emoji" ? (
        <div className="relative min-h-0 flex-1">
          <div className="no-scrollbar grid h-full grid-cols-8 content-start gap-y-1 overflow-y-auto px-3 pb-14 pt-2">{EMOJIS.map((e) => <button key={e} onClick={() => onEmoji(e)} className="h-10 text-[26px] active:scale-90">{e}</button>)}</div>
          <div className="absolute bottom-2 right-3 flex gap-2">
            <button onClick={onBackspace} aria-label="Delete" className="h-9 rounded-[4px] bg-[var(--we-cell)] px-3 text-[16px] shadow-sm">⌫</button>
            <button onClick={onSend} disabled={!canSend} className="h-9 rounded-[4px] bg-[var(--we-accent)] px-4 text-[14px] font-medium text-white shadow-sm disabled:opacity-40">Send</button>
          </div>
        </div>
      ) : (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-2">
          <div className="mb-2 text-[13px] text-[var(--we-sub)]">Custom Stickers</div>
          <div className="grid grid-cols-4 gap-3 pb-4">
            <button onClick={() => add.current?.click()} aria-label="Add sticker" className="flex aspect-square items-center justify-center rounded-[6px] border-2 border-dashed border-[var(--we-hint)] text-[var(--we-sub)]"><Plus size={26} /></button>
            <button onClick={() => onSticker({ game: "rps" })} aria-label="Rock paper scissors" className="flex aspect-square items-center justify-center text-[38px]">✌️</button>
            <button onClick={() => onSticker({ game: "dice" })} aria-label="Dice" className="flex aspect-square items-center justify-center text-[42px]">🎲</button>
            {stickers.map((p) => <button key={p} onClick={() => onSticker({ path: p })} className="flex aspect-square items-center justify-center overflow-hidden rounded-[6px]"><StickerImg path={p} /></button>)}
          </div>
          <input ref={add} type="file" accept="image/*" hidden onChange={(e) => { void addSticker(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      )}
    </div>
  );
}

type Tool = "album" | "camera" | "location" | "giveaway" | "transfer" | "voice" | "course" | "contact" | "files" | "favorites";
const TOOLS: Record<Tool, { label: string; Icon: typeof Copy }> = {
  album: { label: "Album", Icon: ImageIcon }, camera: { label: "Camera", Icon: Camera }, location: { label: "Location", Icon: MapPin },
  giveaway: { label: "Giveaway", Icon: Gift }, transfer: { label: "Transfer", Icon: Wallet }, voice: { label: "Voice Input", Icon: Mic },
  course: { label: "Course", Icon: BookOpen }, contact: { label: "Contact Card", Icon: Contact }, files: { label: "Files", Icon: FileText }, favorites: { label: "Favorites", Icon: Star },
};
function PlusPanel({ scope, run }: { scope: Scope; run: (t: Tool) => void }) {
  const pages: Tool[][] = scope === "dm"
    ? [["album", "camera", "location", "giveaway", "transfer", "voice", "course", "contact"], ["files", "favorites"]]
    : [["album", "camera", "location", "giveaway", "voice", "contact", "files", "favorites"]];
  const [page, setPage] = useState(0);
  return (
    <div className="flex h-full flex-col border-t border-[var(--we-sep)]">
      <div onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))} className="no-scrollbar flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto">
        {pages.map((p, i) => (
          <div key={i} className="grid w-full shrink-0 snap-start grid-cols-4 content-start gap-y-4 px-5 pt-5">
            {p.map((t) => { const { label, Icon } = TOOLS[t]; return (
              <button key={t} onClick={() => run(t)} className="flex flex-col items-center gap-1.5 text-[12px] text-[var(--we-sub)]">
                <span className="flex h-[58px] w-[58px] items-center justify-center rounded-[14px] bg-[var(--we-cell)] text-[var(--we-text)]"><Icon size={26} strokeWidth={1.5} /></span>{label}
              </button>
            ); })}
          </div>
        ))}
      </div>
      {pages.length > 1 && <div className="flex shrink-0 justify-center gap-1.5 pb-3">{pages.map((_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === page ? "bg-[var(--we-sub)]" : "bg-[var(--we-hint)]"}`} />)}</div>}
    </div>
  );
}

function ContactPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (p: Person) => void }) {
  const { findPeople } = useApp();
  const [q, setQ] = useState(""); const [found, setFound] = useState<Person[]>([]);
  useEffect(() => { if (q.trim().length < 2) return; const t = setTimeout(() => void findPeople(q.trim().replace(/^@/, "")).then(setFound), 300); return () => clearTimeout(t); }, [q, findPeople]);
  return (
    <Sheet open={open} onClose={onClose} title="Send a Contact Card">
      <div className="mb-3 flex items-center gap-2 rounded-[6px] bg-[var(--we-bg)] px-3 py-2"><Search size={16} className="text-[var(--we-sub)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} autoCapitalize="none" placeholder="Search name or Birdie ID" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" /></div>
      <div className="max-h-[45vh] overflow-y-auto">{q.trim().length >= 2 && found.map((p) => (
        <button key={p.id} onClick={() => onPick(p)} className="flex w-full items-center gap-3 py-2 text-left"><SqAvatar name={p.name} color={p.color} size={40} /><span className="min-w-0 flex-1 truncate text-[15.5px]">{p.name} <span className="text-[13px] text-[var(--we-sub)]">{p.handle}</span></span></button>
      ))}</div>
    </Sheet>
  );
}

function FavoritesPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (f: Fav) => void }) {
  const [favs, setFavs] = useState<Fav[]>([]);
  useEffect(() => { if (open) void Promise.resolve().then(() => setFavs(readFavs())); }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Favorites">
      {favs.length === 0 ? <p className="py-6 text-center text-[13.5px] text-[var(--we-sub)]">Long-press a message and tap Favorite to keep it here.</p> : (
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">{favs.map((f) => (
          <button key={f.id} onClick={() => onPick(f)} className="block w-full rounded-[6px] bg-[var(--we-bg)] p-3 text-left">
            <div className="line-clamp-2 text-[14.5px]">{favText(f)}</div>
            <div className="mt-1 text-[11.5px] text-[var(--we-sub)]">{f.from} · {new Date(f.at).toLocaleDateString()}</div>
          </button>
        ))}</div>)}
    </Sheet>
  );
}
export const favText = (f: Fav) => (f.kind === "text" ? f.body : f.kind === "image" ? "[Photo]" : f.kind === "voice" ? "[Voice message]" : f.kind === "file" ? `[File] ${String(f.meta.name ?? "")}` : f.kind === "sticker" ? "[Sticker]" : `[${f.kind}]`);

/** Forward to any of your chats (photos and files are copied across on the server). */
function ForwardSheet({ msg, onClose, onSend }: { msg: ChatMsg | null; onClose: () => void; onSend: (to: { scope: Scope; id: string }, label: string) => void }) {
  const [rows, setRows] = useState<{ scope: Scope; id: string; name: string; color: string; avatars?: { name: string; color: string }[] }[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!msg) return;
    void Promise.all([myDms(), myGroups()]).then(([d, g]) => setRows([
      ...d.map((x) => ({ scope: "dm" as const, id: x.id, name: x.other.name, color: x.other.color })),
      ...g.map((x) => ({ scope: "group" as const, id: x.id, name: x.remark || x.name, color: "#7C4DDB", avatars: x.avatars })),
    ]));
  }, [msg]);
  const shown = rows.filter((r) => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Sheet open={!!msg} onClose={onClose} title="Select a Chat">
      <div className="mb-3 flex items-center gap-2 rounded-[6px] bg-[var(--we-bg)] px-3 py-2"><Search size={16} className="text-[var(--we-sub)]" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" /></div>
      <div className="max-h-[50vh] overflow-y-auto">{shown.map((r) => (
        <button key={r.scope + r.id} onClick={() => onSend({ scope: r.scope, id: r.id }, r.name)} className="flex w-full items-center gap-3 py-2 text-left">
          {r.avatars ? <GridAvatar avatars={r.avatars} size={40} /> : <SqAvatar name={r.name} color={r.color} size={40} />}<span className="min-w-0 flex-1 truncate text-[15.5px]">{r.name}</span>
        </button>
      ))}</div>
    </Sheet>
  );
}

type Priv = { id: string; at: string; q: string; a: string | null };

const BirdieAvatar = ({ size = 40 }: { size?: number }) => (
  <span className="flex shrink-0 items-center justify-center rounded-[6px] bg-gradient-to-br from-[#C05BD6] to-[#8A2FA3] font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.45 }}>B</span>
);

/** Message text with @mentions of people in the chat (and @All, @Birdie) shown in the link colour. */
function WithMentions({ text, names }: { text: string; names: string[] }) {
  if (!text.includes("@") || !names.length) return <Linkified text={text} />;
  const re = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`, "g");
  const parts = text.split(re);
  return <>{parts.map((p, i) => (i % 2 ? <span key={i} className="text-[var(--we-link)]">{p}</span> : p && <Linkified key={i} text={p} />))}</>;
}
