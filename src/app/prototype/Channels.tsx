"use client";

// Discover > Channels, like WeChat Channels (and TikTok): full-screen short videos you swipe up through.
// Following (people you follow), Friends (people you chat with) and Hot (recommended for you).
// Thumbs up tells the algorithm (and the creator) you liked it; share sends it to Moments or a chat;
// comments open the post's comments. Videos play on their own as they come into view.
import { ChevronLeft, MessageCircle, MoreHorizontal, Play, Search, Share2, ThumbsUp, UserRound, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CommentsPanel } from "./Comments";
import { myDms } from "./live/chatData";
import { logPostEvent } from "./live/recData";
import { shareToMoments } from "./Moments";
import { PostMenu } from "./PostMenu";
import { initials } from "./PostCard";
import { useApp, type Post } from "./store";

type Tab = "following" | "friends" | "hot";
const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

function Slide({ post, active, muted, onUnmute }: { post: Post; active: boolean; muted: boolean; onUnmute: () => void }) {
  const vid = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const v = vid.current; if (!v) return;
    if (active && !paused) void v.play().catch(() => {}); else v.pause();
  }, [active, paused]);
  useEffect(() => { void Promise.resolve().then(() => setPaused(false)); }, [active]);
  if (post.youtubeId) return active
    ? <iframe key={post.id} src={`https://www.youtube-nocookie.com/embed/${post.youtubeId}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${post.youtubeId}&rel=0&playsinline=1&modestbranding=1&controls=0`} title={post.title} allow="autoplay; encrypted-media" className="absolute inset-0 h-full w-full border-0" />
    : <img src={`https://i.ytimg.com/vi/${post.youtubeId}/hqdefault.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" />;
  if (post.videoUrl) return (
    <button onClick={() => (muted ? onUnmute() : setPaused((p) => !p))} className="absolute inset-0 block" aria-label={paused ? "Play" : "Pause"}>
      <video ref={vid} src={active ? post.videoUrl : `${post.videoUrl}#t=0.5`} muted={muted} loop playsInline preload={active ? "auto" : "metadata"} className="h-full w-full object-contain" />
      {paused && <span className="absolute inset-0 flex items-center justify-center"><Play size={64} className="fill-white/80 text-white/80" /></span>}
    </button>
  );
  // A text post fills the screen like a story card.
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8" style={{ background: post.grad || "linear-gradient(135deg,#4B2A5E,#1E1428)" }}>
      <div className="max-h-[70%] overflow-hidden text-center">
        <div className="text-[24px] font-bold leading-tight text-white">{post.title}</div>
        {post.body && <div className="mt-3 line-clamp-[10] whitespace-pre-line text-[16px] leading-snug text-white/90">{post.body}</div>}
      </div>
    </div>
  );
}

