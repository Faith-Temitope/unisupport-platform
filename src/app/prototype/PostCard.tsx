"use client";

/* eslint-disable @next/next/no-img-element -- YouTube's own thumbnails */
import { MoreVertical, Pin } from "lucide-react";
import { useState } from "react";
import { useApp, type Post } from "./store";
import { PostMenu } from "./PostMenu";
import { Avatar } from "./ui";

export const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`; if (m < 1440) return `${Math.round(m / 60)}h ago`;
  const d = Math.round(m / 1440); if (d < 30) return `${d}d ago`; if (d < 365) return `${Math.round(d / 30)} month${Math.round(d / 30) === 1 ? "" : "s"} ago`;
  return `${Math.round(d / 365)}y ago`;
};
export const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase() || "?";
const PALETTE = ["#7C4DDB", "#A63FBD", "#E0557A", "#2E8B6E", "#D9822B", "#3A6FD8", "#8A2FA3", "#C0392B"];
export const colorFor = (s: string) => PALETTE[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

/** Who a post is "by": the original YouTube channel for embedded videos, else the Birdie author. */
export function useByline(post: Post) {
  const { personById, profile } = useApp();
  if (post.sourceName) return { name: post.sourceName, color: colorFor(post.sourceName) };
  if (post.authorId === "me") return { name: profile.name || "You", color: "#A63FBD" };
  return personById(post.authorId) ?? { name: "Student", color: "#7C4DDB" };
}

/** 16:9 picture for a video post: YouTube's thumbnail, or the first frame of an uploaded video. */
export function Thumb({ post, rounded }: { post: Post; rounded?: boolean }) {
  const { settings } = useApp();
  return (
    <div className={`relative aspect-video w-full overflow-hidden bg-gradient-to-br ${post.grad} ${rounded ? "rounded-xl" : ""}`}>
      {post.youtubeId ? <img src={`https://i.ytimg.com/vi/${post.youtubeId}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
        : post.videoUrl && !settings.dataSaver ? <video src={`${post.videoUrl}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        : null}
      {post.dur && <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11.5px] font-semibold text-white">{post.dur}</span>}
    </div>
  );
}

/** One post per row, YouTube-style: picture, then avatar · title · byline · ⋮. Videos open the watch page. */
export default function PostCard({ post, onProfile, edge }: { post: Post; onProfile: (id: string) => void; edge?: boolean }) {
  const { watch: openWatch, setOverlay } = useApp();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const by = useByline(post);
  const isMe = post.authorId === "me";
  const watch = () => openWatch(post.id);

  return (
    <article>
      {post.kind === "video" ? (
        <button onClick={watch} aria-label={`Watch ${post.title}`} className="block w-full active:opacity-90"><Thumb post={post} rounded={!edge} /></button>
      ) : (
        <button onClick={() => setOpen((o) => !o)} className={`block w-full bg-gradient-to-br ${post.grad} p-4 text-left text-white ${edge ? "" : "rounded-xl"}`}>
          <div className="disp text-[17px] font-bold leading-snug">{post.title}</div>
          <p className={`mt-1.5 text-[13.5px] leading-snug text-white/85 ${open ? "whitespace-pre-line" : "line-clamp-3"}`}>{post.body}</p>
        </button>
      )}
      <div className={`flex gap-3 pt-3 ${edge ? "px-3" : ""}`}>
        <button onClick={() => (post.sourceName ? setOverlay({ t: "source", name: post.sourceName }) : onProfile(post.authorId))} aria-label="Open channel" className="shrink-0"><Avatar initials={initials(by.name)} color={by.color} size={36} /></button>
        <button onClick={post.kind === "video" ? watch : () => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          {post.pinnedAt && <div className="mb-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--study)]"><Pin size={11} /> Pinned</div>}
          {post.kind === "video" && <div className="line-clamp-2 text-[15px] font-semibold leading-snug text-[var(--text)]">{post.title}</div>}
          <div className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-[var(--dim)]">{by.name}{post.field ? ` · ${post.field}` : ""}{post.likes ? ` · ${post.likes} like${post.likes === 1 ? "" : "s"}` : ""} · {ago(post.createdAt)}</div>
        </button>
        <button onClick={() => setMenu(true)} aria-label="More options" className="-mr-1 h-8 w-8 shrink-0 text-[var(--dim)] active:scale-90"><MoreVertical size={18} className="mx-auto" /></button>
      </div>
      {menu && <PostMenu post={post} open={menu} onClose={() => setMenu(false)} />}
    </article>
  );
}
