"use client";

// Moments, like WeChat's: a cover photo with your name and avatar, then your friends' posts newest first
// (no algorithm). Up to 9 photos per post. Likes and comments only show from people who are your
// friends too. Tap the camera to post; hold it to post text only.
import { useBackLayer } from "./nav";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronLeft, Heart, MapPin, MessageSquare, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shrink } from "./ChatRoom";
import { MomentThumb } from "./Contact";
import { commentMoment, deleteMoment, deleteMomentComment, likeMoment, momentMediaUrl, momentsFeed, momentsHeader, postMoment, setMomentsCover, uploadMomentPhoto, userMoments, type Moment } from "./live/chatData";
import { useApp } from "./store";
import { SqAvatar } from "./we";

export function ago(t: string) {
  const s = (Date.now() - new Date(t).getTime()) / 1000;
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min(s) ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr(s) ago`;
  if (s < 172800) return "Yesterday";
  return new Date(t).toLocaleDateString([], { day: "numeric", month: "short", year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

function Photo({ path, className, onOpen }: { path: string; className: string; onOpen: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let on = true; void momentMediaUrl(path).then((u) => { if (on) setUrl(u); }); return () => { on = false; }; }, [path]);
  return <button onClick={() => url && onOpen(url)} className={`block overflow-hidden bg-[var(--we-sep)] ${className}`} aria-label="Open photo">{url && <img src={url} alt="" className="h-full w-full object-cover" />}</button>;
}

export default function MomentsScreen({ userId, onBack }: { userId?: string; onBack: () => void }) {
  const { profile, flash, setOverlay, openFile } = useApp();
  const [items, setItems] = useState<Moment[] | null>(null);
  const [head, setHead] = useState<Awaited<ReturnType<typeof momentsHeader>>>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [popFor, setPopFor] = useState<string | null>(null);
  const [commenting, setCommenting] = useState<{ id: string; replyTo?: { id: string; name: string } } | null>(null);
  const [draft, setDraft] = useState("");
  const [composer, setComposer] = useState<null | { textOnly: boolean; files: File[] }>(null);
  useBackLayer(!!composer, () => setComposer(null));
  useBackLayer(!!commenting, () => setCommenting(null));
  useBackLayer(!!popFor, () => setPopFor(null));
  const [more, setMore] = useState(true);
  const [solid, setSolid] = useState(false);
  const pick = useRef<HTMLInputElement>(null), coverIn = useRef<HTMLInputElement>(null);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mine = !userId;

  const load = useCallback(async () => {
    const [list, h] = await Promise.all([userId ? userMoments(userId) : momentsFeed(), momentsHeader(userId)]);
    setItems(list); setHead(h); setMore(list.length >= 20);
    if (h?.cover) void momentMediaUrl(h.cover).then(setCoverUrl);
  }, [userId]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const replace = (m: Moment) => setItems((xs) => (xs ?? []).map((x) => (x.id === m.id ? m : x)));
  async function older() {
    if (!items?.length) return;
    const before = items[items.length - 1].created_at;
    const list = userId ? await userMoments(userId, before) : await momentsFeed(before);
    setMore(list.length >= 20); setItems((xs) => [...(xs ?? []), ...list]);
  }
  async function like(m: Moment) { setPopFor(null); const r = await likeMoment(m.id, !m.liked); if (r.data) replace(r.data); }
  async function sendComment() {
    const t = draft.trim(); if (!t || !commenting) return;
    const r = await commentMoment(commenting.id, t, commenting.replyTo?.id);
    if (r.error) return flash("Couldn't comment");
    if (r.data) replace(r.data);
    setDraft(""); setCommenting(null);
  }
  async function changeCover(f?: File) {
    if (!f) return;
    const up = await uploadMomentPhoto(await shrink(f, 1600));
    if (!up.path) return flash(up.error ?? "Couldn't upload");
    await setMomentsCover(up.path); void momentMediaUrl(up.path).then(setCoverUrl); flash("Cover changed");
  }
  const name = mine ? profile.name || "Me" : head?.person.name ?? "";

  if (composer) return <Composer initial={composer.files} textOnly={composer.textOnly} onCancel={() => setComposer(null)} onPosted={(m) => { setComposer(null); setItems((xs) => [m, ...(xs ?? [])]); }} />;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[var(--we-cell)]" onClick={() => popFor && setPopFor(null)}>
      <div className={`absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between px-2 transition-colors ${solid ? "bg-[var(--we-bg)] text-[var(--we-text)]" : "text-white"}`}>
        <button onClick={onBack} aria-label="Back" className="flex h-10 w-10 items-center justify-center"><ChevronLeft size={26} /></button>
        <span className={`text-[16.5px] font-semibold ${solid ? "" : "opacity-0"}`}>{mine ? "Moments" : name}</span>
        {mine ? (
          <button aria-label="Post to Moments" className="flex h-10 w-10 items-center justify-center"
            onPointerDown={() => { press.current = setTimeout(() => { press.current = null; setComposer({ textOnly: true, files: [] }); }, 550); }}
            onPointerUp={() => { if (press.current) { clearTimeout(press.current); press.current = null; pick.current?.click(); } }}
            onPointerLeave={() => { if (press.current) clearTimeout(press.current); }}><Camera size={22} /></button>
        ) : <span className="w-10" />}
      </div>
      <input ref={pick} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []).slice(0, 9); e.target.value = ""; if (f.length) setComposer({ textOnly: false, files: f }); }} />
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
        {items === null ? <p className="py-10 text-center text-[13px] text-[var(--we-sub)]">Loading...</p>
          : items.length === 0 ? <p className="px-10 py-12 text-center text-[14px] leading-relaxed text-[var(--we-sub)]">{mine ? "Your friends' posts show here. You become friends with someone once you've both sent each other a message. Tap the camera to post." : head?.can_see ? "No posts yet." : "You can see their Moments once you're friends."}</p>
          : items.map((m) => (
            <div key={m.id} className="flex gap-3 border-b border-[var(--we-sep)] px-4 py-4">
              <SqAvatar name={m.author.name} color={m.author.color} size={42} onClick={() => setOverlay({ t: "contact", id: m.author.id })} />
              <div className="min-w-0 flex-1">
                <button onClick={() => setOverlay({ t: "contact", id: m.author.id })} className="text-[16px] font-semibold text-[var(--we-link)]">{m.author.name}</button>
                {m.body && <p className="mt-1 whitespace-pre-line break-words text-[16px] leading-snug text-[var(--we-text)]">{m.body}</p>}
                {m.images.length === 1 ? <Photo path={m.images[0]} className="mt-2 h-48 w-48" onOpen={(u) => openFile({ name: "Photo.jpg", url: u })} />
                  : m.images.length > 1 && (
                    <div className={`mt-2 grid gap-1 ${m.images.length === 4 ? "w-[170px] grid-cols-2" : "w-[256px] grid-cols-3"}`}>
                      {m.images.map((p) => <Photo key={p} path={p} className="aspect-square w-full" onOpen={(u) => openFile({ name: "Photo.jpg", url: u })} />)}
                    </div>
                  )}
                {m.location && <div className="mt-2 flex items-center gap-1 text-[13px] text-[var(--we-link)]"><MapPin size={12} />{m.location}</div>}
                <div className="relative mt-2 flex items-center gap-3 text-[13px] text-[var(--we-hint)]">
                  <span>{ago(m.created_at)}</span>
                  {m.mine && <button onClick={async () => { if (!confirm("Delete this post?")) return; await deleteMoment(m.id); setItems((xs) => (xs ?? []).filter((x) => x.id !== m.id)); }} className="text-[var(--we-link)]">Delete</button>}
                  <button onClick={(e) => { e.stopPropagation(); setPopFor(popFor === m.id ? null : m.id); }} aria-label="Like or comment" className="ml-auto flex h-5 w-8 items-center justify-center rounded-[3px] bg-[var(--we-bg)] text-[var(--we-link)]">••</button>
                  <AnimatePresence>
                    {popFor === m.id && (
                      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} onClick={(e) => e.stopPropagation()} className="absolute right-10 top-1/2 flex -translate-y-1/2 items-center overflow-hidden rounded-[4px] bg-[var(--we-pop)] text-[14px] text-white">
                        <button onClick={() => void like(m)} className="flex items-center gap-1.5 px-5 py-2.5"><Heart size={16} className={m.liked ? "fill-[#FA5151] text-[#FA5151]" : ""} />{m.liked ? "Cancel" : "Like"}</button>
                        <span className="h-5 w-px bg-white/20" />
                        <button onClick={() => { setPopFor(null); setCommenting({ id: m.id }); }} className="flex items-center gap-1.5 px-5 py-2.5"><MessageSquare size={16} />Comment</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {(m.likes.length > 0 || m.comments.length > 0) && (
                  <div className="relative mt-2 rounded-[3px] bg-[var(--we-bg)] text-[14px]">
                    <span className="absolute -top-1.5 left-3 h-3 w-3 rotate-45 bg-[var(--we-bg)]" />
                    {m.likes.length > 0 && <div className={`relative flex gap-1.5 px-2.5 py-1.5 text-[var(--we-link)] ${m.comments.length ? "border-b border-[var(--we-sep)]" : ""}`}><Heart size={14} className="mt-0.5 shrink-0" /><span>{m.likes.map((l) => l.name).join(", ")}</span></div>}
                    {m.comments.length > 0 && <div className="relative space-y-0.5 px-2.5 py-1.5">{m.comments.map((c) => (
                      <button key={c.id} onClick={() => (c.mine ? (confirm("Delete your comment?") && void deleteMomentComment(c.id).then(() => void load())) : setCommenting({ id: m.id, replyTo: c.user }))} className="block w-full text-left leading-snug text-[var(--we-text)]">
                        <span className="text-[var(--we-link)]">{c.user.name}</span>{c.reply_to && <> reply <span className="text-[var(--we-link)]">{c.reply_to.name}</span></>}: {c.body}
                      </button>
                    ))}</div>}
                  </div>
                )}
              </div>
            </div>
          ))}
        {items && items.length > 0 && more && <button onClick={() => void older()} className="mx-auto mt-4 block text-[13px] text-[var(--we-link)]">Show earlier posts</button>}
      </div>

      {commenting && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-end gap-2 border-t border-[var(--we-sep)] bg-[var(--we-bar)] px-2 py-2">
          <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} rows={1} placeholder={commenting.replyTo ? `Reply ${commenting.replyTo.name}` : "Comment"}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendComment(); } }}
            className="max-h-24 min-h-9 min-w-0 flex-1 resize-none rounded-[4px] bg-[var(--we-input)] px-2.5 py-[7px] text-[16px] text-[var(--we-text)] outline-none" />
          <button onClick={() => { setCommenting(null); setDraft(""); }} aria-label="Cancel" className="mb-1.5 text-[var(--we-sub)]"><X size={22} /></button>
          <button onClick={() => void sendComment()} disabled={!draft.trim()} className="mb-[2px] h-8 rounded-[4px] bg-[var(--we-accent)] px-3 text-[14px] font-medium text-white disabled:opacity-40">Send</button>
        </div>
      )}
    </div>
  );
}

function Composer({ initial, textOnly, onCancel, onPosted }: { initial: File[]; textOnly: boolean; onCancel: () => void; onPosted: (m: Moment) => void }) {
  const { flash, profile } = useApp();
  const [files, setFiles] = useState<File[]>(initial);
  const [text, setText] = useState("");
  const [loc, setLoc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const add = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  async function post() {
    setBusy(true);
    const paths: string[] = [];
    for (const f of files) {
      const up = await uploadMomentPhoto(await shrink(f, 1600));
      if (!up.path) { setBusy(false); return flash(up.error ?? "Couldn't upload a photo"); }
      paths.push(up.path);
    }
    const r = await postMoment(text, paths, loc);
    setBusy(false);
    if (r.error || !r.data) return flash(r.error === "slow_down" ? "You've posted a lot today" : "Couldn't post");
    onPosted(r.data);
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-cell)]">
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        <button onClick={onCancel} className="text-[16px] text-[var(--we-text)]">Cancel</button>
        <button onClick={() => void post()} disabled={busy || (!text.trim() && files.length === 0)} className="rounded-[4px] bg-[var(--we-accent)] px-3.5 py-1.5 text-[14px] font-medium text-white disabled:opacity-40">{busy ? "Posting..." : "Post"}</button>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5">
        <textarea autoFocus value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={4} placeholder="Say something..." className="mt-2 w-full resize-none bg-transparent text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
        {!textOnly && (
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
          <button onClick={() => setLoc(loc ? null : profile.institution || prompt("Where are you?") || null)} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] py-4 text-left text-[16px] text-[var(--we-text)]">
            <MapPin size={20} /><span className="flex-1">{loc ?? "Location"}</span>{loc && <X size={16} className="text-[var(--we-sub)]" />}
          </button>
          <div className="flex items-center gap-3 py-4 text-[16px] text-[var(--we-text)]"><span className="w-5" /><span className="flex-1">Visible to</span><span className="text-[var(--we-sub)]">Friends</span></div>
        </div>
      </div>
    </div>
  );
}

export { MomentThumb };
