"use client";

import { reportThing } from "./live/socialData";
import { ProfileBadges } from "./ProfileBadges";
import { ArrowLeft, Flag, Link2, Plus, Settings as Cog, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PostCard, { colorFor, initials } from "./PostCard";
import { naira, useApp, type Post } from "./store";
import { LikedTab, PlaylistsTab } from "./Playlists";
import { Watch } from "./Watch";
import { cleanUrl, fetchChannelStats } from "./live/socialData";
import { Avatar, Btn, Empty, IconBtn, Screen, Segmented, Sheet, TextField } from "./ui";

export default function Overlays() {
  const { overlay, setOverlay, watching, minimizeWatch } = useApp();
  const close = () => setOverlay(null);
  return (
    <>
      <Screen open={overlay?.t === "profile"} z={62}>{overlay?.t === "profile" && <ProfileScreen id={overlay.id} onBack={close} />}</Screen>
      <Screen open={overlay?.t === "source"} z={62}>{overlay?.t === "source" && <SourceScreen name={overlay.name} onBack={close} />}</Screen>
      <Screen open={overlay?.t === "post"} z={62}><Composer onClose={close} /></Screen>
      <Screen open={!!watching && !watching.mini} z={64} fade>{watching && <Watch key={watching.id} id={watching.id} onBack={minimizeWatch} />}</Screen>
    </>
  );
}

function Header({ title, onBack, right }: { title: React.ReactNode; onBack: () => void; right?: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] px-4 pb-2.5 pt-1">
      <IconBtn label="Back" onClick={onBack}><ArrowLeft size={17} /></IconBtn>
      <div className="min-w-0 flex-1">{title}</div>{right}
    </div>
  );
}

