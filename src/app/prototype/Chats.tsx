"use client";

// The Chats tab, laid out like WeChat's: title with search and ⊕, rows with square avatars (groups get
// the 3x3 member grid), red badges on the avatar, the time top-right and a muted bell. Birdie AI and
// Unisupport Help are pinned on top. Courses sit in their own folder, like WeChat's Subscriptions.
import { useHelpData } from "./live/helpData";
import { navBack, useBackLayer } from "./nav";
import { friendRequests, friendRespond, groupDisband, syncCourseChats, type FriendRequest } from "./live/chatData";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, BellOff, Hash, Megaphone, Plus, ScanLine, Search, UserPlus, Users } from "lucide-react";
import { openRepDesk } from "./RepDesk";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ChatRoom from "./ChatRoom";
import CourseFolder from "./CourseFolder";
import { OAChat, OALogo, OAPostView, OAProfileView, VerifiedDirectory } from "./Official";
import { whileVisible } from "./perf";
import { createGroup, joinGroup } from "./live/groupData";
import { dmSet, listTime, myCourseChats, myDms, myGroups, myOfficials, oaSet, searchAll, type CourseChat, type DmRow, type GroupRow, type OARow } from "./live/chatData";
import { useApp, type ChatView, type Person } from "./store";
import { Sheet } from "./ui";
import { Badge, CoursesFolderIcon, GridAvatar, SqAvatar, WeHeader } from "./we";

const Birdie = dynamic(() => import("./Birdie"), { ssr: false });
const Help = dynamic(() => import("./Help"), { ssr: false });
const OfficialManage = dynamic(() => import("./OfficialManage"), { ssr: false });

type Row = { key: string; view: ChatView; name: string; last: string; at: string; unread: number; muted: boolean; pinned: boolean; avatar: ReactNode; tick?: boolean; dot?: boolean;
  menu?: { kind: "dm" | "group" | "oa"; id: string; owner?: boolean; course?: boolean }; onOpen?: () => void };

