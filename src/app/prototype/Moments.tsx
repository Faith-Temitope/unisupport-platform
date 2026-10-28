"use client";

// Moments, like WeChat's: a cover photo with your name and avatar, then your friends' posts newest first
// (no algorithm). A post is text with up to 9 photos, one video, or a shared link, plus a place.
// Likes and comments are semi-private: you only see them from people who are your friends too.
// Tap the camera to post photos or a video; hold it to post text only. At most two sponsored posts a day.
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronLeft, ChevronRight, Heart, Lock, MapPin, MessageSquare, Play, Plus, Smile, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shrink } from "./ChatRoom";
import { MomentThumb } from "./Contact";
import { commentMoment, deleteMoment, deleteMomentComment, likeMoment, momentGet, momentMediaUrl, momentsFeed, momentsHeader, momentsInbox, postMoment, setMomentsCover, uploadMomentPhoto, userMoments,
  type Moment, type MomentLink, type MomentNotice, type MomentVideo } from "./live/chatData";
import { useBackLayer } from "./nav";
import { MomentAd, usePlacements } from "./Sponsored";
import { useApp } from "./store";
import { SqAvatar, WeHeader } from "./we";

export function ago(t: string) {
  const s = (Date.now() - new Date(t).getTime()) / 1000;
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min(s) ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr(s) ago`;
  if (s < 172800) return "Yesterday";
  return new Date(t).toLocaleDateString([], { day: "numeric", month: "short", year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

const SHARE_KEY = "birdie-moment-share";
const INBOX_SEEN = "birdie-moments-inbox-seen";
const ADS_KEY = "birdie-moments-ads";
const EMOJIS = "😀 😂 🤣 😊 😍 😘 😎 🤩 🥳 😇 🙂 😉 😋 😜 🤔 🙄 😏 😬 😴 😱 😭 😢 😤 😡 🥺 😳 🤗 🙏 👍 👏 🙌 💪 🤝 👌 ✌️ 🤞 👀 💯 🔥 ✨ 🎉 ❤️ 💜 💙 💚 💛 🌹 🎓 📚 ✏️ 🍕 🍔 🥤 ☕ 💸 🎁 🐐 🦅".split(" ");

/** Share an article, post or video into your Moments: opens the Moments composer with it attached. */
export function shareToMoments(link: MomentLink, go: { setTab: (t: "explore") => void; setDiscoverView: (v: { k: "moments" }) => void; setOverlay?: (o: null) => void }) {
  try { sessionStorage.setItem(SHARE_KEY, JSON.stringify(link)); } catch { /* ignore */ }
  go.setOverlay?.(null); go.setTab("explore"); go.setDiscoverView({ k: "moments" });
}
/** Has someone liked or commented on your posts (or replied to you) since you last looked? */
export async function hasNewMomentNotices() {
  const list = await momentsInbox();
  let seen = ""; try { seen = localStorage.getItem(INBOX_SEEN) ?? ""; } catch { /* ignore */ }
  return list.some((n) => n.at > seen);
}

function useMediaUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { if (!path) return; let on = true; void momentMediaUrl(path).then((u) => { if (on) setUrl(u); }); return () => { on = false; }; }, [path]);
  return path ? url : null;
}

function Photo({ path, className, onOpen }: { path: string; className: string; onOpen: () => void }) {
  const url = useMediaUrl(path);
  return <button onClick={onOpen} className={`block overflow-hidden bg-[var(--we-sep)] ${className}`} aria-label="Open photo">{url && <img src={url} alt="" className="h-full w-full object-cover" />}</button>;
}

function VideoPost({ video }: { video: MomentVideo }) {
  const poster = useMediaUrl(video.poster);
  const [playing, setPlaying] = useState(false);
  const src = useMediaUrl(playing ? video.path : null);
  return (
    <div className="relative mt-2 w-[200px] overflow-hidden bg-black" style={{ aspectRatio: "3 / 4" }}>
      {playing && src ? <video src={src} poster={poster ?? undefined} controls autoPlay playsInline className="h-full w-full object-contain" />
        : <button onClick={() => setPlaying(true)} aria-label="Play video" className="relative block h-full w-full">
          {poster && <img src={poster} alt="" className="h-full w-full object-cover" />}
          <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/90 bg-black/30 text-white"><Play size={22} className="ml-0.5 fill-white" /></span></span>
          {video.seconds > 0 && <span className="absolute bottom-1.5 right-2 text-[11px] text-white drop-shadow">{Math.floor(video.seconds / 60)}:{String(Math.round(video.seconds % 60)).padStart(2, "0")}</span>}
        </button>}
    </div>
  );
}

function LinkPost({ link }: { link: MomentLink }) {
  const open = () => {
    try {
      const u = new URL(link.url);
      if (u.origin === window.location.origin) { window.dispatchEvent(new CustomEvent("birdie-open-link", { detail: u.href })); return; }
    } catch { /* fall through */ }
    window.open(link.url, "_blank", "noopener");
  };
  return (
    <button onClick={open} className="mt-2 flex w-full items-center gap-2.5 bg-[var(--we-bg)] p-1.5 text-left active:opacity-80">
      {link.thumb ? <img src={link.thumb} alt="" className="h-11 w-11 shrink-0 object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-[var(--we-sep)] text-[18px]">🔗</span>}
      <span className="line-clamp-2 text-[14px] leading-snug text-[var(--we-text)]">{link.title}</span>
    </button>
  );
}

/** Full-screen photos; swipe (or tap the arrows) between them, tap to close. */
function Viewer({ paths, start, onClose }: { paths: string[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const url = useMediaUrl(paths[i]);
  const x0 = useRef<number | null>(null);
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black" onClick={onClose}
      onTouchStart={(e) => { x0.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (x0.current === null) return; const dx = e.changedTouches[0].clientX - x0.current; x0.current = null; if (dx < -40) setI((n) => Math.min(paths.length - 1, n + 1)); else if (dx > 40) setI((n) => Math.max(0, n - 1)); }}>
      <div className="flex min-h-0 flex-1 items-center justify-center">{url && <img src={url} alt="" className="max-h-full max-w-full object-contain" />}</div>
      {paths.length > 1 && (
        <div className="flex items-center justify-center gap-6 pb-8 text-white" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0} aria-label="Previous photo" className="disabled:opacity-30"><ChevronLeft size={26} /></button>
          <span className="text-[13px]">{i + 1} / {paths.length}</span>
          <button onClick={() => setI((n) => Math.min(paths.length - 1, n + 1))} disabled={i === paths.length - 1} aria-label="Next photo" className="disabled:opacity-30"><ChevronRight size={26} /></button>
        </div>
      )}
    </div>
  );
}

type PostActions = {
  pop: string | null; setPop: (id: string | null) => void; onLike: (m: Moment) => void; onComment: (id: string, replyTo?: { id: string; name: string }) => void;
  onDelete: (m: Moment) => void; onDeleteComment: (id: string) => void; onPhotos: (paths: string[], i: number) => void; onProfile: (id: string) => void;
};

/** One post: name, text, photos / video / link, place, time, the "••" Like/Comment menu, and the likes and comments box. */
function Post({ m, a }: { m: Moment; a: PostActions }) {
  return (
    <div className="flex gap-3 border-b border-[var(--we-sep)] px-4 py-4">
      <SqAvatar name={m.author.name} color={m.author.color} size={42} onClick={() => a.onProfile(m.author.id)} />
      <div className="min-w-0 flex-1">
        <button onClick={() => a.onProfile(m.author.id)} className="text-[16px] font-semibold text-[var(--we-link)]">{m.author.name}</button>
        {m.body && <p className="mt-1 whitespace-pre-line break-words text-[16px] leading-snug text-[var(--we-text)]">{m.body}</p>}
        {m.images.length === 1 ? <Photo path={m.images[0]} className="mt-2 h-48 w-48" onOpen={() => a.onPhotos(m.images, 0)} />
          : m.images.length > 1 && (
            <div className={`mt-2 grid gap-1 ${m.images.length === 4 ? "w-[170px] grid-cols-2" : "w-[256px] grid-cols-3"}`}>
              {m.images.map((p, i) => <Photo key={p} path={p} className="aspect-square w-full" onOpen={() => a.onPhotos(m.images, i)} />)}
            </div>
          )}
        {m.video && <VideoPost video={m.video} />}
        {m.link && <LinkPost link={m.link} />}
        {m.location && <div className="mt-2 flex items-center gap-1 text-[13px] text-[var(--we-link)]"><MapPin size={12} />{m.location}</div>}
        <div className="relative mt-2 flex items-center gap-3 text-[13px] text-[var(--we-hint)]">
          <span>{ago(m.created_at)}</span>
          {m.link?.source && <span>{m.link.source}</span>}
          {m.visibility === "private" && <Lock size={12} aria-label="Only you can see this" />}
          {m.mine && <button onClick={() => a.onDelete(m)} className="text-[var(--we-link)]">Delete</button>}
          <button onClick={(e) => { e.stopPropagation(); a.setPop(a.pop === m.id ? null : m.id); }} aria-label="Like or comment" className="ml-auto flex h-5 w-8 items-center justify-center rounded-[3px] bg-[var(--we-bg)] text-[var(--we-link)]">••</button>
          <AnimatePresence>
            {a.pop === m.id && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} onClick={(e) => e.stopPropagation()} className="absolute right-10 top-1/2 flex -translate-y-1/2 items-center overflow-hidden rounded-[4px] bg-[var(--we-pop)] text-[14px] text-white">
                <button onClick={() => a.onLike(m)} className="flex items-center gap-1.5 px-5 py-2.5"><Heart size={16} className={m.liked ? "fill-[#FA5151] text-[#FA5151]" : ""} />{m.liked ? "Cancel" : "Like"}</button>
                <span className="h-5 w-px bg-white/20" />
                <button onClick={() => { a.setPop(null); a.onComment(m.id); }} className="flex items-center gap-1.5 px-5 py-2.5"><MessageSquare size={16} />Comment</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {(m.likes.length > 0 || m.comments.length > 0) && (
          <div className="relative mt-2 rounded-[3px] bg-[var(--we-bg)] text-[14px]">
            <span className="absolute -top-1.5 left-3 h-3 w-3 rotate-45 bg-[var(--we-bg)]" />
            {m.likes.length > 0 && <div className={`relative flex gap-1.5 px-2.5 py-1.5 text-[var(--we-link)] ${m.comments.length ? "border-b border-[var(--we-sep)]" : ""}`}><Heart size={14} className="mt-0.5 shrink-0" /><span>{m.likes.map((l) => l.name).join(", ")}</span></div>}
            {m.comments.length > 0 && <div className="relative space-y-0.5 px-2.5 py-1.5">{m.comments.map((c) => (
              <button key={c.id} onClick={() => (c.mine ? a.onDeleteComment(c.id) : a.onComment(m.id, c.user))} className="block w-full text-left leading-snug text-[var(--we-text)]">
                <span className="text-[var(--we-link)]">{c.user.name}</span>{c.reply_to && <> reply <span className="text-[var(--we-link)]">{c.reply_to.name}</span></>}: {c.body}
              </button>
            ))}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

type View = { k: "feed" } | { k: "inbox" } | { k: "post"; id: string };

export default function MomentsScreen({ userId, onBack }: { userId?: string; onBack: () => void }) {
  const { profile, flash, setOverlay } = useApp();
  const mine = !userId;
  const [items, setItems] = useState<Moment[] | null>(null);
  const [head, setHead] = useState<Awaited<ReturnType<typeof momentsHeader>>>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [popFor, setPopFor] = useState<string | null>(null);
  const [commenting, setCommenting] = useState<{ id: string; replyTo?: { id: string; name: string } } | null>(null);
  const [draft, setDraft] = useState("");
  const [emoji, setEmoji] = useState(false);
  const [composer, setComposer] = useState<null | { mode: "photos" | "video" | "text" | "link"; files: File[]; link?: MomentLink }>(null);
  const [picker, setPicker] = useState(false);
  const [viewer, setViewer] = useState<{ paths: string[]; i: number } | null>(null);
  const [view, setView] = useState<View>({ k: "feed" });
  const [one, setOne] = useState<Moment | null | undefined>(undefined);
  const [inbox, setInbox] = useState<MomentNotice[]>([]);
  const [seenAt, setSeenAt] = useState("");
  const [more, setMore] = useState(true);
  const [solid, setSolid] = useState(false);
  useBackLayer(!!composer, () => setComposer(null));
  useBackLayer(!!commenting, () => { setCommenting(null); setEmoji(false); });
  useBackLayer(!!popFor, () => setPopFor(null));
  useBackLayer(picker, () => setPicker(false));
  useBackLayer(!!viewer, () => setViewer(null));
  useBackLayer(view.k === "inbox", () => setView({ k: "feed" }));
  useBackLayer(view.k === "post", () => setView({ k: "inbox" }));
  const photosIn = useRef<HTMLInputElement>(null), videoIn = useRef<HTMLInputElement>(null), coverIn = useRef<HTMLInputElement>(null);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const [list, h] = await Promise.all([userId ? userMoments(userId) : momentsFeed(), momentsHeader(userId)]);
    setItems(list); setHead(h); setMore(list.length >= 20);
    if (h?.cover) void momentMediaUrl(h.cover).then(setCoverUrl);
  }, [userId]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => {
    if (!mine) return;
    void momentsInbox().then(setInbox);
    void Promise.resolve().then(() => {
      try { setSeenAt(localStorage.getItem(INBOX_SEEN) ?? ""); } catch { /* ignore */ }
      // Something shared into Moments from an article, post or video
      try { const raw = sessionStorage.getItem(SHARE_KEY); if (raw) { sessionStorage.removeItem(SHARE_KEY); setComposer({ mode: "link", files: [], link: JSON.parse(raw) }); } } catch { /* ignore */ }
    });
  }, [mine]);
  useEffect(() => { if (view.k === "post") void momentGet(view.id).then(setOne); }, [view]);
  const fresh = inbox.filter((n) => n.at > seenAt);
  const openInbox = () => { const at = inbox[0]?.at ?? new Date().toISOString(); try { localStorage.setItem(INBOX_SEEN, at); } catch { /* ignore */ } setSeenAt(at); setView({ k: "inbox" }); };

  // Sponsored posts: at most two a day, never for Birdie Plus (usePlacements returns none for Plus).
  const ads = usePlacements("card", "explore", mine);
  const [adDay] = useState(() => { try { return JSON.parse(localStorage.getItem(ADS_KEY) ?? "{}") as { day?: string; ids?: string[] }; } catch { return {}; } });
  const ad = useMemo(() => {
    const day = new Date().toDateString();
    const shown = adDay.day === day ? adDay.ids ?? [] : [];
    return ads.find((x) => shown.includes(x.id)) ?? (shown.length < 2 ? ads[0] : undefined);
  }, [ads, adDay]);
  const adSeen = (id: string) => {
    const day = new Date().toDateString();
    try { const cur = JSON.parse(localStorage.getItem(ADS_KEY) ?? "{}"); const ids: string[] = cur.day === day ? cur.ids ?? [] : []; if (!ids.includes(id)) localStorage.setItem(ADS_KEY, JSON.stringify({ day, ids: [...ids, id] })); } catch { /* ignore */ }
  };

  const replace = (m: Moment) => { setItems((xs) => (xs ?? []).map((x) => (x.id === m.id ? m : x))); setOne((o) => (o && o.id === m.id ? m : o)); };
  async function older() {
    if (!items?.length) return;
    const before = items[items.length - 1].created_at;
    const list = userId ? await userMoments(userId, before) : await momentsFeed(before);
    setMore(list.length >= 20); setItems((xs) => [...(xs ?? []), ...list]);
  }
  async function sendComment() {
    const t = draft.trim(); if (!t || !commenting) return;
    const r = await commentMoment(commenting.id, t, commenting.replyTo?.id);
    if (r.error) return flash("Couldn't comment");
    if (r.data) replace(r.data);
    setDraft(""); setCommenting(null); setEmoji(false);
  }
  async function changeCover(f?: File) {
    if (!f) return;
    const up = await uploadMomentPhoto(await shrink(f, 1600));
    if (!up.path) return flash(up.error ?? "Couldn't upload");
    await setMomentsCover(up.path); void momentMediaUrl(up.path).then(setCoverUrl); flash("Cover changed");
  }
  const actions: PostActions = {
    pop: popFor, setPop: setPopFor,
    onLike: async (m) => { setPopFor(null); const r = await likeMoment(m.id, !m.liked); if (r.data) replace(r.data); },
    onComment: (id, replyTo) => setCommenting({ id, replyTo }),
    onDelete: async (m) => { if (!confirm("Delete this post?")) return; await deleteMoment(m.id); setItems((xs) => (xs ?? []).filter((x) => x.id !== m.id)); if (view.k === "post") setOne(null); },
    onDeleteComment: async (id) => { if (!confirm("Delete your comment?")) return; await deleteMomentComment(id); void load(); if (view.k === "post") void momentGet(view.id).then(setOne); },
    onPhotos: (paths, i) => setViewer({ paths, i }),
    onProfile: (id) => setOverlay({ t: "contact", id }),
  };
  const name = mine ? profile.name || "Me" : head?.person.name ?? "";

  const commentBar = commenting && (
    <div className="absolute inset-x-0 bottom-0 z-30 border-t border-[var(--we-sep)] bg-[var(--we-bar)]">
      <div className="flex items-end gap-2 px-2 py-2">
        <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onFocus={() => setEmoji(false)} rows={1} placeholder={commenting.replyTo ? `Reply ${commenting.replyTo.name}` : "Comment"}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendComment(); } }}
          className="max-h-24 min-h-9 min-w-0 flex-1 resize-none rounded-[4px] bg-[var(--we-input)] px-2.5 py-[7px] text-[16px] text-[var(--we-text)] outline-none" />
        <button onClick={() => setEmoji((v) => !v)} aria-label="Emoji" className="mb-1.5 text-[var(--we-text)]"><Smile size={26} strokeWidth={1.5} /></button>
        <button onClick={() => void sendComment()} disabled={!draft.trim()} className="mb-[2px] h-8 rounded-[4px] bg-[var(--we-accent)] px-3 text-[14px] font-medium text-white disabled:opacity-40">Send</button>
      </div>
      {emoji && <div className="no-scrollbar grid h-[200px] grid-cols-8 gap-1 overflow-y-auto px-3 pb-3 text-[26px]">{EMOJIS.map((e) => <button key={e} onClick={() => setDraft((d) => d + e)} className="flex h-10 items-center justify-center active:scale-90">{e}</button>)}</div>}
    </div>
  );

  if (composer) return <Composer initial={composer} onCancel={() => setComposer(null)} onPosted={(m) => { setComposer(null); setItems((xs) => [m, ...(xs ?? [])]); }} />;
  if (view.k === "inbox") return <Inbox list={inbox} onBack={() => setView({ k: "feed" })} onOpen={(id) => { setOne(undefined); setView({ k: "post", id }); }} />;
  if (view.k === "post") return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[var(--we-cell)]" onClick={() => popFor && setPopFor(null)}>
      <WeHeader onBack={() => setView({ k: "inbox" })} title="Details" />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-24">
        {one === undefined ? <p className="py-10 text-center text-[13px] text-[var(--we-sub)]">Loading...</p> : one === null ? <p className="py-10 text-center text-[14px] text-[var(--we-sub)]">This post was deleted.</p> : <Post m={one} a={actions} />}
      </div>
      {commentBar}
      {viewer && <Viewer paths={viewer.paths} start={viewer.i} onClose={() => setViewer(null)} />}
    </div>
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[var(--we-cell)]" onClick={() => popFor && setPopFor(null)}>
      <div className={`absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between px-2 transition-colors ${solid ? "bg-[var(--we-bg)] text-[var(--we-text)]" : "text-white"}`}>
        <button onClick={onBack} aria-label="Back" className="flex h-10 w-10 items-center justify-center"><ChevronLeft size={26} /></button>
        <span className={`text-[16.5px] font-semibold ${solid ? "" : "opacity-0"}`}>{mine ? "Moments" : name}</span>
        {mine ? (
          <button aria-label="Post to Moments" className="flex h-10 w-10 items-center justify-center"
            onPointerDown={() => { press.current = setTimeout(() => { press.current = null; setComposer({ mode: "text", files: [] }); }, 550); }}
            onPointerUp={() => { if (press.current) { clearTimeout(press.current); press.current = null; setPicker(true); } }}
            onPointerLeave={() => { if (press.current) clearTimeout(press.current); }}><Camera size={22} /></button>
        ) : <span className="w-10" />}
      </div>
      <input ref={photosIn} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []).slice(0, 9); e.target.value = ""; if (f.length) setComposer({ mode: "photos", files: f }); }} />
      <input ref={videoIn} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setComposer({ mode: "video", files: [f] }); }} />
      <input ref={coverIn} type="file" accept="image/*" hidden onChange={(e) => { void changeCover(e.target.files?.[0]); e.target.value = ""; }} />

      <div onScroll={(e) => setSolid(e.currentTarget.scrollTop > 240)} className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-24">
        <div className="relative mb-12">
          <button onClick={() => mine && coverIn.current?.click()} className="block h-[300px] w-full overflow-hidden bg-[#3A3A3A]" aria-label={mine ? "Change cover" : "Cover"}>
            {coverUrl ? <img src={coverUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#4B2A5E] to-[#1E1428] text-[13px] text-white/50">{mine ? "Tap to change cover" : ""}</span>}
          </button>
          <div className="absolute -bottom-6 right-4 flex items-end gap-3">
            <span className="mb-8 text-[17px] font-semibold text-white drop-shadow">{name}</span>
            <SqAvatar name={name} color={mine ? "#8A2FA3" : head?.person.color} size={68} />
          </div>
        </div>
        {mine && fresh.length > 0 && (
          <button onClick={openInbox} className="mx-auto mb-4 flex items-center gap-2.5 rounded-[6px] bg-[var(--we-pop)] py-1.5 pl-1.5 pr-4 text-[14px] text-white">
            <SqAvatar name={fresh[0].user.name} color={fresh[0].user.color} size={30} />{fresh.length} new message{fresh.length === 1 ? "" : "s"}
          </button>
        )}
        {items === null ? <p className="py-10 text-center text-[13px] text-[var(--we-sub)]">Loading...</p>
          : items.length === 0 ? <p className="px-10 py-12 text-center text-[14px] leading-relaxed text-[var(--we-sub)]">{mine ? "Your friends' posts show here, newest first. You become friends with someone once you've both sent each other a message. Tap the camera to post." : head?.can_see ? "No posts yet." : "You can see their Moments once you're friends."}</p>
          : items.map((m, i) => (
            <div key={m.id}>
              <Post m={m} a={actions} />
              {mine && i === Math.min(2, items.length - 1) && ad && <MomentAd p={ad} onSeen={adSeen} />}
            </div>
          ))}
        {items && items.length > 0 && more && <button onClick={() => void older()} className="mx-auto mt-4 block text-[13px] text-[var(--we-link)]">Show earlier posts</button>}
        {mine && inbox.length > 0 && fresh.length === 0 && <button onClick={openInbox} className="mx-auto mt-4 block text-[13px] text-[var(--we-link)]">Messages</button>}
      </div>

      {commentBar}
      {picker && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/40" onClick={() => setPicker(false)}>
          <div className="w-full overflow-hidden rounded-t-[12px] bg-[var(--we-bg)] text-center text-[16px] text-[var(--we-text)]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setPicker(false); photosIn.current?.click(); }} className="block w-full border-b border-[var(--we-sep)] bg-[var(--we-cell)] py-4">Photos <span className="text-[13px] text-[var(--we-sub)]">(up to 9)</span></button>
            <button onClick={() => { setPicker(false); videoIn.current?.click(); }} className="block w-full border-b border-[var(--we-sep)] bg-[var(--we-cell)] py-4">Video</button>
            <button onClick={() => { setPicker(false); setComposer({ mode: "text", files: [] }); }} className="block w-full bg-[var(--we-cell)] py-4">Text Only</button>
            <button onClick={() => setPicker(false)} className="mt-2 block w-full bg-[var(--we-cell)] py-4 pb-6">Cancel</button>
          </div>
        </div>
      )}
      {viewer && <Viewer paths={viewer.paths} start={viewer.i} onClose={() => setViewer(null)} />}
    </div>
  );
}

/** Likes and comments on your posts, and replies to you. */
function Inbox({ list, onBack, onOpen }: { list: MomentNotice[]; onBack: () => void; onOpen: (id: string) => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-cell)]">
      <WeHeader onBack={onBack} title="Messages" />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {list.length === 0 ? <p className="py-16 text-center text-[14px] text-[var(--we-sub)]">No likes or comments yet</p> : list.map((n, i) => (
          <button key={i} onClick={() => onOpen(n.moment_id)} className="flex w-full gap-3 border-b border-[var(--we-sep)] px-4 py-3 text-left active:bg-black/5">
            <SqAvatar name={n.user.name} color={n.user.color} size={42} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] text-[var(--we-link)]">{n.user.name}</span>
              <span className="block text-[14.5px] text-[var(--we-text)]">{n.kind === "like" ? <Heart size={15} className="inline text-[var(--we-link)]" /> : n.body}</span>
              <span className="block text-[12px] text-[var(--we-hint)]">{ago(n.at)}{n.kind === "reply" ? " · replied to you" : ""}</span>
            </span>
            {n.moment.image || n.moment.video ? <MomentThumb path={(n.moment.image ?? n.moment.video)!} size={56} /> : <span className="line-clamp-3 w-14 shrink-0 bg-[var(--we-bg)] p-1 text-[11px] leading-tight text-[var(--we-sub)]">{n.moment.body}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A video's first frame as its cover, plus its length. */
async function videoCover(file: File): Promise<{ poster: Blob | null; seconds: number }> {
  return new Promise((resolve) => {
    const v = document.createElement("video"); const url = URL.createObjectURL(file);
    let done = false; const finish = (r: { poster: Blob | null; seconds: number }) => { if (done) return; done = true; URL.revokeObjectURL(url); resolve(r); };
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    v.onloadeddata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); };
    v.onseeked = () => {
      const c = document.createElement("canvas"); const w = Math.min(720, v.videoWidth || 720); c.width = w; c.height = Math.round(((v.videoHeight || 960) / (v.videoWidth || 720)) * w);
      c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
      c.toBlob((b) => finish({ poster: b, seconds: Math.round(v.duration || 0) }), "image/jpeg", 0.8);
    };
    v.onerror = () => finish({ poster: null, seconds: 0 });
    setTimeout(() => finish({ poster: null, seconds: Math.round(v.duration || 0) }), 8000);
  });
}

function Composer({ initial, onCancel, onPosted }: { initial: { mode: "photos" | "video" | "text" | "link"; files: File[]; link?: MomentLink }; onCancel: () => void; onPosted: (m: Moment) => void }) {
  const { flash, profile } = useApp();
  const [files, setFiles] = useState<File[]>(initial.files);
  const [text, setText] = useState("");
  const [loc, setLoc] = useState<string | null>(null);
  const [vis, setVis] = useState<"friends" | "private">("friends");
  const [busy, setBusy] = useState<string | null>(null);
  const add = useRef<HTMLInputElement>(null);
  const isVideo = initial.mode === "video";
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  async function post() {
    const paths: string[] = [];
    let video: MomentVideo | null = null;
    if (isVideo && files[0]) {
      setBusy("Uploading video...");
      const { poster, seconds } = await videoCover(files[0]);
      const up = await uploadMomentPhoto(files[0]);
      if (!up.path) { setBusy(null); return flash(up.error ?? "Couldn't upload the video"); }
      const pp = poster ? await uploadMomentPhoto(new File([poster], "cover.jpg", { type: "image/jpeg" })) : {};
      video = { path: up.path, poster: pp.path ?? null, seconds };
    } else {
      for (const [i, f] of files.entries()) {
        setBusy(`Uploading photo ${i + 1} of ${files.length}...`);
        const up = await uploadMomentPhoto(await shrink(f, 1600));
        if (!up.path) { setBusy(null); return flash(up.error ?? "Couldn't upload a photo"); }
        paths.push(up.path);
      }
    }
    setBusy("Posting...");
    const r = await postMoment(text, { images: paths, location: loc, video, link: initial.link ?? null, visibility: vis });
    setBusy(null);
    if (r.error || !r.data) return flash(r.error === "slow_down" ? "You've posted a lot today" : "Couldn't post");
    onPosted(r.data);
  }
  const empty = !text.trim() && files.length === 0 && !initial.link;
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-cell)]">
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        <button onClick={onCancel} className="text-[16px] text-[var(--we-text)]">Cancel</button>
        <button onClick={() => void post()} disabled={!!busy || empty} className="rounded-[4px] bg-[var(--we-accent)] px-3.5 py-1.5 text-[14px] font-medium text-white disabled:opacity-40">{busy ? "Posting..." : "Post"}</button>
      </div>
      {busy && <div className="bg-[var(--we-bg)] py-1 text-center text-[12px] text-[var(--we-sub)]">{busy}</div>}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5">
        <textarea autoFocus value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={4} placeholder={initial.link ? "Say something about this..." : "Say something..."} className="mt-2 w-full resize-none bg-transparent text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
        {initial.link && <LinkPost link={initial.link} />}
        {isVideo && previews[0] && <video src={previews[0]} controls playsInline className="mt-2 max-h-72 w-[200px] bg-black" />}
        {initial.mode === "photos" && (
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {previews.map((u, i) => (
              <span key={u} className="relative aspect-square overflow-hidden bg-[var(--we-sep)]"><img src={u} alt="" className="h-full w-full object-cover" />
                <button onClick={() => setFiles((f) => f.filter((_, j) => j !== i))} aria-label="Remove photo" className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white"><X size={14} /></button></span>
            ))}
            {files.length < 9 && <button onClick={() => add.current?.click()} aria-label="Add photo" className="flex aspect-square items-center justify-center bg-[var(--we-bg)] text-[var(--we-hint)]"><Plus size={34} strokeWidth={1.4} /></button>}
          </div>
        )}
        <input ref={add} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; setFiles((x) => [...x, ...f].slice(0, 9)); }} />
        <div className="mt-8 border-t border-[var(--we-sep)]">
          <button onClick={() => setLoc(loc ? null : prompt("Where are you?", profile.institution || "") || null)} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] py-4 text-left text-[16px] text-[var(--we-text)]">
            <MapPin size={20} /><span className="flex-1">{loc ?? "Location"}</span>{loc && <X size={16} className="text-[var(--we-sub)]" />}
          </button>
          <button onClick={() => setVis((v) => (v === "friends" ? "private" : "friends"))} className="flex w-full items-center gap-3 py-4 text-left text-[16px] text-[var(--we-text)]">
            {vis === "friends" ? <Users size={20} /> : <Lock size={20} />}<span className="flex-1">Visible to</span><span className="text-[var(--we-sub)]">{vis === "friends" ? "Friends" : "Only Me"}</span><ChevronRight size={18} className="text-[var(--we-hint)]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export { MomentThumb };
