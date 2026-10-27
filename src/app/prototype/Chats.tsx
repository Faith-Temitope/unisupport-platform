"use client";

// The Chats tab, WeChat style. Pinned on top: Birdie AI and Unisupport Help. Then the Courses folder,
// then everyone else (one-to-one chats, groups and verified accounts), newest first.
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, BellOff, BookOpen, Hash, LifeBuoy, MessageCirclePlus, Pin, Plus, Search, UserPlus, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatRoom from "./ChatRoom";
import CourseFolder from "./CourseFolder";
import { OAChat, OALogo, OAPostView, OAProfileView, Tick, VerifiedDirectory } from "./Official";
import { whileVisible } from "./perf";
import { initials } from "./PostCard";
import { createGroup, joinGroup } from "./live/groupData";
import { dmSet, listTime, myCourseFeed, myDms, myGroups, myOfficials, oaSet, type CourseFeedRow, type DmRow, type GroupRow, type OARow } from "./live/chatData";
import { useApp, type ChatView, type Person } from "./store";
import { Avatar, Btn, Empty, Sheet, TextField } from "./ui";

const Birdie = dynamic(() => import("./Birdie"), { ssr: false });
const Help = dynamic(() => import("./Help"), { ssr: false });
const OfficialManage = dynamic(() => import("./OfficialManage"), { ssr: false });

type Row =
  | { k: "dm"; id: string; name: string; color: string; last: string; at: string; unread: number; muted: boolean; pinned: boolean; dm: DmRow }
  | { k: "group"; id: string; name: string; color: string; last: string; at: string; unread: number; muted: boolean; pinned: boolean; g: GroupRow }
  | { k: "oa"; id: string; name: string; color: string; last: string; at: string; unread: number; muted: boolean; pinned: boolean; oa: OARow };

const GROUP_COLORS = ["#7C4DDB", "#1B8A85", "#D9467E", "#E2553F", "#4C6EF5", "#A63FBD"];
const colorOf = (s: string) => GROUP_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % GROUP_COLORS.length];

