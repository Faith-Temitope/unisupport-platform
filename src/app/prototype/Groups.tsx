"use client";

import { ArrowLeft, BellOff, Link2, LogOut, Send, Shield, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { initials } from "./PostCard";
import { createGroup, groupAdd, groupLeave, groupLink, groupMembers, groupMessages, groupPreview, groupUpdate, joinGroup, myGroups, sendGroupMessage, type Group, type GroupMember, type GroupMsg } from "./live/groupData";
import { Linkified } from "./Linkified";
import { whileVisible } from "./perf";
import { useApp, type Person } from "./store";
import { Avatar, Btn, Empty, Sheet, TextField } from "./ui";

const clock = (t: string) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const GROUP_COLORS = ["#7C4DDB", "#1B8A85", "#D9467E", "#E2553F", "#4C6EF5", "#A63FBD"];
const colorOf = (s: string) => GROUP_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % GROUP_COLORS.length];

async function shareInvite(name: string, code: string, flash: (m: string) => void) {
  const url = groupLink(code), text = `Join "${name}" on Birdie`;
  try { if (navigator.share) await navigator.share({ title: name, text, url }); else { await navigator.clipboard.writeText(`${text}: ${url}`); flash("Invite link copied"); } } catch { /* cancelled */ }
}

/** Chats > Groups: your groups, newest activity first, with unread counts. */
export function GroupsList() {
  const { setOverlay, flash } = useApp();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState(""); const [about, setAbout] = useState("");
  const load = useCallback(() => myGroups().then(setGroups), []);
  useEffect(() => { void Promise.resolve().then(load); const t = setInterval(whileVisible(() => void load()), 15000); return () => clearInterval(t); }, [load]);
  async function create() {
    const r = await createGroup(name.trim(), about.trim());
    if (r.error || !r.id) return flash(r.error === "too_many" ? "You've made a lot of groups today" : "Couldn't create the group");
    setCreating(false); setName(""); setAbout(""); flash("Group created. Share the invite link to bring people in.");
    setOverlay({ t: "group", id: r.id });
  }
  return (
    <div className="space-y-3">
      <Btn variant="study" onClick={() => setCreating(true)}><span className="inline-flex items-center gap-2"><Users size={16} /> New group</span></Btn>
      {groups === null ? <div className="py-4 text-center text-[13px] text-[var(--dim)]">Loading...</div>
        : groups.length === 0 ? <Empty icon={<Users size={20} />} title="No groups yet" text="Make one for your department, class or study group. Anyone with the invite link can join." />
        : <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">{groups.map((g) => (
          <button key={g.id} onClick={() => setOverlay({ t: "group", id: g.id })} className="flex w-full items-center gap-3 border-b border-[var(--line)] p-3 text-left last:border-0 active:bg-[var(--paper-dim)]">
            <Avatar initials={initials(g.name)} color={colorOf(g.name)} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2"><span className="flex min-w-0 items-center gap-1.5 truncate text-[14.5px] font-semibold">{g.name}{g.muted && <BellOff size={12} className="shrink-0 text-[var(--dim)]" />}</span><span className="shrink-0 text-[11px] text-[var(--dim)]">{g.last_at ? clock(g.last_at) : ""}</span></div>
              <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--dim)]">{g.last ?? `${g.members} member${g.members === 1 ? "" : "s"}`}</span>{g.unread > 0 && <span className="shrink-0 rounded-full bg-[var(--uni)] px-1.5 text-[11px] font-bold text-white">{g.unread > 99 ? "99+" : g.unread}</span>}</div>
            </div>
          </button>
        ))}</div>}
      <Sheet open={creating} onClose={() => setCreating(false)} title="New group">
        <div className="space-y-3">
          <TextField value={name} onChange={setName} placeholder="Group name, e.g. CSC 300 Level, UNILAG" />
          <TextField value={about} onChange={setAbout} placeholder="What's it for? (optional)" />
          <Btn disabled={name.trim().length < 2} onClick={() => void create()}>Create group</Btn>
        </div>
      </Sheet>
    </div>
  );
}