export default function Chats({ active }: { active: boolean }) {
  const { chatView, setChatView, auth, setAuthOpen, setChatBadge, chats: birdieChats, courses, goStudy, flash } = useApp();
  const signedIn = auth.status === "in";
  const [dms, setDms] = useState<DmRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [oas, setOas] = useState<OARow[]>([]);
  const [courseChats, setCourseChats] = useState<CourseChat[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Writers the Unisupport desk handed you to: each is its own chat, like any other.
  const { sessions } = useHelpData(null, signedIn);
  const helpLast = sessions.find((x) => x.writers) ? `Your writer${sessions.filter((x) => x.writers).length > 1 ? "s" : ""}: ${sessions.filter((x) => x.writers).map((x) => x.writers!.display_name).join(", ")}` : "Tell us what you need. We'll get it done.";
  const [seenBirdie, setSeenBirdie] = useState(false);
  const [seenHelp, setSeenHelp] = useState(false);
  if (chatView?.k === "birdie" && !seenBirdie) setSeenBirdie(true);
  if (chatView?.k === "help" && !seenHelp) setSeenHelp(true);

  const load = useCallback(async () => {
    if (!signedIn) return;
    const [d, g, o, c, fr] = await Promise.all([myDms(), myGroups(), myOfficials(), myCourseChats(), friendRequests()]);
    setDms(d); setGroups(g); setOas(o); setCourseChats(c); setRequests(fr); setLoaded(true);
  }, [signedIn]);
  useEffect(() => {
    void Promise.resolve().then(load);
    const t = setInterval(whileVisible(() => void load()), active && !chatView ? 8000 : 25000);
    return () => clearInterval(t);
  }, [load, active, chatView]);
  useEffect(() => { if (!chatView) void Promise.resolve().then(load); }, [chatView, load]);
  // Each of your courses has a course chat (made on the server the first time it's seen).
  const courseList = useMemo(() => courses.map((c) => ({ key: c.id, code: c.code, name: c.name, shared: c.sharedId ?? null })), [courses]);
  const courseSig = JSON.stringify(courseList);
  useEffect(() => {
    if (!signedIn || !courseList.length) return;
    const t = setTimeout(() => void syncCourseChats(courseList).then(() => load()), 1200);
    return () => clearTimeout(t);
  }, [signedIn, courseSig]); // eslint-disable-line react-hooks/exhaustive-deps
  // A course you deleted keeps its chat on the server, but it leaves your Courses folder.
  const liveCourseChats = useMemo(() => courseChats.filter((c) => !c.course_key || !c.mine || courses.some((x) => x.id === c.course_key)), [courseChats, courses]);

  const courseUnread = liveCourseChats.filter((c) => !c.muted).reduce((a, c) => a + c.unread, 0);
  const rows: Row[] = useMemo(() => {
    const r: Row[] = [
      ...dms.map((d) => ({ key: "dm" + d.id, view: { k: "dm", id: d.id } as ChatView, name: d.other.name, last: d.last, at: d.last_at, unread: d.unread, muted: d.muted, pinned: d.pinned,
        avatar: <SqAvatar name={d.other.name} color={d.other.color} size={48} />, menu: { kind: "dm" as const, id: d.id } })),
      ...groups.filter((g) => !g.is_course).map((g) => ({ key: "g" + g.id, view: { k: "group", id: g.id } as ChatView, name: g.remark || g.name,
        last: (g.muted && g.unread > 1 ? `[${g.unread} message(s)] ` : "") + (g.last ?? ""), at: g.last_at ?? "", unread: g.unread, muted: g.muted, pinned: g.pinned,
        avatar: <GridAvatar avatars={g.avatars} size={48} />, menu: { kind: "group" as const, id: g.id, owner: g.role === "owner", course: g.is_course } })),
      ...oas.map((o) => ({ key: "oa" + o.id, view: { k: "oa", id: o.id } as ChatView, name: o.name, last: o.last ?? o.about ?? "", at: o.last_at, unread: o.unread, muted: o.muted, pinned: o.pinned,
        avatar: <OALogo a={o} size={48} />, tick: true, menu: { kind: "oa" as const, id: o.id } })),
    ];
    return r.sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.at || "").localeCompare(a.at || ""));
  }, [dms, groups, oas]);
  // Courses sits pinned under Birdie AI and Unisupport Help, like WeChat's Subscriptions folder.
  const courseRow: Row | null = liveCourseChats.length ? (() => {
    const c = liveCourseChats[0];
    return { key: "courses", view: { k: "courses" }, name: "Courses", last: `${courseUnread > 1 ? `[${courseUnread} message(s)] ` : ""}${c.code}: ${c.last ?? c.notice?.body ?? "Course chat"}`, at: c.last_at, unread: 0, dot: courseUnread > 0, muted: false, pinned: true, avatar: <CoursesFolderIcon size={48} /> };
  })() : null;
  const total = rows.filter((r) => !r.muted).reduce((a, r) => a + r.unread, 0) + courseUnread;
  useEffect(() => { setChatBadge(total); }, [total, setChatBadge]);

  const go = (v: ChatView) => setChatView(v);
  const back = navBack;
  function openCourse(sharedOrKey: string) {
    const cc = liveCourseChats.find((c) => c.shared_id === sharedOrKey);
    const local = courses.find((c) => c.id === sharedOrKey || c.sharedId === sharedOrKey || (cc?.course_id && (c.sourceCourseId === cc.course_id || c.id === cc.course_id)));
    if (!local) return flash("Open this course from Courses");
    goStudy({ courseId: local.id, tab: "board" });
  }
  const view = chatView;
  const birdieLast = useMemo(() => { const all = Object.values(birdieChats).flat(); const m = all.sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0]; return m ? m.text.replace(/[#*_`$\\]/g, "").slice(0, 80) : "Ask me anything, or about any of your courses"; }, [birdieChats]);

  return (
    <div className="relative flex h-full flex-col bg-[var(--we-bg)]">
      {seenBirdie && <div className="absolute inset-0 z-40 flex-col bg-[var(--paper)]" style={{ display: view?.k === "birdie" ? "flex" : "none" }}><Birdie active={active && view?.k === "birdie"} onBack={back} /></div>}
      {seenHelp && <div className="absolute inset-0 z-40 flex-col bg-[var(--paper)]" style={{ display: view?.k === "help" ? "flex" : "none" }}><Help active={active && view?.k === "help"} onBack={back} /></div>}
      {view && view.k !== "birdie" && view.k !== "help" && (
        <div className="absolute inset-0 z-40 flex flex-col bg-[var(--we-bg)]">
          {view.k === "dm" && <ChatRoom key={`dm${view.id}`} scope="dm" id={view.id} onBack={back} />}
          {view.k === "group" && <ChatRoom key={`g${view.id}`} scope="group" id={view.id} onBack={back} onOpenCourse={openCourse} />}
          {view.k === "oa" && <OAChat key={view.id} id={view.id} onBack={back} onProfile={(key) => go({ k: "oaProfile", key })} onPost={(id) => go({ k: "post", id })} />}
          {view.k === "oaProfile" && <OAProfileView key={view.key} keyOrId={view.key} onBack={back} onChat={(id) => go({ k: "oa", id })} onPost={(id) => go({ k: "post", id })} onManage={(id) => go({ k: "manage", id })} />}
          {view.k === "post" && <OAPostView key={view.id} id={view.id} onBack={back} onProfile={(key) => go({ k: "oaProfile", key })} />}
          {view.k === "courses" && <CourseFolder rows={liveCourseChats} onBack={back} onOpen={(gid) => go({ k: "group", id: gid })} />}
          {view.k === "verified" && <VerifiedDirectory onBack={back} onProfile={(key) => go({ k: "oaProfile", key })} />}
          {view.k === "friends" && <NewFriends list={requests} onBack={back} onDone={() => void load()} />}
          {view.k === "manage" && <OfficialManage id={view.id} onBack={back} onPost={(id) => go({ k: "post", id })} />}
        </div>
      )}
      <ChatList rows={rows} courseRow={courseRow} requests={requests.length} helpLast={helpLast} loaded={loaded} signedIn={signedIn} birdieLast={birdieLast} open={go} onSignIn={() => setAuthOpen(true)} reload={load} />
    </div>
  );
}

function ChatList({ rows, courseRow, requests, helpLast, loaded, signedIn, birdieLast, open, onSignIn, reload }: {
  rows: Row[]; courseRow: Row | null; requests: number; helpLast: string; loaded: boolean; signedIn: boolean; birdieLast: string; open: (v: ChatView) => void; onSignIn: () => void; reload: () => void;
}) {
  const { flash, setTab, setDiscoverView, isRep } = useApp();
  const [menu, setMenu] = useState(false);
  const [searching, setSearching] = useState(false);
  useBackLayer(searching, () => setSearching(false));
  useBackLayer(menu, () => setMenu(false));
  const [sheet, setSheet] = useState<null | "add" | "group" | "join">(null);
  const [rowMenu, setRowMenu] = useState<Row | null>(null);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hold = (r: Row) => r.menu ? ({
    onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); setRowMenu(r); },
    onTouchStart: () => { press.current = setTimeout(() => setRowMenu(r), 500); },
    onTouchEnd: () => { if (press.current) clearTimeout(press.current); },
    onTouchMove: () => { if (press.current) clearTimeout(press.current); },
  }) : {};
  async function act(r: Row, what: "pin" | "mute" | "delete") {
    setRowMenu(null);
    const m = r.menu!;
    if (what === "delete") {
      if (m.kind === "dm") { if (!confirm(`Delete your chat with ${r.name}? It comes back if they message you.`)) return; await dmSet(m.id, { clear: true }); }
      else if (m.kind === "group" && m.owner) { if (!confirm(`Delete "${r.name}" for everyone in it?`)) return; const e = await groupDisband(m.id); if (e) return flash(e === "course_group" ? "Course chats can't be deleted" : "Couldn't delete the group"); flash("Group deleted"); }
      else if (m.kind === "group") { if (!confirm(`Leave and delete "${r.name}"?`)) return; const g = await import("./live/groupData"); const e = await g.groupLeave(m.id); if (e) return flash(e === "course_group" ? "Course chats stay while you're in the course" : e); flash("You left the group"); }
      reload(); return;
    }
    if (m.kind === "dm") await dmSet(m.id, what === "pin" ? { pinned: !r.pinned } : { muted: !r.muted });
    else if (m.kind === "oa") await oaSet(m.id, what === "pin" ? { pinned: !r.pinned } : { muted: !r.muted });
    else { const g = await import("./live/groupData"); const c = await import("./live/chatData"); if (what === "mute") await g.groupUpdate(m.id, { muted: !r.muted }); else await c.groupSetMe(m.id, { pinned: !r.pinned }); }
    reload();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative z-30 flex h-12 shrink-0 items-center justify-center bg-[var(--we-bg)]">
        <span className="text-[16.5px] font-semibold text-[var(--we-text)]">Birdie</span>
        <div className="absolute right-2 flex items-center text-[var(--we-text)]">
          <button onClick={() => setSearching(true)} aria-label="Search" className="flex h-10 w-10 items-center justify-center"><Search size={21} /></button>
          <button onClick={() => (signedIn ? setMenu((x) => !x) : onSignIn())} aria-label="New chat" className="flex h-10 w-10 items-center justify-center">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.6px] border-current"><Plus size={15} strokeWidth={2.2} /></span>
          </button>
        </div>
        <AnimatePresence>
          {menu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ transformOrigin: "top right" }}
                className="absolute right-3 top-12 z-30 w-[170px] rounded-[6px] bg-[var(--we-pop)] py-1 text-[15.5px] text-white shadow-2xl">
                <span className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 bg-[var(--we-pop)]" />
                {[
                  { label: "New Group", Icon: Users, run: () => setSheet("group") },
                  { label: "Add Contacts", Icon: UserPlus, run: () => setSheet("add") },
                  { label: "Scan", Icon: ScanLine, run: () => { setTab("explore"); setDiscoverView({ k: "scan" }); } },
                  { label: "Join a Group", Icon: Hash, run: () => setSheet("join") },
                  { label: "Verified Accounts", Icon: BadgeCheck, run: () => open({ k: "verified" }) },
                ].map(({ label, Icon, run }) => <button key={label} onClick={() => { setMenu(false); run(); }} className="relative flex w-full items-center gap-3.5 px-4 py-3 text-left active:bg-white/10"><Icon size={20} strokeWidth={1.7} />{label}</button>)}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[var(--we-cell)] pb-28">
        <ListRow pinned avatar={<span className="flex h-12 w-12 items-center justify-center rounded-[6px] bg-gradient-to-br from-[#C05BD6] to-[#8A2FA3] text-[21px] font-bold text-white">B</span>}
          name="Birdie AI" tick last={birdieLast} onClick={() => open({ k: "birdie" })} />
        {isRep && <ListRow pinned avatar={<span className="flex h-12 w-12 items-center justify-center rounded-[6px] bg-[#3D83F7] text-white"><Megaphone size={24} /></span>}
          name="Rep Desk" last="Tell Birdie, it tells your class" onClick={openRepDesk} />}
        <ListRow pinned avatar={<span className="flex h-12 w-12 items-center justify-center rounded-[6px] bg-[#1F1A2B] text-[18px] font-bold text-[#E6B3F2]">U</span>}
          name="Unisupport Help" tick last={helpLast} onClick={() => (signedIn ? open({ k: "help" }) : onSignIn())} />
        {requests > 0 && <ListRow pinned avatar={<span className="flex h-12 w-12 items-center justify-center rounded-[6px] bg-[#FA9D3B] text-white"><UserPlus size={26} /></span>}
          name="New Friends" last={`${requests} friend request${requests === 1 ? "" : "s"}`} unread={requests} onClick={() => open({ k: "friends" })} />}
        {courseRow && <ListRow pinned avatar={courseRow.avatar} name="Courses" last={courseRow.last} time={listTime(courseRow.at)} dot={courseRow.dot} onClick={() => open(courseRow.view)} />}
        {!signedIn ? (
          <div className="px-8 py-16 text-center">
            <p className="text-[14px] leading-relaxed text-[var(--we-sub)]">Sign in to chat with classmates, make groups, send money and giveaways, and follow your SUG and companies offering SIWES.</p>
            <button onClick={onSignIn} className="mt-4 rounded-[6px] bg-[var(--we-accent)] px-6 py-2.5 text-[15px] font-medium text-white">Sign In</button>
          </div>
        ) : loaded && rows.length === 0 && !courseRow ? (
          <p className="px-8 py-16 text-center text-[14px] leading-relaxed text-[var(--we-sub)]">No chats yet. Tap ⊕ to add classmates by their Birdie ID, start a group, or follow verified accounts.</p>
        ) : rows.map((r) => (
          <div key={r.key} {...hold(r)}>
            <ListRow avatar={r.avatar} name={r.name} tick={r.tick} last={r.last} time={listTime(r.at)} unread={r.muted ? 0 : r.unread} dot={r.dot || (r.muted && r.unread > 0)} muted={r.muted} pinned={r.pinned} onClick={() => (r.onOpen ? r.onOpen() : open(r.view))} />
          </div>
        ))}
      </div>

      <Sheet open={!!rowMenu} onClose={() => setRowMenu(null)}>
        {rowMenu && (
          <div className="overflow-hidden rounded-[8px] bg-[var(--we-cell)] text-center text-[16px] text-[var(--we-text)]">
            <button onClick={() => void act(rowMenu, "pin")} className="block w-full border-b border-[var(--we-sep)] py-3.5">{rowMenu.pinned ? "Unpin" : "Sticky on Top"}</button>
            <button onClick={() => void act(rowMenu, "mute")} className="block w-full border-b border-[var(--we-sep)] py-3.5">{rowMenu.muted ? "Unmute" : "Mute Notifications"}</button>
            {(rowMenu.menu?.kind === "dm" || (rowMenu.menu?.kind === "group" && !rowMenu.menu.course)) && <button onClick={() => void act(rowMenu, "delete")} className="block w-full py-3.5 text-[var(--we-red)]">{rowMenu.menu.kind === "group" ? (rowMenu.menu.owner ? "Delete Group" : "Delete and Leave") : "Delete"}</button>}
          </div>
        )}
      </Sheet>
      {searching && <GlobalSearch rows={rows} onClose={() => setSearching(false)} open={(v) => { setSearching(false); open(v); }} />}
      <AddContactsSheet open={sheet === "add"} onClose={() => setSheet(null)} />
      <NewGroupSheet open={sheet === "group"} onClose={() => setSheet(null)} onMade={(id) => { setSheet(null); open({ k: "group", id }); reload(); }} />
      <Sheet open={sheet === "join"} onClose={() => setSheet(null)} title="Join a Group"><JoinByCode onJoined={(id) => { setSheet(null); open({ k: "group", id }); reload(); }} onError={(m) => flash(m)} /></Sheet>
    </div>
  );
}

