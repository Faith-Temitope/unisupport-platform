"use client";

// Discover > Channels, like WeChat Channels (and TikTok): full-screen short videos you swipe up through.
// Following (people you follow), Friends (people you chat with) and Hot (recommended for you).
// Thumbs up tells the algorithm (and the creator) you liked it; the heart is public, so your friends
// see you hearted it. Double-tap the left or right side to go back or forward 10 seconds, drag the bar
// to scrub, CC turns subtitles on, and Download keeps an uploaded video on the phone (Settings > Downloads).
import { Captions, CheckCircle2, ChevronLeft, Download, Heart, MessageCircle, MoreHorizontal, Play, Search, Share2, ThumbsUp, UserRound, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommentsPanel } from "./Comments";
import { Downloads } from "./Downloads";
import { myDms } from "./live/chatData";
import { heartPost, postHeartsInfo, type Hearts } from "./live/notifyData";
import { logPostEvent } from "./live/recData";
import { shareToMoments } from "./Moments";
import { offlineUrl, saveOffline, useOfflineIndex } from "./offline";
import { PostMenu } from "./PostMenu";
import { initials } from "./PostCard";
import { useApp, type Post } from "./store";
import { Page } from "./ui";

type Tab = "following" | "friends" | "hot";
const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const readCc = () => { try { return localStorage.getItem("birdie-cc") === "1"; } catch { return false; } };

// Subtitles made for uploaded videos, as local links (one fetch per video per visit).
const vttCache = new Map<string, string>();
async function captionsFor(id: string): Promise<string | { error: string }> {
  const have = vttCache.get(id); if (have) return have;
  const r = await fetch("/api/channels/captions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post: id }) }).then((x) => x.json()).catch(() => ({ error: "failed" }));
  if (!r.url) return { error: String(r.error ?? "failed") };
  const text = await fetch(r.url, { cache: "no-store" }).then((x) => (x.ok ? x.text() : "")).catch(() => "");
  if (!text.startsWith("WEBVTT")) return { error: "failed" };
  const url = URL.createObjectURL(new Blob([text], { type: "text/vtt" }));
  vttCache.set(id, url);
  return url;
}

/** Taps on a video: one tap pauses or plays, a quick second tap on the left or right seeks 10 seconds. */
function useTaps(onToggle: () => void, onSeek: (d: number) => void) {
  const last = useRef<{ at: number; side: number; timer?: ReturnType<typeof setTimeout> }>({ at: 0, side: 0 });
  const [hint, setHint] = useState<{ side: number; n: number } | null>(null);
  useEffect(() => { if (!hint) return; const t = setTimeout(() => setHint(null), 650); return () => clearTimeout(t); }, [hint]);
  const onTap = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width; const side = x < 0.4 ? -1 : x > 0.6 ? 1 : 0;
    const now = Date.now(); const l = last.current;
    if (now - l.at < 300 && side !== 0 && side === l.side) {
      clearTimeout(l.timer); onSeek(side * 10);
      setHint((h) => ({ side, n: h && h.side === side ? h.n + 10 : 10 }));
      last.current = { at: now, side }; // a third tap keeps seeking
      return;
    }
    clearTimeout(l.timer);
    last.current = { at: now, side, timer: setTimeout(onToggle, 300) };
  };
  return { onTap, hint };
}

function SeekHint({ hint }: { hint: { side: number; n: number } | null }) {
  if (!hint) return null;
  return (
    <span className={`pointer-events-none absolute top-1/2 z-10 flex h-20 w-20 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-black/40 text-[13px] font-medium ${hint.side < 0 ? "left-8" : "right-8"}`}>
      <span className="text-[18px]">{hint.side < 0 ? "«" : "»"}</span>{hint.n} sec
    </span>
  );
}

function Scrubber({ t, dur, onSeek }: { t: number; dur: number; onSeek: (t: number) => void }) {
  if (!dur) return null;
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 px-3 pb-1">
      <span className="w-9 text-right text-[10.5px] tabular-nums text-white/70">{clock(t)}</span>
      <input type="range" min={0} max={dur} step={0.1} value={Math.min(t, dur)} onChange={(e) => onSeek(Number(e.target.value))} aria-label="Seek"
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/30 accent-white [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        style={{ background: `linear-gradient(to right, #fff ${(t / dur) * 100}%, rgba(255,255,255,0.3) ${(t / dur) * 100}%)` }} />
      <span className="w-9 text-[10.5px] tabular-nums text-white/70">{clock(dur)}</span>
    </div>
  );
}