/** A group conversation, like a WhatsApp group. */
export function GroupThread({ id, onBack }: { id: string; onBack: () => void }) {
  const { flash, setOverlay, findPeople } = useApp();
  const [msgs, setMsgs] = useState<GroupMsg[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [draft, setDraft] = useState("");
  const [info, setInfo] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [q, setQ] = useState(""); const [found, setFound] = useState<Person[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const [m, gs] = await Promise.all([groupMessages(id), myGroups()]);
    setMsgs(m); setGroup(gs.find((g) => g.id === id) ?? null);
  }, [id]);
  useEffect(() => { void Promise.resolve().then(load); const t = setInterval(whileVisible(() => void load()), 4000); return () => clearInterval(t); }, [load]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);
  useEffect(() => { if (info) void groupMembers(id).then(setMembers); }, [info, id]);
  useEffect(() => { if (q.trim().length < 2) return; const t = setTimeout(() => void findPeople(q).then(setFound), 300); return () => clearTimeout(t); }, [q, findPeople]);
  const isAdmin = group?.role === "owner" || group?.role === "admin";

  async function send() {
    const body = draft.trim(); if (!body) return;
    setDraft("");
    const err = await sendGroupMessage(id, body);
    if (err) { flash(err); setDraft(body); return; }
    void load();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] px-4 pb-2.5 pt-1">
        <button onClick={onBack} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--paper-dim)]"><ArrowLeft size={17} /></button>
        <button onClick={() => setInfo(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <Avatar initials={initials(group?.name ?? "G")} color={colorOf(group?.name ?? "G")} size={36} />
          <div className="min-w-0"><div className="truncate text-[14.5px] font-bold leading-tight">{group?.name ?? "Group"}</div><div className="truncate text-[11.5px] text-[var(--dim)]">{group ? `${group.members} members · tap for info` : ""}</div></div>
        </button>
        {group?.invite_code && <button onClick={() => void shareInvite(group.name, group.invite_code!, flash)} aria-label="Invite people" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--paper-dim)] text-[var(--dim)]"><UserPlus size={16} /></button>}
      </div>
      <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#F0E9F6] px-4 py-3">
        {msgs.length === 0 && <div className="pt-16 text-center text-[13px] text-[var(--dim)]">Say hi to the group.</div>}
        {msgs.map((m, i) => m.system ? (
          <div key={m.id} className="mx-auto w-fit rounded-full bg-[#ddd2e8] px-3 py-1 text-[11.5px] text-[#5b4b70]">{m.body}</div>
        ) : (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : ""}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[14px] leading-snug shadow-sm ${m.mine ? "rounded-tr-md bg-[#EBD3F5]" : "rounded-tl-md bg-white"}`}>
              {!m.mine && msgs[i - 1]?.sender_id !== m.sender_id && <button onClick={() => m.sender_id && setOverlay({ t: "profile", id: m.sender_id })} className="mb-0.5 block text-[12px] font-bold" style={{ color: m.color }}>{m.name}</button>}
              <Linkified text={m.body} />
              <div className="mt-0.5 text-right text-[10px] text-[#8a7fa0]">{clock(m.created_at)}</div>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="flex items-center gap-2 bg-[var(--paper)] px-4 pb-4 pt-2.5">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void send()} placeholder="Message the group" className="min-w-0 flex-1 rounded-full bg-[var(--paper-dim)] px-4 py-3 text-[14px] outline-none" />
        <button onClick={() => void send()} disabled={!draft.trim()} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--uni)] text-white active:scale-90 disabled:opacity-40"><Send size={17} /></button>
      </div>

      <Sheet open={info} onClose={() => setInfo(false)} title={group?.name ?? "Group"}>
        {group && (
          <div className="space-y-3">
            {group.about && <p className="text-[13.5px] text-[var(--dim)]">{group.about}</p>}
            {group.invite_code && (
              <div className="rounded-2xl bg-[var(--paper-dim)] p-3">
                <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--dim)]">Invite link</div>
                <div className="mt-1 truncate text-[13px] font-semibold">{groupLink(group.invite_code)}</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => void shareInvite(group.name, group.invite_code!, flash)} className="flex items-center gap-1.5 rounded-xl bg-[var(--ink)] px-3 py-2 text-[12.5px] font-semibold text-[var(--paper)]"><Link2 size={14} /> Share link</button>
                  <button onClick={async () => { const r = await groupUpdate(id, { newLink: true }); if (r.code) { flash("New link made. The old one stops working."); void load(); } }} className="rounded-xl bg-white px-3 py-2 text-[12.5px] font-semibold">Reset link</button>
                </div>
              </div>
            )}
            {isAdmin && (
              <div>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add someone by username" className="w-full rounded-xl bg-[var(--paper-dim)] px-3 py-2.5 text-[13.5px] outline-none" />
                {q.trim().length >= 2 && found.slice(0, 5).map((p) => (
                  <button key={p.id} onClick={async () => { const err = await groupAdd(id, p.id); flash(err ? "Couldn't add them" : `${p.name.split(" ")[0]} added`); setQ(""); void groupMembers(id).then(setMembers); void load(); }} className="mt-1.5 flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-[13.5px] active:bg-[var(--paper-dim)]"><Avatar initials={initials(p.name)} color={p.color} size={28} /><span className="min-w-0 flex-1 truncate">{p.name} <span className="text-[var(--dim)]">@{p.handle}</span></span><UserPlus size={14} /></button>
                ))}
              </div>
            )}
            <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--dim)]">{members.length} members</div>
            <div className="max-h-[30vh] space-y-1 overflow-y-auto">{members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-2.5 py-1">
                <Avatar initials={initials(m.name)} color={m.color} size={30} />
                <span className="min-w-0 flex-1 truncate text-[13.5px]">{m.name}{m.handle ? <span className="text-[var(--dim)]"> @{m.handle}</span> : null}</span>
                {m.role !== "member" ? <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--uni)]"><Shield size={11} /> {m.role}</span>
                  : isAdmin && (<span className="flex gap-2 text-[11.5px] font-semibold"><button onClick={async () => { await groupUpdate(id, { admin: m.user_id }); void groupMembers(id).then(setMembers); }} className="text-[var(--dim)]">Make admin</button><button onClick={async () => { await groupLeave(id, m.user_id); void groupMembers(id).then(setMembers); void load(); }} className="text-[var(--help)]">Remove</button></span>)}
              </div>
            ))}</div>
            <button onClick={async () => { await groupUpdate(id, { muted: !group.muted }); flash(group.muted ? "Notifications on" : "Muted"); void load(); }} className="flex w-full items-center gap-2 rounded-xl bg-[var(--paper-dim)] px-3 py-2.5 text-[13.5px] font-semibold"><BellOff size={15} /> {group.muted ? "Unmute notifications" : "Mute notifications"}</button>
            {group.role !== "owner" && <button onClick={async () => { if (!confirm("Leave this group?")) return; await groupLeave(id); setInfo(false); onBack(); flash("You left the group"); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-[var(--help)]"><LogOut size={15} /> Leave group</button>}
          </div>
        )}
      </Sheet>
    </div>
  );
}

/** Opening a group invite link: show what it is and let them join. */
export function JoinGroupSheet({ code, onDone }: { code: string; onDone: () => void }) {
  const { setOverlay, flash } = useApp();
  const [g, setG] = useState<{ id: string; name: string; about: string | null; members: number; joined: boolean } | null | undefined>(undefined);
  useEffect(() => { void groupPreview(code).then(setG); }, [code]);
  return (
    <Sheet open onClose={onDone} title="Group invite">
      {g === undefined ? <p className="py-4 text-center text-[13px] text-[var(--dim)]">Loading...</p> : g === null ? <p className="text-[13.5px] text-[var(--dim)]">This invite link doesn&apos;t work anymore. Ask for a new one.</p> : (
        <div className="space-y-3 text-center">
          <div className="mx-auto w-fit"><Avatar initials={initials(g.name)} color={colorOf(g.name)} size={64} /></div>
          <div><div className="disp text-[19px] font-bold">{g.name}</div><div className="text-[12.5px] text-[var(--dim)]">{g.members} member{g.members === 1 ? "" : "s"}</div></div>
          {g.about && <p className="text-[13.5px] text-[var(--dim)]">{g.about}</p>}
          <Btn onClick={async () => { if (g.joined) { onDone(); setOverlay({ t: "group", id: g.id }); return; } const r = await joinGroup(code); if (r.error || !r.id) { flash("Couldn't join"); return; } onDone(); setOverlay({ t: "group", id: r.id }); }}>{g.joined ? "Open the group" : "Join group"}</Btn>
        </div>
      )}
    </Sheet>
  );
}
