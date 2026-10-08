"use client";

import { ArrowLeft, CheckCheck, Flag, Link2, MessageCircle, Plus, Search, Send, Settings as Cog, UserPlus, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PostCard, { initials } from "./PostCard";
import { naira, useApp, type Person, type Post } from "./store";
import { LikedTab, PlaylistsTab } from "./Playlists";
import { Watch } from "./Watch";
import { cleanUrl, fetchChannelStats } from "./live/socialData";
import { Avatar, Btn, Empty, IconBtn, Screen, Segmented, Sheet, TextField } from "./ui";

export default function Overlays() {
  const { overlay, setOverlay } = useApp();
  const close = () => setOverlay(null);
  return (
    <>
      <Screen open={overlay?.t === "chats"} z={60}><ChatsScreen onClose={close} /></Screen>
      <Screen open={overlay?.t === "thread"} z={62}>{overlay?.t === "thread" && <Thread id={overlay.id} onBack={() => setOverlay({ t: "chats" })} />}</Screen>
      <Screen open={overlay?.t === "profile"} z={62}>{overlay?.t === "profile" && <ProfileScreen id={overlay.id} onBack={close} />}</Screen>
      <Screen open={overlay?.t === "post"} z={62}><Composer onClose={close} /></Screen>
      <Screen open={overlay?.t === "watch"} z={64}>{overlay?.t === "watch" && <Watch key={overlay.id} id={overlay.id} onBack={close} />}</Screen>
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

// ---------- Chats list + people ----------
function ChatsScreen({ onClose }: { onClose: () => void }) {
  const { people, contacts, following, convos, setOverlay, addContact, toggleFollow, flash, profile } = useApp();
  const [seg, setSeg] = useState<"chats" | "people">("chats");
  const [add, setAdd] = useState(false);
  const [q, setQ] = useState("");
  const list = contacts.map((id) => people.find((p) => p.id === id)).filter(Boolean) as Person[];
  const sorted = [...list].sort((a, b) => (convos[b.id]?.length ?? 0) - (convos[a.id]?.length ?? 0));
  const found = people.filter((p) => !q.trim() || `${p.name} ${p.handle} ${p.field}`.toLowerCase().includes(q.trim().toLowerCase()));
  const link = `https://birdie.app/invite/${profile.handle || "me"}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header title={<h2 className="disp text-[19px] font-bold">Chats</h2>} onBack={onClose} right={<button onClick={() => setAdd(true)} className="flex items-center gap-1.5 rounded-xl bg-[var(--ink)] px-3 py-2 text-[12.5px] font-semibold text-[var(--paper)] active:scale-95"><UserPlus size={14} /> Add</button>} />
      <div className="px-4 pt-3"><Segmented value={seg} onChange={setSeg} options={[{ id: "chats", label: "Chats" }, { id: "people", label: `People (${contacts.length + following.filter((f) => !contacts.includes(f)).length})` }]} /></div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-3">
        {seg === "chats" ? (
          sorted.length === 0 ? <Empty icon={<MessageCircle size={20} />} title="No chats yet" text="Add classmates, tutors and people whose help you value, and chat right here instead of scattered WhatsApp groups." action={<Btn variant="study" onClick={() => setAdd(true)}>Add people</Btn>} /> : (
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
              {sorted.map((p) => { const last = convos[p.id]?.slice(-1)[0]; return (
                <button key={p.id} onClick={() => setOverlay({ t: "thread", id: p.id })} className="flex w-full items-center gap-3 border-b border-[var(--line)] p-3 text-left last:border-0 active:bg-[var(--paper-dim)]">
                  <Avatar initials={initials(p.name)} color={p.color} size={44} />
                  <div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><span className="truncate text-[14.5px] font-semibold">{p.name}</span><span className="shrink-0 text-[11px] text-[var(--dim)]">{last?.t}</span></div><div className="truncate text-[12.5px] text-[var(--dim)]">{last ? last.text : p.field}</div></div>
                </button>); })}
            </div>)
        ) : (
          list.length + following.length === 0 ? <Empty title="No one yet" text="People you add and creators you follow show up here." /> : (
            <div className="space-y-2">{Array.from(new Set([...contacts, ...following])).map((id) => people.find((p) => p.id === id)).filter(Boolean).map((p) => { const person = p as Person; return (
              <div key={person.id} className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-3">
                <button onClick={() => setOverlay({ t: "profile", id: person.id })}><Avatar initials={initials(person.name)} color={person.color} size={42} /></button>
                <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold">{person.name}</div><div className="text-[11.5px] text-[var(--dim)]">{contacts.includes(person.id) ? "Contact" : ""}{contacts.includes(person.id) && following.includes(person.id) ? " · " : ""}{following.includes(person.id) ? "Following" : ""}</div></div>
                <button onClick={() => setOverlay({ t: "thread", id: person.id })} aria-label="Message" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--uni-soft)] text-[var(--uni-deep)]"><MessageCircle size={16} /></button>
              </div>); })}</div>)
        )}
      </div>

      <Sheet open={add} onClose={() => setAdd(false)} title="Add people">
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[var(--paper-dim)] px-3.5 py-3"><Search size={16} className="text-[var(--dim)]" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, handle or field" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#a99fb8]" /></div>
        {found.length === 0 ? <p className="mb-3 text-[13px] leading-snug text-[var(--dim)]">{people.length === 0 ? "No one to find yet. Invite a classmate with your link below and they'll appear once they join." : "No one matches that."}</p> : (
          <div className="mb-4 space-y-2">{found.map((p) => { const has = contacts.includes(p.id); return (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-3">
              <Avatar initials={initials(p.name)} color={p.color} size={40} />
              <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold">{p.name}</div><div className="truncate text-[11.5px] text-[var(--dim)]">@{p.handle} · {p.field}</div></div>
              <button disabled={has} onClick={() => { addContact(p.id); flash(`${p.name.split(" ")[0]} added`); }} className="rounded-xl bg-[var(--uni)] px-3 py-2 text-[12px] font-semibold text-white active:scale-95 disabled:bg-[var(--paper-dim)] disabled:text-[var(--dim)]">{has ? "Added" : "Add"}</button>
              <button onClick={() => toggleFollow(p.id)} className="rounded-xl bg-[var(--paper-dim)] px-3 py-2 text-[12px] font-semibold text-[var(--text)] active:scale-95">{following.includes(p.id) ? "Following" : "Follow"}</button>
            </div>); })}</div>)}
        <Btn variant="ghost" onClick={() => { navigator.clipboard?.writeText(link).catch(() => undefined); flash("Invite link copied"); }}><span className="inline-flex items-center gap-2"><Link2 size={16} /> Copy my invite link</span></Btn>
        <p className="mt-2 text-center text-[11.5px] text-[var(--dim)]">{link}</p>
      </Sheet>
    </div>
  );
}

// ---------- One-to-one chat ----------
function Thread({ id, onBack }: { id: string; onBack: () => void }) {
  const { personById, convos, sendChat, setOverlay } = useApp();
  const p = personById(id);
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const msgs = convos[id] ?? [];
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);
  if (!p) return null;
  const send = () => { if (draft.trim()) { sendChat(id, draft.trim()); setDraft(""); } };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header onBack={onBack} title={<button onClick={() => setOverlay({ t: "profile", id })} className="flex items-center gap-3 text-left"><Avatar initials={initials(p.name)} color={p.color} size={36} /><div><div className="text-[14.5px] font-bold leading-tight">{p.name}</div><div className="text-[11.5px] text-[var(--dim)]">@{p.handle}</div></div></button>} />
      <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#F0E9F6] px-4 py-3">
        {msgs.length === 0 && <div className="pt-20 text-center text-[13px] text-[var(--dim)]">Say hi to {p.name.split(" ")[0]}.</div>}
        {msgs.map((m) => (<div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : ""}`}><div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[14px] leading-snug shadow-sm ${m.from === "me" ? "rounded-tr-md bg-[#EBD3F5]" : "rounded-tl-md bg-white"}`}>{m.text}<div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#8a7fa0]">{m.t}{m.from === "me" && <CheckCheck size={12} className="text-[#7C4DDB]" />}</div></div></div>))}
        <div ref={end} />
      </div>
      <div className="flex items-center gap-2 bg-[var(--paper)] px-4 pb-4 pt-2.5">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message" className="min-w-0 flex-1 rounded-full bg-[var(--paper-dim)] px-4 py-3 text-[14px] outline-none placeholder:text-[#a99fb8]" />
        <button onClick={send} disabled={!draft.trim()} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--uni)] text-white transition active:scale-90 disabled:opacity-40"><Send size={17} /></button>
      </div>
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

  if (!isMe && !p) return null;
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
          <Btn variant="ghost" onClick={() => { setMenu(false); flash("Thanks. Our team will review this profile"); }}>Report this account</Btn>
          <button onClick={() => { toggleBlock(id); setMenu(false); flash(blocked.includes(id) ? "Unblocked" : "Blocked. You won't see their posts or messages"); if (!blocked.includes(id)) setOverlay(null); }} className="w-full rounded-2xl py-3.5 text-[15px] font-semibold text-[var(--help)] active:scale-[0.97]">{blocked.includes(id) ? "Unblock" : "Block"}</button>
        </div>
      </Sheet>
    </div>
  );
}

// ---------- Post composer: upload a video or write a post ----------
function Composer({ onClose }: { onClose: () => void }) {
  const { addPost, flash, setTab } = useApp();
  const [kind, setKind] = useState<"video" | "text">("video");
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
        <Segmented value={kind} onChange={setKind} options={[{ id: "video", label: "Upload a video" }, { id: "text", label: "Write a post" }]} />
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
