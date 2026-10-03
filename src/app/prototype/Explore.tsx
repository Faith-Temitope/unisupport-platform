"use client";

import { BadgeCheck, BookmarkPlus, Search, Send, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { topInterests } from "./engine";
import PostCard, { initials } from "./PostCard";
import { firstName, nowTime, useApp, type SharedCourse } from "./store";
import { Avatar, Btn, DemoControls, Empty, Label, Segmented, Sheet, TextField, TopBar } from "./ui";

export default function Explore({ active }: { active: boolean }) {
  const { posts, courses, chats, settings, following, blocked, shared, setOverlay, setTab, goStudy, joinShared, leaveShared, shareCourse, sendShared, loadSharedDetail, personById, profile, flash } = useApp();
  const [seg, setSeg] = useState<"feed" | "courses">("feed");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("For you");
  const [detail, setDetail] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  // Message/member counts in the list come from a cheaper batched fetch; the full thread for a
  // shared course loads once its detail sheet opens, then refreshes while it stays open.
  useEffect(() => {
    if (!detail) return;
    loadSharedDetail(detail);
    const i = setInterval(() => loadSharedDetail(detail), 4000);
    return () => clearInterval(i);
  }, [detail, loadSharedDetail]);

  // Tags come from what you actually study and chat about with Birdie (like YouTube's recommendations).
  const interests = useMemo(() => topInterests(chats, courses), [chats, courses]);
  const tags = useMemo(() => {
    const t = ["For you", "Following"];
    if (settings.personalTags) t.push(...interests); else t.push(...Array.from(new Set(posts.map((p) => p.field))).slice(0, 6));
    return t;
  }, [interests, posts, settings.personalTags]);

  const feed = useMemo(() => {
    const term = q.trim().toLowerCase();
    const has = (p: (typeof posts)[number], s: string) => `${p.title} ${p.field} ${p.tags.join(" ")} ${p.body ?? ""}`.toLowerCase().includes(s);
    let list = posts.filter((p) => !blocked.includes(p.authorId) && (!term || has(p, term)) && (tag === "For you" || (tag === "Following" ? following.includes(p.authorId) : has(p, tag.toLowerCase()))));
    if (tag === "For you" && settings.personalTags && interests.length) list = [...list].sort((a, b) => Number(interests.some((i) => has(b, i))) - Number(interests.some((i) => has(a, i))) || b.createdAt - a.createdAt);
    else list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [posts, q, tag, following, blocked, interests, settings.personalTags]);

  const filteredShared = shared.filter((s) => !q.trim() || `${s.code} ${s.name} ${s.field}`.toLowerCase().includes(q.trim().toLowerCase()));
  const sel = shared.find((s) => s.id === detail) ?? null;

  return (
    <div className="flex h-full flex-col">
      <TopBar title={<h2 className="disp text-[24px] font-bold text-[var(--text)]">Explore</h2>} />
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 rounded-2xl bg-[var(--paper-dim)] px-3.5 py-3"><Search size={16} className="text-[var(--dim)]" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search videos, posts, courses..." className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#a99fb8]" /></div>
        <div className="mt-3"><Segmented value={seg} onChange={setSeg} options={[{ id: "feed", label: "Videos & posts" }, { id: "courses", label: "Shared courses" }]} /></div>
        {seg === "feed" && <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">{tags.map((t) => (<button key={t} onClick={() => setTag(t)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize transition active:scale-95 ${tag === t ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-white text-[var(--dim)] ring-1 ring-[var(--line)]"}`}>{t}</button>))}</div>}
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-32">
        {seg === "feed" ? (
          feed.length === 0 ? (
            <Empty icon={<Search size={20} />} title={posts.length === 0 ? "Nothing here yet" : "No matches"} text={posts.length === 0 ? "Follow creators and watch what other students post, or share something yourself. Tap the mascot and choose Post." : tag === "Following" ? "Follow a creator to see their posts here." : "Try another tag or search term."} action={<Btn variant="study" onClick={() => setOverlay({ t: "post" })}>Post something</Btn>} />
          ) : (
            <div className="space-y-4">{feed.map((p) => (<PostCard key={p.id} post={p} onProfile={(id) => setOverlay({ t: "profile", id })} />))}</div>
          )
        ) : (
          <div className="space-y-3">
            <Btn variant="ghost" onClick={() => (courses.length ? setShareOpen(true) : flash("Create a course in Study first"))}>Share one of my courses</Btn>
            {filteredShared.length === 0 ? <Empty icon={<Users size={20} />} title="No shared courses yet" text="Students share their course libraries here. Add one to your Study and chat with everyone in it." /> : filteredShared.map((s) => {
              const joined = s.members.includes("me");
              return (
                <button key={s.id} onClick={() => setDetail(s.id)} className="w-full rounded-2xl border border-[var(--line)] bg-white p-3.5 text-left active:scale-[0.98]">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[14.5px] font-bold text-[var(--text)]">{s.code} · {s.name}</div><div className="mt-0.5 text-[12px] text-[var(--dim)]">{s.school ? `${s.school} · ` : ""}shared by {s.ownerName || (s.ownerId === "me" ? profile.name || "you" : personById(s.ownerId)?.name)}</div></div>{joined && <BadgeCheck size={18} className="shrink-0 text-[var(--uni)]" />}</div>
                  <div className="mt-2.5 flex gap-4 text-[12px] font-semibold text-[var(--dim)]"><span className="flex items-center gap-1"><Users size={13} /> {s.members.length}</span><span>{s.files.length} files</span><span>{s.messages.length} messages</span></div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!sel} onClose={() => setDetail(null)} title={sel ? `${sel.code} · ${sel.name}` : ""}>
        {sel && <SharedDetail s={sel} onJoin={() => { const id = joinShared(sel.id); flash("Added to your Study"); if (id) void id; }} onOpen={() => { const c = courses.find((x) => x.sharedId === sel.id); setDetail(null); if (c) goStudy({ courseId: c.id }); else setTab("study"); }} onLeave={() => { leaveShared(sel.id); flash("Left the course chat"); }} onSend={(t) => sendShared(sel.id, t)} onProfile={(id) => { setDetail(null); setOverlay({ t: "profile", id }); }} me={firstName(profile)} personName={(id) => (id === "me" ? "You" : personById(id)?.name ?? "Someone")} />}
      </Sheet>

      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} onShare={(cid, d, f, n, sc) => { shareCourse(cid, d, f, n, sc); setShareOpen(false); flash("Shared to Explore"); }} />

      <DemoControls active={active} title="Explore: how it works">
        <ul className="list-disc space-y-1.5 pl-4 text-[12.5px] leading-snug text-[var(--text)]"><li>Videos play as you hover over them (turn off in Settings)</li><li>Tags come from your courses and your Birdie chats</li><li>Tap a creator's avatar to view and follow them</li><li>Inside a shared course, use its Chat tab to talk to everyone in it</li><li>Tap the mascot and choose Post to upload a video or write a post</li></ul>
      </DemoControls>
    </div>
  );
}

function SharedDetail({ s, onJoin, onOpen, onLeave, onSend, onProfile, personName }: { s: SharedCourse; onJoin: () => void; onOpen: () => void; onLeave: () => void; onSend: (t: string) => void; onProfile: (id: string) => void; me: string; personName: (id: string) => string }) {
  const [tab, setTab] = useState<"about" | "chat">("about");
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const joined = s.members.includes("me");
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [s.messages.length, tab]);
  return (
    <div>
      <Segmented value={tab} onChange={setTab} options={[{ id: "about", label: "About" }, { id: "chat", label: `Chat (${s.messages.length})` }]} />
      {tab === "about" ? (
        <div className="mt-4 space-y-4">
          <p className="text-[13.5px] leading-snug text-[var(--text)]">{s.description}</p>
          <div className="rounded-xl bg-[var(--paper-dim)] px-3 py-2 text-[12.5px] text-[var(--dim)]">Shared by <b className="text-[var(--text)]">{s.ownerName || personName(s.ownerId)}</b>{s.school ? <> · <b className="text-[var(--text)]">{s.school}</b></> : null}</div>
          <div><Label>Members ({s.members.length})</Label><div className="flex flex-wrap gap-2">{s.members.map((id) => (<button key={id} onClick={() => id !== "me" && onProfile(id)} className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 ring-1 ring-[var(--line)]"><Avatar initials={initials(personName(id))} color="#7C4DDB" size={26} /><span className="text-[12.5px] font-semibold">{personName(id)}</span></button>))}</div></div>
          <div><Label>Files</Label><div className="space-y-1.5">{s.files.map((f) => (<div key={f} className="rounded-xl bg-white px-3 py-2 text-[13px] ring-1 ring-[var(--line)]">{f}</div>))}{s.files.length === 0 && <div className="text-[13px] text-[var(--dim)]">No files in this course yet.</div>}</div></div>
          {joined ? (<div className="space-y-2"><Btn variant="study" onClick={onOpen}>Open in my Study</Btn>{s.ownerId !== "me" && <Btn variant="ghost" onClick={onLeave}>Leave chat</Btn>}</div>) : <Btn variant="study" onClick={onJoin}><span className="inline-flex items-center gap-2"><BookmarkPlus size={16} /> Add to my Study and join chat</span></Btn>}
        </div>
      ) : (
        <div className="mt-3">
          <div className="no-scrollbar h-[300px] space-y-2 overflow-y-auto rounded-2xl bg-[#F0E9F6] p-3">
            {s.messages.length === 0 && <div className="pt-16 text-center text-[13px] text-[var(--dim)]">No messages yet. Say hi to the class.</div>}
            {s.messages.map((m) => (<div key={m.id} className={`flex ${m.authorId === "me" ? "justify-end" : ""}`}><div className={`max-w-[82%] rounded-2xl px-3 py-2 text-[13.5px] leading-snug shadow-sm ${m.authorId === "me" ? "rounded-tr-md bg-[#EBD3F5]" : "rounded-tl-md bg-white"}`}>{m.authorId !== "me" && <div className="text-[11px] font-bold text-[var(--birdie)]">{personName(m.authorId)}</div>}{m.text}<div className="mt-0.5 text-right text-[10px] text-[#8a7fa0]">{m.t}</div></div></div>))}
            <div ref={end} />
          </div>
          {joined ? (<div className="mt-3 flex gap-2"><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { onSend(draft.trim()); setDraft(""); } }} placeholder="Message the class" className="min-w-0 flex-1 rounded-full bg-[var(--paper-dim)] px-4 py-3 text-[14px] outline-none placeholder:text-[#a99fb8]" /><button onClick={() => { if (draft.trim()) { onSend(draft.trim()); setDraft(""); } }} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--uni)] text-white active:scale-90"><Send size={17} /></button></div>) : <div className="mt-3"><Btn variant="study" onClick={onJoin}>Join to chat</Btn></div>}
        </div>
      )}
    </div>
  );
}

function ShareSheet({ open, onClose, onShare }: { open: boolean; onClose: () => void; onShare: (courseId: string, desc: string, field: string, ownerName: string, school: string) => void }) {
  const { courses, profile } = useApp();
  const [cid, setCid] = useState("");
  const [desc, setDesc] = useState(""); const [field, setField] = useState("");
  const [name, setName] = useState(""); const [school, setSchool] = useState("");
  const avail = courses.filter((c) => !c.sharedId);
  useEffect(() => { if (open) { setCid(avail[0]?.id ?? ""); setName(profile.name); setSchool(profile.institution); setField(profile.program); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet open={open} onClose={onClose} title="Share a course">
      {avail.length === 0 ? <p className="text-[13.5px] text-[var(--dim)]">All your courses are already shared.</p> : (<div className="space-y-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">{avail.map((c) => (<button key={c.id} onClick={() => setCid(c.id)} className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold ${cid === c.id ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{c.code}</button>))}</div>
        <div><div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Shown on the course</div>
          <div className="space-y-2.5"><TextField value={name} onChange={setName} placeholder="Your name" /><TextField value={school} onChange={setSchool} placeholder="Your school (optional)" /></div></div>
        <TextField value={field} onChange={setField} placeholder="Field, e.g. Computer Science" /><TextField multiline value={desc} onChange={setDesc} placeholder="What's in it? Who is it for?" />
        <Btn variant="study" disabled={!cid || !name.trim() || !field.trim() || !desc.trim()} onClick={() => { onShare(cid, desc.trim(), field.trim(), name.trim(), school.trim()); setDesc(""); }}>Publish</Btn>
      </div>)}
    </Sheet>
  );
}

export { nowTime };