export default function Channels({ active, onBack, onSearch }: { active: boolean; onBack: () => void; onSearch: () => void }) {
  const { posts, forYou, following, personById, toggleFollow, toggleLike, profile, auth, setOverlay, setAuthOpen, setTab: setAppTab, setDiscoverView, refreshFeed, loadMoreFeed, loadForYou, flash } = useApp();
  const [tab, setTab] = useState<Tab>("hot");
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [cur, setCur] = useState(0);
  const [muted, setMuted] = useState(true);
  const [comments, setComments] = useState<Post | null>(null);
  const [menu, setMenu] = useState<Post | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const me = auth.userId;

  useEffect(() => { if (!active) return; void refreshFeed(); void loadForYou(true); if (auth.status === "in") void myDms().then((d) => setFriendIds(d.map((x) => x.other.id))); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = useMemo(() => {
    const byId = new Map(posts.map((p) => [p.id, p]));
    if (tab === "following") return posts.filter((p) => following.includes(p.authorId));
    if (tab === "friends") return posts.filter((p) => friendIds.includes(p.authorId));
    const ranked = forYou.map((r) => byId.get(r.id)).filter(Boolean) as Post[];
    const seen = new Set(ranked.map((p) => p.id));
    return [...ranked, ...posts.filter((p) => !seen.has(p.id))];
  }, [tab, posts, forYou, following, friendIds]);
  const post = list[cur];
  useEffect(() => { box.current?.scrollTo({ top: 0 }); void Promise.resolve().then(() => setCur(0)); }, [tab]);
  useEffect(() => { if (active && post?.remote) void logPostEvent(post.id, "view"); }, [active, post?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Near the end: fetch more.
  useEffect(() => { if (tab === "hot" && list.length && cur >= list.length - 3) { void loadMoreFeed(); void loadForYou(false); } }, [cur, list.length, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => { const el = e.currentTarget; const i = Math.round(el.scrollTop / Math.max(1, el.clientHeight)); if (i !== cur) setCur(i); };
  const author = (p: Post) => { const a = personById(p.authorId); return { name: p.authorId === me ? profile.name || "Me" : a?.name ?? p.sourceName ?? "Birdie creator", color: a?.color ?? "#7C4DDB" }; };
  const need = (f: () => void) => () => (auth.status === "in" ? f() : setAuthOpen(true));
  function share(p: Post) {
    const link = { url: `${window.location.origin}/prototype?watch=${p.id}`, title: p.title, thumb: p.youtubeId ? `https://i.ytimg.com/vi/${p.youtubeId}/mqdefault.jpg` : null, source: "Channels" };
    shareToMoments(link, { setTab: setAppTab, setDiscoverView, setOverlay });
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-black text-white">
      <div className="absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between bg-gradient-to-b from-black/50 to-transparent px-1">
        <button onClick={onBack} aria-label="Back" className="flex h-10 w-10 items-center justify-center"><ChevronLeft size={26} /></button>
        <div className="flex items-center gap-5 text-[16px]">
          {([["following", "Following"], ["friends", "Friends"], ["hot", "Hot"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`relative pb-1 ${tab === id ? "font-semibold text-white" : "text-white/65"}`}>{label}{tab === id && <span className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded bg-white" />}</button>
          ))}
        </div>
        <div className="flex items-center">
          <button onClick={onSearch} aria-label="Search" className="flex h-10 w-9 items-center justify-center"><Search size={21} /></button>
          <button onClick={need(() => setOverlay({ t: "profile", id: "me" }))} aria-label="My channel" className="flex h-10 w-9 items-center justify-center"><UserRound size={21} /></button>
        </div>
      </div>

      <div ref={box} onScroll={onScroll} className="no-scrollbar min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto">
        {list.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-10 text-center text-[14px] text-white/70">
            {tab === "following" ? "Follow creators and their videos show here." : tab === "friends" ? "Videos from people you chat with show here." : "No videos yet. Be the first: tap the person icon to open your channel and post."}
          </div>
        ) : list.map((p, i) => {
          const a = author(p);
          const near = Math.abs(i - cur) <= 1;
          return (
            <section key={p.id} className="relative h-full w-full snap-start snap-always overflow-hidden">
              {near ? <Slide post={p} active={active && i === cur} muted={muted} onUnmute={() => setMuted(false)} /> : null}
              {(p.videoUrl || p.youtubeId) && i === cur && (
                <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Sound on" : "Sound off"} className="absolute right-3 top-14 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/35">{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pb-3 pt-24">
                <div className="pointer-events-auto mb-2 line-clamp-3 text-[15px] leading-snug">{p.kind === "video" ? p.title : p.body ? p.title : ""}{p.tags?.length ? <span className="text-white/80"> {p.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}</span> : null}</div>
                <div className="pointer-events-auto flex items-center gap-2.5">
                  <button onClick={() => setOverlay({ t: "profile", id: p.authorId === me ? "me" : p.authorId })} className="flex min-w-0 items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold" style={{ background: a.color }}>{initials(a.name)}</span>
                    <span className="max-w-[110px] truncate text-[14.5px]">{a.name}</span>
                  </button>
                  {p.authorId !== me && !following.includes(p.authorId) && p.remote && <button onClick={need(() => toggleFollow(p.authorId))} className="shrink-0 rounded-[4px] bg-[var(--we-accent)] px-2.5 py-1 text-[13px] font-medium">+Follow</button>}
                  <div className="ml-auto flex items-center gap-4">
                    <button onClick={need(() => toggleLike(p.id))} aria-label="Like" className="flex flex-col items-center text-[11.5px]"><ThumbsUp size={24} className={p.liked ? "fill-[#FA9D3B] text-[#FA9D3B]" : ""} />{fmt(p.likes)}</button>
                    <button onClick={need(() => share(p))} aria-label="Share" className="flex flex-col items-center text-[11.5px]"><Share2 size={24} />Share</button>
                    <button onClick={() => (p.remote ? setComments(p) : flash("Comments open once it's posted"))} aria-label="Comments" className="flex flex-col items-center text-[11.5px]"><MessageCircle size={24} />{fmt(p.comments ?? 0)}</button>
                    <button onClick={() => setMenu(p)} aria-label="More" className="flex flex-col items-center text-[11.5px]"><MoreHorizontal size={24} />More</button>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      {comments && <CommentsPanel post={comments} open onClose={() => setComments(null)} onProfile={(id) => { setComments(null); setOverlay({ t: "profile", id }); }} />}
      {menu && <PostMenu post={menu} open onClose={() => setMenu(null)} />}
    </div>
  );
}
