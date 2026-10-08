"use client";

import { offlineUrl, useOfflineIndex } from "./offline";
import { motion } from "framer-motion";
import { ChevronDown, Pause, PictureInPicture2, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { logPostEvent } from "./live/recData";
import { useByline } from "./PostCard";
import { SponsoredCard, usePlacements } from "./Sponsored";
import { useApp } from "./store";

/**
 * The one video player in the app. It sits on top of the watch page, and when you go back it
 * shrinks into a bar above the nav and keeps playing while you use the rest of the app, until
 * you close it. It is never unmounted between the two, so playback doesn't restart.
 */
export default function Player({ bottom }: { bottom: number }) {
  const { watching, watch, minimizeWatch, closeWatch, posts, settings } = useApp();
  const post = watching ? posts.find((p) => p.id === watching.id) ?? null : null;
  const mini = !!watching?.mini;
  const by = useByline(post ?? ({ sourceName: "", authorId: "", grad: "" } as never));
  const frame = useRef<HTMLIFrameElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState<string | null>(null); // id of the post the user paused
  const [ended, setEnded] = useState<string | null>(null);
  const bar = usePlacements("card", "video_end", !!post);
  const sponsor = bar.length && post ? bar[post.id.charCodeAt(0) % bar.length] : null;
  // Watch time teaches For you what you like: a quick back-out counts against the video.
  const pausedMs = useRef(0);
  const pausedAt = useRef<number | null>(null);
  const id = watching?.id;
  // Downloaded videos play from the phone, so they work with no internet.
  const offline = useOfflineIndex();
  const [local, setLocal] = useState<{ id: string; url: string } | null>(null);
  const savedHere = !!id && !!offline[`video:${id}`];
  useEffect(() => {
    if (!id || !savedHere) return;
    let url: string | null = null;
    void offlineUrl(`video:${id}`).then((u) => { url = u; if (u) setLocal({ id, url: u }); });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [id, savedHere]);
  useEffect(() => {
    if (!id) return;
    void logPostEvent(id, "view");
    const start = Date.now();
    pausedMs.current = 0; pausedAt.current = null;
    return () => {
      const now = Date.now();
      const sec = (now - start - pausedMs.current - (pausedAt.current ? now - pausedAt.current : 0)) / 1000;
      void logPostEvent(id, sec < 8 ? "skip" : "watch", { seconds: sec });
    };
  }, [id]);
  if (!watching || !post) return null;
  const isPaused = paused === post.id;

  function togglePlay() {
    const next = !isPaused;
    setPaused(next ? post!.id : null);
    if (next) pausedAt.current = Date.now(); else if (pausedAt.current) { pausedMs.current += Date.now() - pausedAt.current; pausedAt.current = null; }
    if (vid.current) { if (next) vid.current.pause(); else void vid.current.play(); return; }
    // YouTube's embed takes play/pause commands over postMessage when enablejsapi=1.
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: next ? "pauseVideo" : "playVideo", args: [] }), "*");
  }

  return (
    <motion.div
      layout
      transition={{ type: "spring", damping: 34, stiffness: 340 }}
      className={mini ? "absolute left-2 right-2 z-[66] overflow-hidden rounded-xl bg-[var(--ink)] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)]" : "absolute left-0 right-0 top-12 z-[65] bg-black"}
      style={mini ? { bottom } : undefined}
    >
      <div className={mini ? "flex items-center" : ""}>
        <motion.div layout className={`relative aspect-video shrink-0 bg-black ${mini ? "w-[124px]" : "w-full"}`}>
          {post.youtubeId ? (
            <iframe ref={frame} key={post.id} src={`https://www.youtube-nocookie.com/embed/${post.youtubeId}?autoplay=1&rel=0&playsinline=1&modestbranding=1&enablejsapi=1`} title={post.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 h-full w-full border-0" />
          ) : post.videoUrl ? (
            <video key={post.id} ref={vid} src={local?.id === post.id ? local.url : post.videoUrl} controls={!mini} autoPlay={!settings.dataSaver} playsInline onPlay={() => setPaused(null)} onPause={() => setPaused(post.id)} onEnded={() => { const el = vid.current; if (el && el.duration >= 60 && sponsor) setEnded(post.id); }} className="absolute inset-0 h-full w-full bg-black" />
          ) : <div className="absolute inset-0 flex items-center justify-center text-[13px] text-white/70">Video unavailable</div>}
          {!mini && ended === post.id && sponsor && (
            <div className="absolute inset-0 z-10 flex flex-col justify-center gap-2 bg-black/75 p-3">
              <SponsoredCard p={sponsor} dark />
              <button onClick={() => { setEnded(null); const el = vid.current; if (el) { el.currentTime = 0; void el.play(); } }} className="self-center rounded-full bg-white/20 px-3.5 py-1.5 text-[12px] font-semibold text-white">Replay</button>
            </div>
          )}
          {/* In the bar, tapping the picture opens the full page again (the iframe would swallow the tap). */}
          {mini && <button onClick={() => watch(post.id)} aria-label="Open video" className="absolute inset-0 z-10" />}
          {/* Uploaded videos can float over other apps (picture in picture) and keep playing. */}
          {!mini && post.videoUrl && !post.youtubeId && typeof document !== "undefined" && document.pictureInPictureEnabled && (
            <button onClick={() => { void vid.current?.requestPictureInPicture().catch(() => undefined); }} aria-label="Float over other apps" className="absolute right-2 top-2 z-20 flex h-8 items-center gap-1 rounded-full bg-black/55 px-2.5 text-[11.5px] font-semibold text-white"><PictureInPicture2 size={15} /> Float</button>
          )}
          {!mini && <button onClick={minimizeWatch} aria-label="Minimize" className="absolute left-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white"><ChevronDown size={18} /></button>}
        </motion.div>
        {mini && (
          <>
            <button onClick={() => watch(post.id)} className="min-w-0 flex-1 px-2.5 text-left">
              <div className="truncate text-[13px] font-semibold text-white">{post.title}</div>
              <div className="truncate text-[11.5px] text-white/60">{by.name}</div>
            </button>
            <button onClick={togglePlay} aria-label={isPaused ? "Play" : "Pause"} className="flex h-10 w-10 shrink-0 items-center justify-center text-white">{isPaused ? <Play size={20} className="fill-white" /> : <Pause size={20} className="fill-white" />}</button>
            <button onClick={closeWatch} aria-label="Close video" className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center text-white"><X size={20} /></button>
          </>
        )}
      </div>
    </motion.div>
  );
}