function UploadedVideo({ post, active, muted, onUnmute, cc, onCcError }: { post: Post; active: boolean; muted: boolean; onUnmute: () => void; cc: boolean; onCcError: (e: string) => void }) {
  const vid = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [t, setT] = useState(0); const [dur, setDur] = useState(0);
  const [local, setLocal] = useState<string | null>(null);
  const [vtt, setVtt] = useState<string | null>(null);
  const saved = !!useOfflineIndex()[`video:${post.id}`];
  useEffect(() => { if (!saved) return; let on = true; void offlineUrl(`video:${post.id}`).then((u) => { if (on) setLocal(u); }); return () => { on = false; }; }, [saved, post.id]);
  useEffect(() => { const v = vid.current; if (!v) return; if (active && !paused) void v.play().catch(() => {}); else v.pause(); }, [active, paused, local]);
  useEffect(() => { void Promise.resolve().then(() => setPaused(false)); }, [active]);
  useEffect(() => {
    if (!cc || !active || !post.remote || vtt) return;
    let on = true;
    void captionsFor(post.id).then((r) => { if (!on) return; if (typeof r === "string") setVtt(r); else onCcError(r.error); });
    return () => { on = false; };
  }, [cc, active, post.id, post.remote, vtt]); // eslint-disable-line react-hooks/exhaustive-deps
  const seek = useCallback((to: number) => { const v = vid.current; if (v) { v.currentTime = Math.max(0, Math.min(to, v.duration || to)); setT(v.currentTime); } }, []);
  const { onTap, hint } = useTaps(() => (muted ? onUnmute() : setPaused((p) => !p)), (d) => seek((vid.current?.currentTime ?? 0) + d));
  const src = local ?? (active ? post.videoUrl : `${post.videoUrl}#t=0.5`);
  return (
    <>
      <button onClick={onTap} className="absolute inset-0 block" aria-label={paused ? "Play" : "Pause"}>
        <video ref={vid} src={src} muted={muted} loop playsInline preload={active ? "auto" : "metadata"} className="h-full w-full object-contain"
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}>
          {cc && vtt && <track kind="subtitles" src={vtt} srcLang="en" label="English" default />}
        </video>
        {paused && <span className="absolute inset-0 flex items-center justify-center"><Play size={64} className="fill-white/80 text-white/80" /></span>}
      </button>
      <SeekHint hint={hint} />
      {active && <Scrubber t={t} dur={dur} onSeek={seek} />}
    </>
  );
}

function YouTubeVideo({ post, active, muted, onUnmute, cc }: { post: Post; active: boolean; muted: boolean; onUnmute: () => void; cc: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [t, setT] = useState(0); const [dur, setDur] = useState(0);
  const [paused, setPaused] = useState(false);
  const tRef = useRef(0);
  const mutedRef = useRef(muted);
  const cmd = useCallback((func: string, args: unknown[] = []) => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*"), []);
  useEffect(() => {
    if (!active) return;
    const on = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      try {
        const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (d?.info?.currentTime !== undefined) { setT(d.info.currentTime); tRef.current = d.info.currentTime; }
        if (d?.info?.duration) setDur(d.info.duration);
        // Turning subtitles on or off reloads the player; carry on from where you were.
        if (d?.event === "onReady") {
          const w = frame.current?.contentWindow;
          if (tRef.current > 1) w?.postMessage(JSON.stringify({ event: "command", func: "seekTo", args: [tRef.current, true] }), "*");
          if (!mutedRef.current) w?.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*");
        }
      } catch { /* not the player */ }
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [active]);
  useEffect(() => { mutedRef.current = muted; cmd(muted ? "mute" : "unMute"); }, [muted, cmd]);
  const seek = (to: number) => { const x = Math.max(0, dur ? Math.min(to, dur - 1) : to); cmd("seekTo", [x, true]); setT(x); tRef.current = x; };
  const { onTap, hint } = useTaps(() => { if (muted) return onUnmute(); cmd(paused ? "playVideo" : "pauseVideo"); setPaused((p) => !p); }, (d) => seek(tRef.current + d));
  if (!active) return <img src={`https://i.ytimg.com/vi/${post.youtubeId}/hqdefault.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" />;
  const origin = typeof window === "undefined" ? "" : encodeURIComponent(window.location.origin);
  return (
    <>
      <iframe key={`${post.id}-${cc}`} ref={frame} title={post.title} allow="autoplay; encrypted-media" className="absolute inset-0 h-full w-full border-0"
        src={`https://www.youtube-nocookie.com/embed/${post.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${post.youtubeId}&rel=0&playsinline=1&modestbranding=1&controls=0&enablejsapi=1&origin=${origin}&cc_load_policy=${cc ? 1 : 0}&cc_lang_pref=en`}
        onLoad={() => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: post.id }), "*")} />
      {/* The player sits under a tap layer so taps pause and seek instead of opening YouTube. */}
      <button onClick={onTap} aria-label={paused ? "Play" : "Pause"} className="absolute inset-0 block">
        {paused && <span className="absolute inset-0 flex items-center justify-center"><Play size={64} className="fill-white/80 text-white/80" /></span>}
      </button>
      <SeekHint hint={hint} />
      <Scrubber t={t} dur={dur} onSeek={seek} />
    </>
  );
}

