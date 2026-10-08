"use client";

import { ChevronDown, Heart, ListPlus, Share2, Sparkles } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import PostCard, { ago, initials, useByline } from "./PostCard";
import { PostMenu } from "./PostMenu";
import { FeedAd, SponsorBar, usePlacements } from "./Sponsored";
import { useApp } from "./store";
import { Avatar } from "./ui";

/** YouTube-style watch page: player on top, sponsor strip, title, channel + actions, then Up next. */
export function Watch({ id, onBack }: { id: string; onBack: () => void }) {
  const { posts, toggleLike, following, toggleFollow, setOverlay, searchFeed, goBirdie, flash } = useApp();
  const post = posts.find((p) => p.id === id) ?? null;
  const by = useByline(post ?? { sourceName: "", authorId: "", grad: "" } as never);
  const [more, setMore] = useState(false);
  const [save, setSave] = useState(false);
  const bar = usePlacements("card", "video_end", !!post);
  const ads = usePlacements("card", "explore", !!post);
  const sponsor = bar.length && post ? bar[post.id.charCodeAt(0) % bar.length] : null;

  // More from the same subject for Up next (loaded from the server, not just what's on screen).
  useEffect(() => { if (post?.field) void searchFeed(post.field); }, [post?.field, searchFeed]);
  const upNext = useMemo(() => {
    if (!post) return [];
    const others = posts.filter((p) => p.id !== post.id && p.kind === "video");
    const same = others.filter((p) => p.field === post.field || (post.sourceName && p.sourceName === post.sourceName));
    const rest = others.filter((p) => !same.includes(p));
    return [...same, ...rest].slice(0, 30);
  }, [posts, post]);

  if (!post) return <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--dim)]"><button onClick={onBack}>This video isn&apos;t available. Go back</button></div>;
  const authorFollowable = !post.sourceName && post.authorId !== "me";
  const isFollowing = following.includes(post.authorId);

  async function share() {
    const url = post!.youtubeId ? `https://www.youtube.com/watch?v=${post!.youtubeId}` : window.location.origin;
    const text = `${post!.title} -- watching on Birdie`;
    try { if (navigator.share) await navigator.share({ title: post!.title, text, url }); else { await navigator.clipboard.writeText(`${text} ${url}`); flash("Link copied"); } } catch { /* cancelled */ }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--paper)]">
      {/* The player itself (Player.tsx) sits over this space so it can shrink to the mini bar without restarting. */}
      <div className="aspect-video w-full shrink-0 bg-black" />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-24">
        {sponsor && <SponsorBar p={sponsor} />}

        <button onClick={() => setMore((m) => !m)} className="block w-full px-3 pt-3 text-left">
          <div className={`text-[17px] font-bold leading-snug ${more ? "" : "line-clamp-2"}`}>{post.title}</div>
          <div className="mt-1 flex items-center gap-1 text-[12.5px] text-[var(--dim)]">{post.likes} like{post.likes === 1 ? "" : "s"} · {ago(post.createdAt)}{post.field ? ` · ${post.field}` : ""} <span className="ml-1 font-semibold text-[var(--text)]">{more ? "less" : "...more"}</span> <ChevronDown size={13} className={more ? "rotate-180" : ""} /></div>
        </button>
        {more && (
          <div className="mx-3 mt-2 space-y-1.5 rounded-xl bg-[var(--paper-dim)] p-3 text-[13px] leading-snug">
            {post.body && <p className="whitespace-pre-line">{post.body}</p>}
            {post.tags.length > 0 && <div className="text-[var(--study)]">{post.tags.map((t) => `#${t}`).join(" ")}</div>}
            {post.sourceName && <p className="text-[12px] text-[var(--dim)]">From the YouTube channel {post.sourceName}. Plays through YouTube; views count for the creator.</p>}
          </div>
        )}

        <div className="flex items-center gap-3 px-3 pt-3">
          <button onClick={() => { if (authorFollowable) { onBack(); setOverlay({ t: "profile", id: post.authorId }); } }} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <Avatar initials={initials(by.name)} color={by.color} size={36} /><span className="truncate text-[14px] font-semibold">{by.name}</span>
          </button>
          {authorFollowable && <button onClick={() => toggleFollow(post.authorId)} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold ${isFollowing ? "bg-[var(--paper-dim)] text-[var(--text)]" : "bg-[var(--ink)] text-[var(--paper)]"}`}>{isFollowing ? "Following" : "Follow"}</button>}
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pt-3">
          <button onClick={() => toggleLike(post.id)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--paper-dim)] px-3.5 py-2 text-[13px] font-semibold"><Heart size={16} className={post.liked ? "fill-[var(--birdie)] text-[var(--birdie)]" : ""} />{post.likes || "Like"}</button>
          <button onClick={() => void share()} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--paper-dim)] px-3.5 py-2 text-[13px] font-semibold"><Share2 size={16} /> Share</button>
          <button onClick={() => setSave(true)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--paper-dim)] px-3.5 py-2 text-[13px] font-semibold"><ListPlus size={16} /> Save</button>
          <button onClick={() => { onBack(); goBirdie({ courseId: "general", prompt: `Teach me the key ideas from the video "${post.title}"${post.field ? ` (${post.field})` : ""}, then quiz me on them.` }); }} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--birdie-soft)] px-3.5 py-2 text-[13px] font-semibold text-[var(--birdie-text)]"><Sparkles size={16} /> Ask Birdie</button>
        </div>

        <div className="mt-5 px-3 text-[15px] font-bold">Up next</div>
        <div className="mt-3 space-y-5">{upNext.map((p, i) => (
          <Fragment key={p.id}>
            <PostCard post={p} edge onProfile={(pid) => { onBack(); setOverlay({ t: "profile", id: pid }); }} />
            {ads.length > 0 && (i === 2 || (i > 2 && (i - 2) % 8 === 0)) && <FeedAd p={ads[Math.floor((i - 2) / 8) % ads.length]} edge />}
          </Fragment>
        ))}</div>
      </div>
      {save && <PostMenu post={post} open={save} onClose={() => setSave(false)} />}
    </div>
  );
}
