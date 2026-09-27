"use client";

import { ArrowLeft, CheckCheck, Flag, Link2, MessageCircle, Plus, Search, Send, Settings as Cog, UserPlus, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PostCard, { initials } from "./PostCard";
import { useApp, type Person } from "./store";
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

// ---------- Profile (creator or me) ----------
function ProfileScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const { personById, posts, following, contacts, blocked, toggleBlock, toggleFollow, addContact, setOverlay, profile, flash } = useApp();
  const [menu, setMenu] = useState(false);
  const isMe = id === "me";
  const p = isMe ? null : personById(id);
  const mine = posts.filter((x) => x.authorId === id);
  if (!isMe && !p) return null;
  const name = isMe ? profile.name || "You" : p!.name;
  const isFollowing = following.includes(id), isContact = contacts.includes(id);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header onBack={onBack} title={<div className="text-[14.5px] font-bold">{isMe ? "Your profile" : `@${p!.handle}`}</div>} right={isMe ? <IconBtn label="Settings" onClick={() => setOverlay({ t: "settings" })}><Cog size={16} /></IconBtn> : <IconBtn label="More" onClick={() => setMenu(true)}><Flag size={16} /></IconBtn>} />
      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="flex items-center gap-4"><Avatar initials={initials(name)} color={isMe ? "#A63FBD" : p!.color} size={72} /><div className="min-w-0"><div className="disp text-[20px] font-bold leading-tight">{name}</div><div className="text-[12.5px] text-[var(--dim)]">{isMe ? [profile.program, profile.level].filter(Boolean).join(" · ") : p!.field}</div><div className="mt-1 flex gap-4 text-[12.5px]"><span><b>{mine.length}</b> posts</span>{!isMe && <span><b>{isFollowing ? 1 : 0}</b> {isFollowing ? "follower (you)" : "followers"}</span>}</div></div></div>
        {(isMe ? profile.bio : p!.bio) && <p className="text-[13.5px] leading-snug text-[var(--text)]">{isMe ? profile.bio : p!.bio}</p>}
        {!isMe && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => toggleFollow(id)} className={`rounded-2xl py-3 text-[14px] font-semibold active:scale-95 ${isFollowing ? "bg-[var(--paper-dim)] text-[var(--text)]" : "bg-[var(--uni)] text-white"}`}>{isFollowing ? "Following" : "Follow"}</button>
            <button onClick={() => { if (!isContact) addContact(id); setOverlay({ t: "thread", id }); }} className="rounded-2xl bg-[var(--ink)] py-3 text-[14px] font-semibold text-[var(--paper)] active:scale-95">{isContact ? "Message" : "Add and message"}</button>
          </div>
        )}
        {isMe && <Btn variant="ghost" onClick={() => setOverlay({ t: "settings" })}>Edit profile in Settings</Btn>}
        <div><div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Posts</div>
          {mine.length === 0 ? <Empty title="No posts yet" text={isMe ? "Tap the mascot in Explore and choose Post." : `${name.split(" ")[0]} hasn't posted anything yet.`} /> : <div className="space-y-4">{mine.map((x) => (<PostCard key={x.id} post={x} onProfile={() => undefined} />))}</div>}
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
  const [dur, setDur] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const ok = title.trim() && field.trim() && (kind === "video" ? !!file : body.trim());

  function pick(f: File | null) {
    if (!f) return; setFile(f); const u = URL.createObjectURL(f); setUrl(u);
    const v = document.createElement("video"); v.preload = "metadata"; v.src = u;
    v.onloadedmetadata = () => { const s = Math.round(v.duration); setDur(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`); };
  }
  function publish() {
    addPost({ kind, title: title.trim(), body: kind === "text" ? body.trim() : undefined, videoUrl: kind === "video" ? url : undefined, field: field.trim(), tags: tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean), dur, grad: "from-[#7C4DDB] to-[#3b1f7a]" });
    flash("Posted to Explore"); setTitle(""); setBody(""); setField(""); setTags(""); setFile(null); setUrl(undefined); setDur(undefined); setTab("explore"); onClose();
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
        <Btn variant="study" disabled={!ok} onClick={publish}><span className="inline-flex items-center gap-2"><Plus size={16} /> Publish</span></Btn>
      </div>
    </div>
  );
}