export const Head = ({ t }: { t: string }) => <div className="px-4 pb-1.5 pt-4 text-[13px] text-[var(--we-sub)]">{t}</div>;

export function ListRow({ avatar, name, tick, last, time, unread = 0, dot, muted, pinned, onClick }: { avatar: ReactNode; name: ReactNode; tick?: boolean; last: string; time?: string; unread?: number; dot?: boolean; muted?: boolean; pinned?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center pl-4 text-left active:bg-black/5 ${pinned ? "bg-[var(--we-pinned)]" : ""}`}>
      <span className="relative mr-3 shrink-0">{avatar}<Badge n={dot ? undefined : unread} dot={dot && !unread} /></span>
      <span className="flex h-[72px] min-w-0 flex-1 flex-col justify-center border-b border-[var(--we-sep)] pr-4">
        <span className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-1 text-[16.5px] text-[var(--we-text)]"><span className="truncate">{name}</span>{tick && <BadgeCheck size={14} className="shrink-0 fill-[#4C8DF6] text-white" />}</span><span className="shrink-0 text-[12px] text-[var(--we-hint)]">{time}</span></span>
        <span className="mt-1 flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--we-sub)]">{last}</span>{muted && <BellOff size={14} className="shrink-0 text-[var(--we-hint)]" />}</span>
      </span>
    </button>
  );
}

/** The magnifier in Chats: your chats, plus people, verified accounts and articles on Birdie. */
function GlobalSearch({ rows, onClose, open }: { rows: Row[]; onClose: () => void; open: (v: ChatView) => void }) {
  const { setOverlay } = useApp();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Awaited<ReturnType<typeof searchAll>>>({ people: [], accounts: [], articles: [] });
  useEffect(() => { const t = setTimeout(() => void searchAll(q).then(setRes), 300); return () => clearTimeout(t); }, [q]);
  const term = q.trim().toLowerCase();
  const chats = term ? rows.filter((r) => r.name.toLowerCase().includes(term)).slice(0, 8) : [];
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[var(--we-bg)]">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex flex-1 items-center gap-2 rounded-[6px] bg-[var(--we-cell)] px-3 py-2"><Search size={16} className="text-[var(--we-sub)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[15.5px] text-[var(--we-text)] outline-none" /></div>
        <button onClick={onClose} className="px-1 text-[15.5px] text-[var(--we-link)]">Cancel</button>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-10">
        {chats.length > 0 && <><Head t="Chats" /><div className="bg-[var(--we-cell)]">{chats.map((r) => <ListRow key={r.key} avatar={r.avatar} name={r.name} last={r.last} onClick={() => (r.onOpen ? r.onOpen() : open(r.view))} />)}</div></>}
        {res.people.length > 0 && <><Head t="People" /><div className="bg-[var(--we-cell)]">{res.people.map((p) => <ListRow key={p.id} avatar={<SqAvatar name={p.name} color={p.color} size={48} />} name={p.name} last={[p.handle && `Birdie ID: ${p.handle}`, p.school].filter(Boolean).join(" · ")} onClick={() => setOverlay({ t: "contact", id: p.id })} />)}</div></>}
        {res.accounts.length > 0 && <><Head t="Verified Accounts" /><div className="bg-[var(--we-cell)]">{res.accounts.map((a) => <ListRow key={a.id} avatar={<OALogo a={a} size={48} />} name={a.name} tick last={a.about ?? ""} onClick={() => open({ k: "oaProfile", key: a.handle })} />)}</div></>}
        {res.articles.length > 0 && <><Head t="Articles" /><div className="bg-[var(--we-cell)]">{res.articles.map((a) => <ListRow key={a.id} avatar={<OALogo a={a.account} size={48} />} name={a.title} last={a.account.name} onClick={() => open({ k: "post", id: a.id })} />)}</div></>}
        {term.length >= 2 && !chats.length && !res.people.length && !res.accounts.length && !res.articles.length && <p className="py-16 text-center text-[14px] text-[var(--we-sub)]">No results</p>}
      </div>
    </div>
  );
}

function AddContactsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, findPeople, setOverlay, flash } = useApp();
  const [q, setQ] = useState(""); const [found, setFound] = useState<Person[]>([]);
  const term = q.trim().replace(/^@/, "");
  useEffect(() => { if (term.length < 2) return; const t = setTimeout(() => void findPeople(term).then(setFound), 300); return () => clearTimeout(t); }, [term, findPeople]);
  return (
    <Sheet open={open} onClose={onClose} title="Add Contacts">
      <div className="mb-3 flex items-center gap-2 rounded-[6px] bg-[var(--we-bg)] px-3 py-2.5"><Search size={16} className="text-[var(--we-sub)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} autoCapitalize="none" placeholder="Birdie ID or name" className="min-w-0 flex-1 bg-transparent text-[15.5px] outline-none" /></div>
      <button onClick={() => { if (profile.handle) { void navigator.clipboard?.writeText(profile.handle); flash("Birdie ID copied"); } }} className="mb-3 w-full text-center text-[13.5px] text-[var(--we-sub)]">My Birdie ID: <span className="text-[var(--we-text)]">{profile.handle || "setting up..."}</span> (tap to copy)</button>
      <div className="max-h-[42vh] overflow-y-auto">
        {term.length >= 2 && found.length === 0 && <p className="py-4 text-center text-[13.5px] text-[var(--we-sub)]">This user doesn&apos;t exist. Check the Birdie ID.</p>}
        {term.length >= 2 && found.map((p) => (
          <button key={p.id} onClick={() => { onClose(); setOverlay({ t: "contact", id: p.id }); }} className="flex w-full items-center gap-3 py-2 text-left"><SqAvatar name={p.name} color={p.color} size={44} /><span className="min-w-0 flex-1"><span className="block truncate text-[16px]">{p.name}</span><span className="block truncate text-[12.5px] text-[var(--we-sub)]">Birdie ID: {p.handle}{p.field ? ` · ${p.field}` : ""}</span></span></button>
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
    setName(""); setAbout(""); onMade(r.id);
  }
  const field = "w-full rounded-[6px] bg-[var(--we-bg)] px-3.5 py-3 text-[15.5px] outline-none";
  return (
    <Sheet open={open} onClose={onClose} title="New Group">
      <div className="space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name, e.g. CSC 400 Level FUL" className={field} />
        <input value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Group notice (optional)" className={field} />
        <button disabled={name.trim().length < 2} onClick={() => void create()} className="w-full rounded-[6px] bg-[var(--we-accent)] py-3 text-[16px] font-medium text-white disabled:opacity-40">Create</button>
        <p className="text-center text-[12.5px] text-[var(--we-sub)]">Add people from ··· in the group, or share its QR code.</p>
      </div>
    </Sheet>
  );
}

function JoinByCode({ onJoined, onError }: { onJoined: (id: string) => void; onError: (m: string) => void }) {
  const [code, setCode] = useState("");
  return (
    <div className="space-y-3">
      <input value={code} onChange={(e) => setCode(e.target.value.trim().replace(/^.*\/g\//, ""))} placeholder="Paste the invite link or code" className="w-full rounded-[6px] bg-[var(--we-bg)] px-3.5 py-3 text-[15.5px] outline-none" />
      <button disabled={code.length < 4} onClick={async () => { const r = await joinGroup(code); if (r.error || !r.id) onError("That code doesn't work. Ask for a new link."); else onJoined(r.id); }} className="w-full rounded-[6px] bg-[var(--we-accent)] py-3 text-[16px] font-medium text-white disabled:opacity-40">Join</button>
    </div>
  );
}

/** Friend requests waiting for you: accept to see each other's Moments. */
function NewFriends({ list, onBack, onDone }: { list: FriendRequest[]; onBack: () => void; onDone: () => void }) {
  const { setOverlay, flash } = useApp();
  const [done, setDone] = useState<Record<string, "accepted" | "ignored">>({});
  async function respond(id: string, accept: boolean) {
    const r = await friendRespond(id, accept);
    if (r.error) return flash("Couldn't do that");
    setDone((d) => ({ ...d, [id]: accept ? "accepted" : "ignored" })); onDone();
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="New Friends" />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[var(--we-cell)]">
        {list.length === 0 ? <p className="py-16 text-center text-[14px] text-[var(--we-sub)]">No friend requests</p> : list.map((r) => (
          <div key={r.user.id} className="flex items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3">
            <SqAvatar name={r.user.name} color={r.user.color} size={46} onClick={() => setOverlay({ t: "contact", id: r.user.id })} />
            <button onClick={() => setOverlay({ t: "contact", id: r.user.id })} className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[16px] text-[var(--we-text)]">{r.user.name}</span>
              <span className="block truncate text-[13px] text-[var(--we-sub)]">{r.group ? `From the group ${r.group}` : r.school ?? "Wants to add you as a friend"}</span>
            </button>
            {done[r.user.id] ? <span className="text-[14px] text-[var(--we-sub)]">{done[r.user.id] === "accepted" ? "Added" : "Ignored"}</span> : <>
              <button onClick={() => void respond(r.user.id, false)} className="text-[14px] text-[var(--we-sub)]">Ignore</button>
              <button onClick={() => void respond(r.user.id, true)} className="rounded-[4px] bg-[var(--we-accent)] px-3 py-1.5 text-[14px] font-medium text-white">Accept</button>
            </>}
          </div>
        ))}
      </div>
    </div>
  );
}