function Slide(props: { post: Post; active: boolean; muted: boolean; onUnmute: () => void; cc: boolean; onCcError: (e: string) => void }) {
  const { post } = props;
  if (post.youtubeId) return <YouTubeVideo {...props} />;
  if (post.videoUrl) return <UploadedVideo {...props} />;
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

const friendsLine = (h?: Hearts) => !h?.friends.length ? null : h.friends.length === 1 ? `${h.friends[0]} hearted this` : `${h.friends[0]} and ${h.friends.length - 1} friend${h.friends.length > 2 ? "s" : ""} hearted this`;

export default function Channels({ active, onBack, onSearch }: { active: boolean; onBack: () => void; onSearch: () => void }) {
  const { posts, forYou, following, personById, toggleFollow, toggleLike, profile, auth, setOverlay, setAuthOpen, setTab: setAppTab, setDiscoverView, refreshFeed, loadMoreFeed, loadForYou, flash } = useApp();
  const [tab, setTab] = useState<Tab>("hot");
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [cur, setCur] = useState(0);
  const [muted, setMuted] = useState(true);
  const [cc, setCc] = useState(readCc);
  const [hearts, setHearts] = useState<Record<string, Hearts>>({});
  const [comments, setComments] = useState<Post | null>(null);
  const [menu, setMenu] = useState<Post | null>(null);
  const [downloads, setDownloads] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const offline = useOfflineIndex();
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
  // Hearts for what's on screen and just ahead.
  const ahead = list.slice(Math.max(0, cur - 1), cur + 6).filter((p) => p.remote).map((p) => p.id).join(",");
  useEffect(() => {
    if (!active || auth.status !== "in" || !ahead) return;
    const ids = ahead.split(",").filter((id) => !hearts[id]);
    if (ids.length) void postHeartsInfo(ids).then((h) => setHearts((x) => ({ ...x, ...h })));
  }, [ahead, active, auth.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => { const el = e.currentTarget; const i = Math.round(el.scrollTop / Math.max(1, el.clientHeight)); if (i !== cur) setCur(i); };
  const author = (p: Post) => { const a = personById(p.authorId); return { name: p.authorId === me ? profile.name || "Me" : a?.name ?? p.sourceName ?? "Birdie creator", color: a?.color ?? "#7C4DDB" }; };
  const need = (f: () => void) => () => (auth.status === "in" ? f() : setAuthOpen(true));
  function share(p: Post) {
    const link = { url: `${window.location.origin}/prototype?watch=${p.id}`, title: p.title, thumb: p.youtubeId ? `https://i.ytimg.com/vi/${p.youtubeId}/mqdefault.jpg` : null, source: "Channels" };
    shareToMoments(link, { setTab: setAppTab, setDiscoverView, setOverlay });
  }
  function heart(p: Post) {
    if (!p.remote) return flash("You can heart it once it's posted");
    const h = hearts[p.id] ?? { hearts: 0, hearted: false, friends: [] };
    const on = !h.hearted;
    setHearts((x) => ({ ...x, [p.id]: { ...h, hearted: on, hearts: Math.max(0, h.hearts + (on ? 1 : -1)) } }));
    void heartPost(p.id, on);
  }
  function toggleCc() {
    const on = !cc; setCc(on);
    try { localStorage.setItem("birdie-cc", on ? "1" : "0"); } catch { /* private mode */ }
    if (on && post?.videoUrl && !post.youtubeId) flash("Turning on subtitles...");
  }
  async function download(p: Post) {
    const key = `video:${p.id}`;
    if (offline[key]) return flash("Already downloaded. Find it in Downloads.");
    setSaving(p.id); flash("Downloading...");
    const err = await saveOffline(key, p.videoUrl!, p.title || "Video", "video");
    setSaving(null); flash(err ?? "Downloaded. It plays without internet now.");
  }
  const ccError = (e: string) => flash(e === "too_long" ? "This video is too big for subtitles" : e === "daily_limit" || e === "plus_required" ? "That's today's subtitles. More tomorrow." : "Couldn't make subtitles for this one");

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-black text-white">
      <div className="absolute inset-x-0 top-0 z-30 flex h-12 items-center justify-between bg-gradient-to-b from-black/50 to-transparent px-1">
        <button onClick={onBack} aria-label="Back" className="flex h-10 w-10 items-center justify-center"><ChevronLeft size={26} /></button>
        <div className="flex items-center gap-5 text-[16px]">
          {([["following", "Following"], ["friends", "Friends"], ["hot", "Hot"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`relative pb-1 ${tab === id ? "font-semibold text-white" : "text-white/65"}`}>{label}{tab === id && <span className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded bg-white" />}</button>
          ))}
        </div>
        <div className="flex items-center">
          <button onClick={onSearch} aria-label="Search" className="flex h-10 w-9 items-center justify-center"><Search size={21} /></button>
          <button onClick={() => setDownloads(true)} aria-label="Downloads" className="flex h-10 w-9 items-center justify-center"><Download size={21} /></button>
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
          const h = hearts[p.id];
          const isVideo = !!(p.videoUrl || p.youtubeId);
          const line = friendsLine(h);
          return (
            <section key={p.id} className="relative h-full w-full snap-start snap-always overflow-hidden">
              {near ? <Slide post={p} active={active && i === cur} muted={muted} onUnmute={() => setMuted(false)} cc={cc} onCcError={ccError} /> : null}
              {isVideo && i === cur && (
                <div className="absolute right-3 top-14 z-20 flex flex-col gap-2.5">
                  <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Sound on" : "Sound off"} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35">{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
                  <button onClick={toggleCc} aria-label={cc ? "Subtitles off" : "Subtitles on"} aria-pressed={cc} className={`flex h-9 w-9 items-center justify-center rounded-full ${cc ? "bg-white text-black" : "bg-black/35"}`}><Captions size={18} /></button>
                  {p.videoUrl && !p.youtubeId && p.remote && (
                    <button onClick={() => void download(p)} aria-label={offline[`video:${p.id}`] ? "Downloaded" : "Download"} disabled={saving === p.id} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 disabled:opacity-50">
                      {offline[`video:${p.id}`] ? <CheckCircle2 size={18} className="text-[#7BE0A0]" /> : <Download size={18} />}
                    </button>
                  )}
                </div>
              )}
              <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pt-24 ${isVideo ? "pb-7" : "pb-3"}`}>
                {line && <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] text-white/85"><Heart size={13} className="fill-[#FA5151] text-[#FA5151]" />{line}</div>}
                <div className="pointer-events-auto mb-2 line-clamp-3 text-[15px] leading-snug">{p.kind === "video" ? p.title : p.body ? p.title : ""}{p.tags?.length ? <span className="text-white/80"> {p.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}</span> : null}</div>
                <div className="pointer-events-auto flex items-center gap-2.5">
                  <button onClick={() => setOverlay({ t: "profile", id: p.authorId === me ? "me" : p.authorId })} className="flex min-w-0 items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold" style={{ background: a.color }}>{initials(a.name)}</span>
                    <span className="max-w-[96px] truncate text-[14.5px]">{a.name}</span>
                  </button>
                  {p.authorId !== me && !following.includes(p.authorId) && p.remote && <button onClick={need(() => toggleFollow(p.authorId))} className="shrink-0 rounded-[4px] bg-[var(--we-accent)] px-2.5 py-1 text-[13px] font-medium">+Follow</button>}
                  <div className="ml-auto flex items-center gap-3.5">
                    <button onClick={need(() => toggleLike(p.id))} aria-label="Like" className="flex flex-col items-center text-[11.5px]"><ThumbsUp size={23} className={p.liked ? "fill-[#FA9D3B] text-[#FA9D3B]" : ""} />{fmt(p.likes)}</button>
                    <button onClick={need(() => heart(p))} aria-label={h?.hearted ? "Remove heart" : "Heart"} aria-pressed={!!h?.hearted} className="flex flex-col items-center text-[11.5px]"><Heart size={23} className={h?.hearted ? "fill-[#FA5151] text-[#FA5151]" : ""} />{fmt(h?.hearts ?? 0)}</button>
                    <button onClick={need(() => share(p))} aria-label="Share" className="flex flex-col items-center text-[11.5px]"><Share2 size={23} />Share</button>
                    <button onClick={() => (p.remote ? setComments(p) : flash("Comments open once it's posted"))} aria-label="Comments" className="flex flex-col items-center text-[11.5px]"><MessageCircle size={23} />{fmt(p.comments ?? 0)}</button>
                    <button onClick={() => setMenu(p)} aria-label="More" className="flex flex-col items-center text-[11.5px]"><MoreHorizontal size={23} />More</button>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      {comments && <CommentsPanel post={comments} open onClose={() => setComments(null)} onProfile={(id) => { setComments(null); setOverlay({ t: "profile", id }); }} />}
      {menu && <PostMenu post={menu} open onClose={() => setMenu(null)} />}
      <Page open={downloads} onClose={() => setDownloads(false)} title="Downloads"><div className="p-4"><Downloads /></div></Page>
    </div>
  );
}
