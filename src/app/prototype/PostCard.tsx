"use client";

import { Heart, MoreHorizontal, Pin, Play, Volume2, VolumeX } from "lucide-react";
import { useRef, useState } from "react";
import { useApp, type Post } from "./store";
import { SponsoredCard, usePlacements } from "./Sponsored";
import { PostMenu } from "./PostMenu";
import { Avatar } from "./ui";

export const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };
export const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase() || "?";

/** One post per row, YouTube-style. Videos preview on hover (if Autoplay is on in Settings). */
export default function PostCard({ post, onProfile }: { post: Post; onProfile: (id: string) => void }) {
  const { settings, toggleLike, personById, profile } = useApp();
  const v = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [ended, setEnded] = useState(false);
  const [ytOn, setYtOn] = useState(false);
  const [menu, setMenu] = useState(false);
  const endCards = usePlacements("card", "video_end", post.kind === "video" && !post.youtubeId);
  const endCard = endCards.length ? endCards[post.id.charCodeAt(0) % endCards.length] : null;
  // One sponsor card after a long video the student actually watched (sound on), never mid-video,
  // never on short clips or the muted hover preview.
  const onEnded = () => { const el = v.current; if (el && !el.muted && el.duration >= 60 && endCard) { setEnded(true); setPlaying(false); } };
  const isMe = post.authorId === "me";
  const a = isMe ? { name: profile.name || "You", color: "#A63FBD" } : personById(post.authorId) ?? { name: "Unknown", color: "#7C4DDB" };

  const play = () => { const el = v.current; if (!el) return; el.play().then(() => setPlaying(true)).catch(() => undefined); };
  const stop = () => { const el = v.current; if (!el) return; el.pause(); el.currentTime = 0; setPlaying(false); };

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
      {post.youtubeId ? (
        // Embedded through YouTube's own player (thumbnail until tapped, so the feed stays light).
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          {ytOn ? (
            <iframe src={`https://www.youtube-nocookie.com/embed/${post.youtubeId}?autoplay=1&rel=0&playsinline=1`} title={post.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 h-full w-full border-0" />
          ) : (
            <button onClick={() => setYtOn(true)} aria-label={`Play ${post.title}`} className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail */}
              <img src={`https://i.ytimg.com/vi/${post.youtubeId}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[var(--ink)]"><Play size={20} className="ml-0.5 fill-[var(--ink)]" /></span></span>
            </button>
          )}
        </div>
      ) : post.kind === "video" ? (
        <div
          className={`relative aspect-video w-full cursor-pointer overflow-hidden bg-gradient-to-br ${post.grad}`}
          onMouseEnter={() => settings.autoplay && !settings.dataSaver && !failed && play()}
          onMouseLeave={() => settings.autoplay && !settings.dataSaver && stop()}
          onClick={() => (playing ? (setMuted(false), v.current && (v.current.muted = false)) : play())}
        >
          {!failed && post.videoUrl && <video ref={v} src={post.videoUrl} muted={muted} loop={muted} playsInline preload={settings.dataSaver ? "none" : "metadata"} onEnded={onEnded} onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />}
          {ended && endCard && (
            <div onClick={(e) => e.stopPropagation()} className="absolute inset-0 z-10 flex flex-col justify-center gap-2 bg-black/70 p-3">
              <SponsoredCard p={endCard} dark />
              <button onClick={() => { setEnded(false); const el = v.current; if (el) { el.currentTime = 0; void el.play().then(() => setPlaying(true)); } }} className="self-center rounded-full bg-white/20 px-3.5 py-1.5 text-[12px] font-semibold text-white">Replay</button>
            </div>
          )}
          {!playing && !ended && (<div className="absolute inset-0 flex items-center justify-center bg-black/10"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[var(--ink)]"><Play size={20} className="ml-0.5 fill-[var(--ink)]" /></span></div>)}
          {post.dur && <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white">{post.dur}</span>}
          {playing && <button onClick={(e) => { e.stopPropagation(); setMuted((m) => { if (v.current) v.current.muted = !m; return !m; }); }} aria-label={muted ? "Unmute" : "Mute"} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white">{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>}
        </div>
      ) : (
        <button onClick={() => setOpen((o) => !o)} className={`block w-full bg-gradient-to-br ${post.grad} p-4 text-left text-white`}>
          <div className="disp text-[16px] font-bold leading-snug">{post.title}</div>
          <p className={`mt-1.5 text-[13px] leading-snug text-white/85 ${open ? "" : "line-clamp-3"}`}>{post.body}</p>
        </button>
      )}
      <div className="flex gap-3 p-3">
        <button onClick={() => !isMe && onProfile(post.authorId)} aria-label="Open profile"><Avatar initials={initials(a.name)} color={a.color} size={36} /></button>
        <div className="min-w-0 flex-1">
          {post.pinnedAt && <div className="mb-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--study)]"><Pin size={11} /> Pinned</div>}
          {post.kind === "video" && <div className="line-clamp-2 text-[14px] font-semibold leading-snug text-[var(--text)]">{post.title}</div>}
          <div className="mt-0.5 text-[12px] text-[var(--dim)]">{post.sourceName ? <>From YouTube · <b className="font-semibold text-[var(--text)]">{post.sourceName}</b></> : a.name} · {post.field} · {ago(post.createdAt)}</div>
          {post.tags.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{post.tags.map((t) => (<span key={t} className="rounded-full bg-[var(--paper-dim)] px-2 py-0.5 text-[11px] font-semibold text-[var(--dim)]">#{t}</span>))}</div>}
        </div>
        <div className="flex flex-col items-center gap-1">
          <button onClick={() => toggleLike(post.id)} aria-label="Like" className="flex flex-col items-center text-[11px] font-semibold text-[var(--dim)] active:scale-90"><Heart size={18} className={post.liked ? "fill-[var(--birdie)] text-[var(--birdie)]" : ""} />{post.likes}</button>
          <button onClick={() => setMenu(true)} aria-label="More options" className="text-[var(--dim)] active:scale-90"><MoreHorizontal size={18} /></button>
        </div>
      </div>
      {menu && <PostMenu post={post} open={menu} onClose={() => setMenu(false)} />}
    </article>
  );
}
