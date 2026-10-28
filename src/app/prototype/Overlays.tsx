"use client";

import Contact from "./Contact";
import { reportThing } from "./live/socialData";
import { ProfileBadges } from "./ProfileBadges";
import { Flag, Link2, MoreHorizontal, Play, Plus, Settings as Cog, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PostCard, { colorFor, initials } from "./PostCard";
import { naira, useApp, type Post } from "./store";
import { LikedTab, PlaylistsTab } from "./Playlists";
import { Watch } from "./Watch";
import { cleanUrl, fetchChannelStats } from "./live/socialData";
import { Avatar, Btn, Screen, Segmented, Sheet, TextField } from "./ui";
import { SqAvatar, WeHeader } from "./we";

export default function Overlays() {
  const { overlay, setOverlay, watching, minimizeWatch } = useApp();
  const close = () => setOverlay(null);
  return (
    <>
      <Screen open={overlay?.t === "contact"} z={62}>{overlay?.t === "contact" && <Contact key={overlay.id} id={overlay.id} onBack={close} />}</Screen>
      <Screen open={overlay?.t === "profile"} z={62}>{overlay?.t === "profile" && <ProfileScreen id={overlay.id} onBack={close} />}</Screen>
      <Screen open={overlay?.t === "source"} z={62}>{overlay?.t === "source" && <SourceScreen name={overlay.name} onBack={close} />}</Screen>
      <Screen open={overlay?.t === "post"} z={62}><Composer onClose={close} /></Screen>
      <Screen open={!!watching && !watching.mini} z={64} fade>{watching && <Watch key={watching.id} id={watching.id} onBack={minimizeWatch} />}</Screen>
    </>
  );
}

function Header({ title, onBack, right }: { title: React.ReactNode; onBack: () => void; right?: React.ReactNode }) {
  return <WeHeader onBack={onBack} title={title} right={right} />;
}

const thumbOf = (x: Post) => (x.youtubeId ? `https://i.ytimg.com/vi/${x.youtubeId}/mqdefault.jpg` : null);

/** A channel's videos as a grid of covers, like WeChat Channels. */
function VideoGrid({ videos }: { videos: Post[] }) {
  const { watch } = useApp();
  return (
    <div className="grid grid-cols-3 gap-[2px]">
      {videos.map((x) => (
        <button key={x.id} onClick={() => watch(x.id)} className="relative aspect-[3/4] overflow-hidden bg-[#1E1428]">
          {thumbOf(x) ? <img src={thumbOf(x)!} alt="" className="h-full w-full object-cover" />
            : x.videoUrl ? <video src={`${x.videoUrl}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            : <span className="flex h-full items-center justify-center p-2 text-center text-[12px] text-white/80">{x.title}</span>}
          {x.pinnedAt ? <span className="absolute left-1 top-1 rounded-[3px] bg-[var(--we-accent)] px-1 text-[10px] text-white">Pinned</span> : null}
          <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-[11px] text-white"><Play size={11} className="fill-white" />{x.likes}</span>
        </button>
      ))}
    </div>
  );
}

// ---------- Channel (a creator's, or mine): videos, posts, playlists and shared courses ----------
function ProfileScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const { personById, posts, shared, following, contacts, blocked, toggleBlock, toggleFollow, addContact, setOverlay, profile, flash, auth, loadChannel, openShared } = useApp();
  const [menu, setMenu] = useState(false);
  const [tab, setTab] = useState<"videos" | "posts" | "playlists" | "courses" | "liked">("videos");
  const [stats, setStats] = useState<{ followers: number; likes: number } | null>(null);
  const isMe = id === "me";
  const p = isMe ? null : personById(id);
  const realId = isMe ? auth.userId : p?.demo ? undefined : id;

  useEffect(() => {
    if (!realId) return;
    void loadChannel(realId);
    void fetchChannelStats(realId, auth.userId).then((s) => setStats({ followers: s.followers, likes: s.likes }));
  }, [realId, auth.userId, loadChannel]);

  // A real student's channel can take a moment to load the first time it's opened.
  if (!isMe && !p) return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-bg)]"><Header onBack={onBack} title="" /><div className="flex flex-1 items-center justify-center text-[14px] text-[var(--we-sub)]">Loading...</div></div>
  );
  const authorId = isMe ? auth.userId : id;
  const mine = posts.filter((x) => x.authorId === authorId || x.authorId === id);
  // Pinned posts (up to 3) sit at the top, most recently pinned first.
  const pinnedFirst = (a: Post, b: Post) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0) || b.createdAt - a.createdAt;
  const videos = mine.filter((x) => x.kind === "video").sort(pinnedFirst), texts = mine.filter((x) => x.kind === "text").sort(pinnedFirst);
  const courses = shared.filter((s) => s.ownerId === id || s.ownerId === authorId);
  const name = isMe ? profile.name || "You" : p!.name;
  const handle = isMe ? profile.handle : p!.handle;
  const bio = isMe ? profile.bio : p!.bio;
  const links = ((isMe ? profile.links : p!.links) ?? []).filter((l) => cleanUrl(l.url));
  const place = (isMe ? [profile.institution, profile.country] : [p!.school, p!.country]).filter(Boolean).join(" · ");
  const isFollowing = following.includes(id), isContact = contacts.includes(id);
  const followers = stats ? stats.followers : isFollowing ? 1 : 0;
  const likes = stats ? stats.likes : mine.reduce((a, x) => a + x.likes, 0);
  const color = isMe ? "#A63FBD" : p!.color;
  const first = name.split(" ")[0];

  function follow() {
    toggleFollow(id);
    setStats((s) => (s ? { ...s, followers: s.followers + (isFollowing ? -1 : 1) } : s));
  }
  const tabs = ([["videos", "Videos"], ["posts", "Posts"], ["playlists", "Playlists"], ["courses", "Courses"], ...(isMe ? [["liked", "Liked"]] : [])] as [typeof tab, string][]);
  const none = (t: string) => <p className="bg-[var(--we-cell)] py-14 text-center text-[14px] text-[var(--we-sub)]">{t}</p>;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-bg)]">
      <Header onBack={onBack} title="" right={isMe
        ? <button onClick={() => setOverlay({ t: "settings" })} aria-label="Settings" className="flex h-10 w-10 items-center justify-center"><Cog size={21} /></button>
        : <button onClick={() => setMenu(true)} aria-label="More" className="flex h-10 w-10 items-center justify-center"><MoreHorizontal size={22} /></button>} />
      <div className="no-scrollbar flex-1 overflow-y-auto pb-10">
        <div className="bg-[var(--we-cell)] px-4 pb-4 pt-3">
          <div className="flex items-center gap-4">
            <SqAvatar name={name} color={color} size={68} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[20px] font-semibold text-[var(--we-text)]">{name}</div>
              <div className="truncate text-[13.5px] text-[var(--we-sub)]">{[handle && `@${handle}`, place].filter(Boolean).join(" · ") || (isMe ? "Add your handle and school in Settings" : "")}</div>
            </div>
          </div>
          <div className="mt-4 flex gap-6 text-[13.5px] text-[var(--we-sub)]">
            <span><b className="text-[16px] font-semibold text-[var(--we-text)]">{followers}</b> Followers</span>
            <span><b className="text-[16px] font-semibold text-[var(--we-text)]">{likes}</b> Likes</span>
            <span><b className="text-[16px] font-semibold text-[var(--we-text)]">{mine.length}</b> Posts</span>
          </div>
          {bio && <p className="mt-3 whitespace-pre-line text-[14.5px] leading-snug text-[var(--we-text)]">{bio}</p>}
          {links.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{links.map((l) => (
              <a key={l.url} href={cleanUrl(l.url)!} target="_blank" rel="noopener noreferrer nofollow" className="flex max-w-full items-center gap-1 text-[14px] text-[var(--we-link)]"><Link2 size={14} className="shrink-0" /><span className="truncate">{l.label || new URL(cleanUrl(l.url)!).hostname}</span></a>
            ))}</div>
          )}
          <div className="mt-3"><ProfileBadges userId={realId} /></div>
          {isMe ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setOverlay({ t: "post" })} className="rounded-[6px] bg-[var(--we-accent)] py-2.5 text-[15px] font-medium text-white active:opacity-80">Post</button>
              <button onClick={() => setOverlay({ t: "settings" })} className="rounded-[6px] bg-[var(--we-bg)] py-2.5 text-[15px] font-medium text-[var(--we-text)] active:opacity-80">Edit Channel</button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={follow} className={`rounded-[6px] py-2.5 text-[15px] font-medium active:opacity-80 ${isFollowing ? "bg-[var(--we-bg)] text-[var(--we-sub)]" : "bg-[var(--we-accent)] text-white"}`}>{isFollowing ? "Following" : "Follow"}</button>
              <button onClick={() => { if (!isContact) addContact(id); setOverlay({ t: "thread", id }); }} className="rounded-[6px] bg-[var(--we-bg)] py-2.5 text-[15px] font-medium text-[var(--we-text)] active:opacity-80">Message</button>
            </div>
          )}
        </div>

        <div className="no-scrollbar mt-2 flex gap-6 overflow-x-auto border-b border-[var(--we-sep)] bg-[var(--we-cell)] px-4 text-[15px]">
          {tabs.map(([t, label]) => {
            const n = t === "videos" ? videos.length : t === "posts" ? texts.length : t === "courses" ? courses.length : null;
            return <button key={t} onClick={() => setTab(t)} className={`shrink-0 border-b-2 py-2.5 ${tab === t ? "border-[var(--we-accent)] font-medium text-[var(--we-text)]" : "border-transparent text-[var(--we-sub)]"}`}>{label}{n ? ` ${n}` : ""}</button>;
          })}
        </div>
        {tab === "playlists" && <div className="bg-[var(--we-cell)] p-4"><PlaylistsTab ownerId={realId} isMe={isMe} /></div>}
        {tab === "liked" && isMe && <div className="bg-[var(--we-cell)] p-4"><LikedTab /></div>}
        {tab === "videos" && (videos.length === 0 ? none(isMe ? "Your videos show here. Tap Post to upload one." : `${first} hasn't posted a video yet`) : <VideoGrid videos={videos} />)}
        {tab === "posts" && (texts.length === 0 ? none(isMe ? "Your posts show here" : `${first} hasn't written a post yet`) : <div className="space-y-2 pt-2">{texts.map((x) => (<div key={x.id} className="bg-[var(--we-cell)] px-3 py-2"><PostCard post={x} onProfile={() => undefined} /></div>))}</div>)}
        {tab === "courses" && (courses.length === 0 ? none(isMe ? "Share a course and it shows here" : `${first} hasn't shared a course you can see`) : (
          <div className="bg-[var(--we-cell)]">{courses.map((s) => (
            <button key={s.id} onClick={() => { setOverlay(null); openShared(s.id); }} className="flex w-full items-center gap-3 pl-4 text-left active:bg-[var(--we-bg)]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-[var(--we-accent)] text-[11px] font-bold text-white">{s.code.replace(/\s/g, "").slice(0, 4)}</span>
              <span className="min-w-0 flex-1 border-b border-[var(--we-sep)] py-3 pr-4">
                <span className="flex items-center justify-between gap-2"><span className="truncate text-[16px] text-[var(--we-text)]">{s.name}</span><span className="shrink-0 text-[13px] text-[var(--we-sub)]">{s.priceNgn ? naira(s.priceNgn) : "Free"}</span></span>
                <span className="block truncate text-[13px] text-[var(--we-sub)]">{s.code} · {s.members.length} member{s.members.length === 1 ? "" : "s"}</span>
              </span>
            </button>
          ))}</div>
        ))}
      </div>
      <Sheet open={menu} onClose={() => setMenu(false)} title={handle ? `@${handle}` : name}>
        <div className="space-y-2">
          <Btn variant="ghost" onClick={async () => { const reason = prompt("What's wrong with this account? (optional)") ?? ""; setMenu(false); const err = await reportThing("account", id, reason); flash(err ?? "Thanks. Our team will review this account."); }}><span className="inline-flex items-center gap-2"><Flag size={16} /> Report this account</span></Btn>
          <button onClick={() => { toggleBlock(id); setMenu(false); flash(blocked.includes(id) ? "Unblocked" : "Blocked. You won't see their posts or messages"); if (!blocked.includes(id)) setOverlay(null); }} className="w-full rounded-2xl py-3.5 text-[15px] font-semibold text-[var(--help)] active:scale-[0.97]">{blocked.includes(id) ? "Unblock" : "Block"}</button>
        </div>
      </Sheet>
    </div>
  );
}

// ---------- A YouTube creator whose videos play on Birdie ----------
function SourceScreen({ name, onBack }: { name: string; onBack: () => void }) {
  const { posts, searchFeed } = useApp();
  useEffect(() => { void searchFeed(name); }, [name, searchFeed]);
  const videos = posts.filter((x) => x.sourceName === name).sort((a, b) => b.createdAt - a.createdAt);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header onBack={onBack} title={<div className="truncate text-[14.5px] font-bold">{name}</div>} />
      <div className="no-scrollbar flex-1 overflow-y-auto pb-8">
        <div className="h-20 bg-gradient-to-br from-[#7C4DDB] to-[#3b1f7a]" />
        <div className="-mt-9 space-y-3 px-4">
          <div className="rounded-full ring-4 ring-[var(--paper)] w-fit"><Avatar initials={initials(name)} color={colorFor(name)} size={72} /></div>
          <div>
            <div className="disp text-[21px] font-bold leading-tight">{name}</div>
            <div className="text-[12.5px] text-[var(--dim)]">YouTube creator · {videos.length} video{videos.length === 1 ? "" : "s"} on Birdie</div>
          </div>
          <p className="text-[13px] leading-snug text-[var(--dim)]">These videos play through YouTube, so every view counts for {name}.</p>
          <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`} target="_blank" rel="noopener noreferrer" className="block rounded-2xl bg-[var(--ink)] py-3 text-center text-[14px] font-semibold text-[var(--paper)] active:scale-95">See {name} on YouTube</a>
          <div className="space-y-4 pt-1">{videos.map((x) => (<PostCard key={x.id} post={x} onProfile={() => undefined} />))}</div>
        </div>
      </div>
    </div>
  );
}

// ---------- Post composer: upload a video or write a post ----------
function Composer({ onClose }: { onClose: () => void }) {
  const { addPost, flash, setTab, plus, openPlus } = useApp();
  const [kind, setKind] = useState<"video" | "text">(plus ? "video" : "text");
  // Posting videos is a Birdie Plus feature; writing posts is free.
  const pickKind = (k: "video" | "text") => { if (k === "video" && !plus) { openPlus("Posting videos to Explore is part of Birdie Plus. Writing posts stays free."); return; } setKind(k); };
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [field, setField] = useState(""); const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null); const [url, setUrl] = useState<string>();
  const [secs, setSecs] = useState<number>();
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const ok = title.trim() && field.trim() && (kind === "video" ? !!file : body.trim());

  function pick(f: File | null) {
    if (!f) return;
    if (f.size > 500 * 1024 * 1024) { flash("That video is over 500 MB. Trim it or pick a shorter one."); return; }
    setFile(f); const u = URL.createObjectURL(f); setUrl(u);
    const v = document.createElement("video"); v.preload = "metadata"; v.src = u;
    v.onloadedmetadata = () => setSecs(Math.round(v.duration));
  }
  async function publish() {
    setBusy(true);
    if (kind === "video") flash("Uploading your video...");
    const err = await addPost({ kind, title: title.trim(), body: kind === "text" ? body.trim() : undefined, file: kind === "video" ? file ?? undefined : undefined, field: field.trim(), tags: tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean), durationSeconds: secs });
    setBusy(false);
    if (err) { flash(err); return; }
    flash("Posted to Explore"); setTitle(""); setBody(""); setField(""); setTags(""); setFile(null); setUrl(undefined); setSecs(undefined); setTab("explore"); onClose();
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header onBack={onClose} title={<h2 className="disp text-[19px] font-bold">New post</h2>} />
      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <Segmented value={kind} onChange={pickKind} options={[{ id: "video", label: plus ? "Upload a video" : "Upload a video (Plus)" }, { id: "text", label: "Write a post" }]} />
        {kind === "video" && (<>
          <input ref={input} type="file" accept="video/*" hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          {url ? <video src={url} controls className="aspect-video w-full rounded-2xl bg-black" /> : <button onClick={() => input.current?.click()} className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--line)] text-[var(--dim)] active:scale-[0.98]"><Video size={26} /><span className="text-[13px] font-semibold">Choose a video from your device</span></button>}
          {url && <Btn variant="ghost" onClick={() => input.current?.click()}>Choose a different video</Btn>}
        </>)}
        <TextField value={title} onChange={setTitle} placeholder={kind === "video" ? "Title" : "Headline"} />
        {kind === "text" && <TextField multiline value={body} onChange={setBody} placeholder="Share a tip, a summary, a worked example..." />}
        <TextField value={field} onChange={setField} placeholder="Field, e.g. Computer Science" />
        <TextField value={tags} onChange={setTags} placeholder="Tags, separated by commas" />
        <Btn variant="study" disabled={!ok || busy} onClick={() => void publish()}><span className="inline-flex items-center gap-2"><Plus size={16} /> {busy ? (kind === "video" ? "Uploading..." : "Posting...") : "Publish"}</span></Btn>
      </div>
    </div>
  );
}