// ---------- Channel (a creator's, or mine): videos, posts and shared courses, YouTube-style ----------
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
    <div className="flex min-h-0 flex-1 flex-col"><Header onBack={onBack} title={<div className="text-[14.5px] font-bold">Channel</div>} /><div className="flex flex-1 items-center justify-center text-[13px] text-[var(--dim)]">Loading channel...</div></div>
  );
  const mine = posts.filter((x) => x.authorId === id);
  // Pinned posts (up to 3) sit at the top, most recently pinned first.
  const pinnedFirst = (a: Post, b: Post) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0) || b.createdAt - a.createdAt;
  const videos = mine.filter((x) => x.kind === "video").sort(pinnedFirst), texts = mine.filter((x) => x.kind === "text").sort(pinnedFirst);
  const courses = shared.filter((s) => s.ownerId === id);
  const name = isMe ? profile.name || "You" : p!.name;
  const handle = isMe ? profile.handle : p!.handle;
  const bio = isMe ? profile.bio : p!.bio;
  const links = ((isMe ? profile.links : p!.links) ?? []).filter((l) => cleanUrl(l.url));
  const place = (isMe ? [profile.institution, profile.country] : [p!.school, p!.country]).filter(Boolean).join(" · ");
  const isFollowing = following.includes(id), isContact = contacts.includes(id);
  const followers = stats ? stats.followers : isFollowing ? 1 : 0;
  const likes = stats ? stats.likes : mine.reduce((a, x) => a + x.likes, 0);

  function follow() {
    toggleFollow(id);
    setStats((s) => (s ? { ...s, followers: s.followers + (isFollowing ? -1 : 1) } : s));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header onBack={onBack} title={<div className="truncate text-[14.5px] font-bold">{isMe ? "Your channel" : handle ? `@${handle}` : name}</div>} right={isMe ? <IconBtn label="Settings" onClick={() => setOverlay({ t: "settings" })}><Cog size={16} /></IconBtn> : <IconBtn label="More" onClick={() => setMenu(true)}><Flag size={16} /></IconBtn>} />
      <div className="no-scrollbar flex-1 overflow-y-auto pb-8">
        <div className="h-20 bg-gradient-to-br from-[#7C4DDB] to-[#3b1f7a]" />
        <div className="-mt-9 space-y-3 px-4">
          <div className="flex items-end gap-3"><div className="rounded-full ring-4 ring-[var(--paper)]"><Avatar initials={initials(name)} color={isMe ? "#A63FBD" : p!.color} size={72} /></div></div>
          <div>
            <div className="disp text-[21px] font-bold leading-tight">{name}</div>
            <div className="text-[12.5px] text-[var(--dim)]">{[handle && `@${handle}`, place].filter(Boolean).join(" · ") || (isMe ? "Add your handle and school in Settings" : "")}</div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]"><span><b>{followers}</b> follower{followers === 1 ? "" : "s"}</span><span><b>{likes}</b> like{likes === 1 ? "" : "s"}</span><span><b>{mine.length}</b> post{mine.length === 1 ? "" : "s"}</span><span><b>{courses.length}</b> course{courses.length === 1 ? "" : "s"}</span></div>
          </div>
          <ProfileBadges userId={realId} isMe={isMe} />
          {bio && <p className="whitespace-pre-line text-[13.5px] leading-snug text-[var(--text)]">{bio}</p>}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-2">{links.map((l) => (
              <a key={l.url} href={cleanUrl(l.url)!} target="_blank" rel="noopener noreferrer nofollow" className="flex max-w-full items-center gap-1.5 rounded-full bg-[var(--paper-dim)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text)]"><Link2 size={13} className="shrink-0" /><span className="truncate">{l.label || new URL(cleanUrl(l.url)!).hostname}</span></a>
            ))}</div>
          )}
          {isMe ? <Btn variant="ghost" onClick={() => setOverlay({ t: "settings" })}>Edit channel in Settings</Btn> : (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={follow} className={`rounded-2xl py-3 text-[14px] font-semibold active:scale-95 ${isFollowing ? "bg-[var(--paper-dim)] text-[var(--text)]" : "bg-[var(--uni)] text-white"}`}>{isFollowing ? "Following" : "Follow"}</button>
              <button onClick={() => { if (!isContact) addContact(id); setOverlay({ t: "thread", id }); }} className="rounded-2xl bg-[var(--ink)] py-3 text-[14px] font-semibold text-[var(--paper)] active:scale-95">{isContact ? "Message" : "Add and message"}</button>
            </div>
          )}
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">{([["videos", `Videos ${videos.length}`], ["posts", `Posts ${texts.length}`], ["playlists", "Playlists"], ["courses", `Courses ${courses.length}`], ...(isMe ? [["liked", "Liked"]] : [])] as [typeof tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition active:scale-95 ${tab === id ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{label}</button>
          ))}</div>
          {tab === "playlists" && <PlaylistsTab ownerId={realId} isMe={isMe} />}
          {tab === "liked" && isMe && <LikedTab />}
          {tab === "videos" && (videos.length === 0 ? <Empty title="No videos yet" text={isMe ? "Tap the mascot in Explore and choose Post to upload one." : `${name.split(" ")[0]} hasn't uploaded a video yet.`} /> : <div className="space-y-4">{videos.map((x) => (<PostCard key={x.id} post={x} onProfile={() => undefined} />))}</div>)}
          {tab === "posts" && (texts.length === 0 ? <Empty title="No posts yet" text={isMe ? "Tap the mascot in Explore and choose Post." : `${name.split(" ")[0]} hasn't written a post yet.`} /> : <div className="space-y-4">{texts.map((x) => (<PostCard key={x.id} post={x} onProfile={() => undefined} />))}</div>)}
          {tab === "courses" && (courses.length === 0 ? <Empty title="No shared courses" text={isMe ? "Share a course from Study and it shows up here." : `${name.split(" ")[0]} hasn't shared a course you can see.`} /> : (
            <div className="space-y-2.5">{courses.map((s) => (
              <button key={s.id} onClick={() => { setOverlay(null); openShared(s.id); }} className="w-full rounded-2xl border border-[var(--line)] bg-white p-3.5 text-left active:scale-[0.98]">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-[14px] font-bold text-[var(--text)]">{s.code} · {s.name}</div><div className="mt-0.5 line-clamp-2 text-[12px] text-[var(--dim)]">{s.description}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${s.priceNgn ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--study-soft)] text-[var(--study)]"}`}>{s.priceNgn ? naira(s.priceNgn) : "Free"}</span></div>
                <div className="mt-2 text-[12px] font-semibold text-[var(--dim)]">{s.members.length} member{s.members.length === 1 ? "" : "s"}</div>
              </button>
            ))}</div>
          ))}
        </div>
      </div>
      <Sheet open={menu} onClose={() => setMenu(false)} title={`@${p?.handle ?? ""}`}>
        <div className="space-y-2">
          <Btn variant="ghost" onClick={async () => { const reason = prompt("What's wrong with this account? (optional)") ?? ""; setMenu(false); const err = await reportThing("account", id, reason); flash(err ?? "Thanks. Our team will review this account."); }}>Report this account</Btn>
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