export default function Chats({ active }: { active: boolean }) {
  const { chatView, setChatView, auth, setAuthOpen, setChatBadge, chats: birdieChats } = useApp();
  const signedIn = auth.status === "in";
  const [dms, setDms] = useState<DmRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [oas, setOas] = useState<OARow[]>([]);
  const [feed, setFeed] = useState<CourseFeedRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const history = useRef<ChatView[]>([]);
  // Birdie and Help stay mounted once opened, so they keep their place.
  const [seenBirdie, setSeenBirdie] = useState(false);
  const [seenHelp, setSeenHelp] = useState(false);
  if (chatView?.k === "birdie" && !seenBirdie) setSeenBirdie(true);
  if (chatView?.k === "help" && !seenHelp) setSeenHelp(true);

  const load = useCallback(async () => {
    if (!signedIn) return;
    const [d, g, o, f] = await Promise.all([myDms(), myGroups(), myOfficials(), myCourseFeed()]);
    setDms(d); setGroups(g); setOas(o); setFeed(f); setLoaded(true);
  }, [signedIn]);
  useEffect(() => {
    void Promise.resolve().then(load);
    const t = setInterval(whileVisible(() => void load()), active && !chatView ? 8000 : 25000);
    return () => clearInterval(t);
  }, [load, active, chatView]);
  // back from a chat: refresh so unread counts and previews are current
  useEffect(() => { if (!chatView) void Promise.resolve().then(load); }, [chatView, load]);

  const rows: Row[] = useMemo(() => {
    const r: Row[] = [
      ...dms.map((d) => ({ k: "dm" as const, id: d.id, name: d.other.name, color: d.other.color, last: d.last, at: d.last_at, unread: d.unread, muted: d.muted, pinned: d.pinned, dm: d })),
      ...groups.map((g) => ({ k: "group" as const, id: g.id, name: g.name, color: colorOf(g.name), last: g.last ?? `${g.members} members`, at: g.last_at ?? "", unread: g.unread, muted: g.muted, pinned: false, g })),
      ...oas.map((o) => ({ k: "oa" as const, id: o.id, name: o.name, color: o.color, last: o.last ?? o.about ?? "", at: o.last_at, unread: o.unread, muted: o.muted, pinned: o.pinned, oa: o })),
    ];
    return r.sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.at || "").localeCompare(a.at || ""));
  }, [dms, groups, oas]);
  const courseUnread = feed.reduce((a, f) => a + f.unread, 0);
  const total = rows.filter((r) => !r.muted).reduce((a, r) => a + r.unread, 0) + courseUnread;
  useEffect(() => { setChatBadge(total); }, [total, setChatBadge]);

  const go = (v: ChatView) => { history.current.push(chatView); setChatView(v); };
  const back = () => { const prev = history.current.pop(); setChatView(prev ?? null); };
  const view = chatView;
  const birdieLast = useMemo(() => { const all = Object.values(birdieChats).flat(); const m = all.sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0]; return m ? m.text.replace(/[#*_`]/g, "").slice(0, 80) : "Ask anything, or about any of your courses"; }, [birdieChats]);

  return (
    <div className="relative flex h-full flex-col">
      {/* Birdie and Help keep their place while you move around, like real chats. */}
      {seenBirdie && <div className="absolute inset-0 z-10 flex-col bg-[var(--paper)]" style={{ display: view?.k === "birdie" ? "flex" : "none" }}><Birdie active={active && view?.k === "birdie"} onBack={back} /></div>}
      {seenHelp && <div className="absolute inset-0 z-10 flex-col bg-[var(--paper)]" style={{ display: view?.k === "help" ? "flex" : "none" }}><Help active={active && view?.k === "help"} onBack={back} /></div>}
      {view && view.k !== "birdie" && view.k !== "help" && (
        <div className="absolute inset-0 z-10 flex flex-col bg-[var(--paper)]">
          {view.k === "dm" && <ChatRoom key={`dm${view.id}`} scope="dm" id={view.id} onBack={back} />}
          {view.k === "group" && <ChatRoom key={`g${view.id}`} scope="group" id={view.id} onBack={back} />}
          {view.k === "oa" && <OAChat key={view.id} id={view.id} onBack={back} onProfile={(key) => go({ k: "oaProfile", key })} onPost={(id) => go({ k: "post", id })} />}
          {view.k === "oaProfile" && <OAProfileView key={view.key} keyOrId={view.key} onBack={back} onChat={(id) => go({ k: "oa", id })} onPost={(id) => go({ k: "post", id })} onManage={(id) => go({ k: "manage", id })} />}
          {view.k === "post" && <OAPostView key={view.id} id={view.id} onBack={back} onProfile={(key) => go({ k: "oaProfile", key })} />}
          {view.k === "courses" && <CourseFolder onBack={back} />}
          {view.k === "verified" && <VerifiedDirectory onBack={back} onProfile={(key) => go({ k: "oaProfile", key })} />}
          {view.k === "manage" && <OfficialManage id={view.id} onBack={back} onPost={(id) => go({ k: "post", id })} />}
        </div>
      )}
      <ChatList rows={rows} loaded={loaded} signedIn={signedIn} feed={feed} courseUnread={courseUnread} birdieLast={birdieLast}
        open={(v) => go(v)} onSignIn={() => setAuthOpen(true)} reload={load} />
    </div>
  );
}

function ChatList({ rows, loaded, signedIn, feed, courseUnread, birdieLast, open, onSignIn, reload }: {
  rows: Row[]; loaded: boolean; signedIn: boolean; feed: CourseFeedRow[]; courseUnread: number; birdieLast: string;
  open: (v: ChatView) => void; onSignIn: () => void; reload: () => void;
}) {
  const { flash } = useApp();
  const [q, setQ] = useState("");
  const [plus, setPlus] = useState(false);
  const [sheet, setSheet] = useState<null | "add" | "group" | "join">(null);
  const [menuFor, setMenuFor] = useState<Row | null>(null);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const term = q.trim().toLowerCase();
  const shown = term ? rows.filter((r) => r.name.toLowerCase().includes(term)) : rows;
  const latest = feed[0];
  const pinRow = (r: Row) => ({
    onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); setMenuFor(r); },
    onTouchStart: () => { press.current = setTimeout(() => setMenuFor(r), 500); },
    onTouchEnd: () => { if (press.current) clearTimeout(press.current); },
    onTouchMove: () => { if (press.current) clearTimeout(press.current); },
  });
  async function act(r: Row, what: "pin" | "mute" | "delete") {
    setMenuFor(null);
    if (r.k === "dm") await dmSet(r.id, what === "pin" ? { pinned: !r.pinned } : what === "mute" ? { muted: !r.muted } : { clear: true });
    else if (r.k === "oa") await oaSet(r.id, what === "pin" ? { pinned: !r.pinned } : { muted: !r.muted });
    else if (r.k === "group" && what === "mute") { const { groupUpdate } = await import("./live/groupData"); await groupUpdate(r.id, { muted: !r.muted }); }
    reload();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
        <h2 className="disp text-[24px] font-bold">Chats</h2>
        <button onClick={() => (signedIn ? setPlus((p) => !p) : onSignIn())} aria-label="New chat" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] active:scale-90"><Plus size={19} /></button>
        <AnimatePresence>
          {plus && (
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-4 top-14 z-30 w-52 overflow-hidden rounded-2xl bg-[var(--ink)] py-1 text-[14px] text-[var(--paper)] shadow-xl">
              {[
                { label: "New chat", Icon: MessageCirclePlus, run: () => setSheet("add") },
                { label: "New group", Icon: Users, run: () => setSheet("group") },
                { label: "Join with a code", Icon: Hash, run: () => setSheet("join") },
                { label: "Verified accounts", Icon: BadgeCheck, run: () => open({ k: "verified" }) },
              ].map(({ label, Icon, run }) => <button key={label} onClick={() => { setPlus(false); run(); }} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-white/10"><Icon size={17} />{label}</button>)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="px-4 pb-2"><div className="flex items-center gap-2 rounded-xl bg-[var(--paper-dim)] px-3.5 py-2.5"><Search size={15} className="text-[var(--dim)]" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" /></div></div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-28" onClick={() => setPlus(false)}>
        {!term && (
          <>
            <ListRow pinned avatar={<span className="disp flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#C05BD6] to-[#8A2FA3] text-[21px] font-bold text-white">B</span>}
              name={<span className="flex items-center gap-1">Birdie AI<Tick /></span>} last={birdieLast} onClick={() => open({ k: "birdie" })} />
            <ListRow pinned avatar={<span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ink)] text-[#E6B3F2]"><LifeBuoy size={22} /></span>}
              name={<span className="flex items-center gap-1">Unisupport Help<Tick /></span>} last="Writers, tutorials, printing, internships" onClick={() => (signedIn ? open({ k: "help" }) : onSignIn())} />
            {signedIn && (
              <ListRow avatar={<span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--study)] text-white"><BookOpen size={21} /></span>}
                name="Courses" last={latest ? `${latest.code}: ${latest.post?.body ?? latest.chat?.body ?? "Shared course"}` : "Notices and chat from your courses"}
                time={latest ? listTime(latest.last_at) : ""} dot={courseUnread > 0} onClick={() => open({ k: "courses" })} />
            )}
          </>
        )}
        {!signedIn ? (
          <div className="px-5 pt-6"><Empty icon={<UserPlus size={20} />} title="Chat with classmates" text="Sign in to chat one-to-one, make groups, send money and giveaways, and follow your SUG and companies offering SIWES." action={<Btn onClick={onSignIn}>Sign in or create an account</Btn>} /></div>
        ) : loaded && rows.length === 0 && !term ? (
          <div className="px-5 pt-6"><Empty icon={<MessageCirclePlus size={20} />} title="No chats yet" text="Find classmates by their username, make a group for your class, or follow verified accounts like your SUG." action={<Btn variant="ink" onClick={() => setSheet("add")}>Start a chat</Btn>} /></div>
        ) : shown.map((r) => (
          <div key={`${r.k}${r.id}`} {...pinRow(r)}>
            <ListRow pinned={r.pinned}
              avatar={r.k === "oa" ? <OALogo a={r.oa} size={48} /> : r.k === "group" ? <span className="flex h-12 w-12 items-center justify-center rounded-xl text-[15px] font-bold text-white" style={{ background: r.color }}>{initials(r.name)}</span> : <Avatar initials={initials(r.name)} color={r.color} size={48} />}
              name={r.k === "oa" ? <span className="flex min-w-0 items-center gap-1"><span className="truncate">{r.name}</span><Tick /></span> : r.k === "group" ? `${r.name} (${r.g.members})` : r.name}
              last={r.last} time={listTime(r.at)} unread={r.muted ? 0 : r.unread} dot={r.muted && r.unread > 0} muted={r.muted}
              onClick={() => open(r.k === "dm" ? { k: "dm", id: r.id } : r.k === "group" ? { k: "group", id: r.id } : { k: "oa", id: r.id })} />
          </div>
        ))}
      </div>

      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.name}>
        {menuFor && (
          <div className="space-y-1.5">
            {menuFor.k !== "group" && <button onClick={() => void act(menuFor, "pin")} className="flex w-full items-center gap-2.5 rounded-xl bg-[var(--paper-dim)] px-3.5 py-3 text-[14px] font-semibold"><Pin size={16} /> {menuFor.pinned ? "Unpin" : "Sticky on top"}</button>}
            <button onClick={() => void act(menuFor, "mute")} className="flex w-full items-center gap-2.5 rounded-xl bg-[var(--paper-dim)] px-3.5 py-3 text-[14px] font-semibold"><BellOff size={16} /> {menuFor.muted ? "Unmute" : "Mute notifications"}</button>
            {menuFor.k === "dm" && <button onClick={() => void act(menuFor, "delete")} className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-3 text-[14px] font-semibold text-[var(--help)]">Delete chat</button>}
          </div>
        )}
      </Sheet>
      <NewChatSheet open={sheet === "add"} onClose={() => setSheet(null)} />
      <NewGroupSheet open={sheet === "group"} onClose={() => setSheet(null)} onMade={(id) => { setSheet(null); open({ k: "group", id }); reload(); }} />
      <Sheet open={sheet === "join"} onClose={() => setSheet(null)} title="Join a group"><JoinByCode onJoined={(id) => { setSheet(null); open({ k: "group", id }); reload(); }} onError={(m) => flash(m)} /></Sheet>
    </div>
  );
}

function ListRow({ avatar, name, last, time, unread = 0, dot, muted, pinned, onClick }: { avatar: React.ReactNode; name: React.ReactNode; last: string; time?: string; unread?: number; dot?: boolean; muted?: boolean; pinned?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-[var(--paper-dim)] ${pinned ? "bg-[var(--paper-dim)]/60" : ""}`}>
      <span className="relative shrink-0">{avatar}
        {unread > 0 && <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full border-2 border-[var(--paper)] bg-[#E5484D] px-1 text-center text-[10.5px] font-bold leading-[14px] text-white">{unread > 99 ? "99+" : unread}</span>}
        {dot && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[var(--paper)] bg-[#E5484D]" />}</span>
      <span className="min-w-0 flex-1 border-b border-[var(--line)] pb-2.5 pt-0.5">
        <span className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-[15.5px] font-semibold">{name}</span><span className="shrink-0 text-[11.5px] text-[var(--dim)]">{time}</span></span>
        <span className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-[13px] text-[var(--dim)]">{last}</span>{muted && <BellOff size={13} className="shrink-0 text-[var(--dim)]" />}</span>
      </span>
    </button>
  );
}

function NewChatSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, findPeople, openDm, flash, setOverlay } = useApp();
  const [q, setQ] = useState(""); const [found, setFound] = useState<Person[]>([]);
  const term = q.trim().replace(/^@/, "");
  useEffect(() => { if (term.length < 2) return; const t = setTimeout(() => void findPeople(term).then(setFound), 300); return () => clearTimeout(t); }, [term, findPeople]);
  const link = typeof window !== "undefined" && profile.handle ? `${window.location.origin}/u/${profile.handle}` : "";
  async function shareMe() {
    if (!link) return flash("Your username is being set up. Try again in a moment.");
    const text = `Chat with me on Birdie: @${profile.handle}`;
    try { if (navigator.share) await navigator.share({ title: "Birdie", text, url: link }); else { await navigator.clipboard.writeText(`${text} ${link}`); flash("Link copied"); } } catch { /* cancelled */ }
  }
  return (
    <Sheet open={open} onClose={onClose} title="New chat">
      <div className="mb-3 rounded-2xl bg-[var(--ink)] p-4 text-white">
        <div className="text-[11px] font-bold uppercase tracking-wider text-white/60">Your Birdie ID</div>
        <div className="disp mt-0.5 text-[24px] font-bold">{profile.handle ? `@${profile.handle}` : "Setting up..."}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => { if (profile.handle) { void navigator.clipboard?.writeText(`@${profile.handle}`); flash("Copied"); } }} className="rounded-xl bg-white/15 py-2.5 text-[13px] font-semibold">Copy ID</button>
          <button onClick={() => void shareMe()} className="rounded-xl bg-white py-2.5 text-[13px] font-semibold text-[#1a1024]">Share my link</button>
        </div>
      </div>
      <div className="mb-3 flex items-center gap-2 rounded-xl bg-[var(--paper-dim)] px-3.5 py-3"><Search size={16} className="text-[var(--dim)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} autoCapitalize="none" placeholder="Search a name or @username" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" /></div>
      <div className="max-h-[40vh] space-y-1 overflow-y-auto">
        {term.length >= 2 && found.length === 0 && <p className="text-[13px] text-[var(--dim)]">No one with that name or username yet. Send them your link.</p>}
        {term.length >= 2 && found.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl px-1 py-2">
            <button onClick={() => { onClose(); setOverlay({ t: "profile", id: p.id }); }}><Avatar initials={initials(p.name)} color={p.color} size={40} /></button>
            <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold">{p.name}</div><div className="truncate text-[12px] text-[var(--dim)]">@{p.handle}{p.field ? ` · ${p.field}` : ""}</div></div>
            <button onClick={() => { onClose(); void openDm(p.id); }} className="rounded-xl bg-[var(--uni)] px-3.5 py-2 text-[12.5px] font-semibold text-white active:scale-95">Chat</button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

function NewGroupSheet({ open, onClose, onMade }: { open: boolean; onClose: () => void; onMade: (id: string) => void }) {
  const { flash } = useApp();
  const [name, setName] = useState(""); const [about, setAbout] = useState("");
  async function create() {
    const r = await createGroup(name.trim(), about.trim());
    if (r.error || !r.id) return flash(r.error === "too_many" ? "You've made a lot of groups today" : "Couldn't create the group");
    setName(""); setAbout(""); flash("Group created. Share the invite link from ··· to bring people in.");
    onMade(r.id);
  }
  return (
    <Sheet open={open} onClose={onClose} title="New group">
      <div className="space-y-3">
        <TextField value={name} onChange={setName} placeholder="Group name, e.g. CSC 400 Level FUL" />
        <TextField value={about} onChange={setAbout} placeholder="Group notice (optional)" />
        <Btn disabled={name.trim().length < 2} onClick={() => void create()}>Create group</Btn>
      </div>
    </Sheet>
  );
}

function JoinByCode({ onJoined, onError }: { onJoined: (id: string) => void; onError: (m: string) => void }) {
  const [code, setCode] = useState("");
  return (
    <div className="space-y-3">
      <TextField value={code} onChange={(v) => setCode(v.trim().replace(/^.*\/g\//, ""))} placeholder="Paste the invite link or code" />
      <Btn disabled={code.length < 4} onClick={async () => { const r = await joinGroup(code); if (r.error || !r.id) onError("That code doesn't work. Ask for a new link."); else onJoined(r.id); }}>Join</Btn>
    </div>
  );
}
