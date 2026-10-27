"use client";

// WeChat's "Chat Info" (the ··· in a chat), full screen: members grid with + and −, group name, QR code,
// notice, manage, remark, search history, mute, sticky on top, my alias, on-screen names, background,
// clear history, report, leave. One-to-one chats get the shorter version.
import { Check, ImagePlus, Minus, Plus, QrCode, Search } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState, type ReactNode } from "react";
import { shrink } from "./ChatRoom";
import { reportThing } from "./live/socialData";
import { createGroup, groupAdd, groupLeave, groupLink, groupMembers, groupUpdate, type GroupMember } from "./live/groupData";
import { dmSet, groupSetMe, searchChat, type ChatPerson, type GroupRow, type Scope } from "./live/chatData";
import { useApp, type Person } from "./store";
import { Cell, CellGroup, SqAvatar, Switch, WeHeader } from "./we";

// ---- per-chat settings kept on this phone
const key = (k: string, scope: Scope | "g", id: string) => `birdie-${k}-${scope}-${id}`;
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const put = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* full */ } };
export const chatBackground = (scope: Scope, id: string) => (typeof window === "undefined" ? null : get(key("bg", scope, id)));
export const clearedAt = (id: string) => (typeof window === "undefined" ? null : get(key("cleared", "g", id)));
export const showNames = (id: string) => (typeof window === "undefined" ? true : get(key("names", "g", id)) !== "0");

const BACKGROUNDS = ["#EDEDED", "#DCEBDD", "#E6E0F3", "#F6E7D8", "#DCE8F4", "linear-gradient(160deg,#F3E7FA,#E1ECFA)", "linear-gradient(160deg,#FCE3E3,#FDF3D6)", "#1F1F1F"];

type Sub = null | "members" | "name" | "qr" | "notice" | "manage" | "remark" | "alias" | "search" | "background" | "add" | "remove";

export default function ChatInfo({ scope, id, other, dmState, group, onClose, onChanged, onCleared, onLeft, onOpenCourse, onOpenDm }: {
  scope: Scope; id: string; other: ChatPerson | null; dmState: { pinned: boolean; muted: boolean }; group: GroupRow | null;
  onClose: () => void; onChanged: () => void; onCleared: () => void; onLeft: () => void; onOpenCourse?: (sharedId: string) => void; onOpenDm: (userId: string) => void;
}) {
  const { flash, setOverlay, setChatView, profile } = useApp();
  const [sub, setSub] = useState<Sub>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [names, setNames] = useState(true);
  useEffect(() => { void Promise.resolve().then(() => setNames(showNames(id))); }, [id]);
  const loadMembers = () => { if (scope === "group") void groupMembers(id).then(setMembers); };
  useEffect(loadMembers, [scope, id]); // eslint-disable-line react-hooks/exhaustive-deps
  const isAdmin = group?.role === "owner" || group?.role === "admin";
  const course = !!group?.is_course;
  const back = () => setSub(null);

  async function clear() {
    if (!confirm("Clear the chat history? It's only cleared on your side.")) return;
    if (scope === "dm") await dmSet(id, { clear: true }); else put(key("cleared", "g", id), new Date().toISOString());
    onCleared(); flash("Chat history cleared");
  }
  async function report() {
    const reason = prompt(scope === "dm" ? `Why are you reporting ${other?.name}?` : `Why are you reporting "${group?.name}"?`);
    if (reason === null) return;
    const err = await reportThing(scope === "dm" ? "account" : "group", scope === "dm" ? other!.id : id, reason || undefined);
    flash(err ?? "Thanks. The Birdie team will look at it.");
  }
  async function leave() {
    if (!confirm("Leave this group? You won't get its messages anymore.")) return;
    const { error } = await groupLeaveSafe(id);
    if (error) return flash(error);
    flash("You left the group"); onLeft();
  }
  async function newGroupWith() {
    if (!other) return;
    const r = await createGroup(`${profile.name || "Me"}, ${other.name}`, "");
    if (r.error || !r.id) return flash("Couldn't create the group");
    await groupAdd(r.id, other.id);
    onClose(); setChatView({ k: "group", id: r.id });
  }

  if (sub) return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[var(--we-bg)]">
      {sub === "members" && <MembersView members={members} onBack={back} onOpen={(u) => setOverlay({ t: "contact", id: u })} />}
      {sub === "name" && <EditText title="Group Name" initial={group?.name ?? ""} max={80} onBack={back} onSave={async (v) => { const r = await groupUpdate(id, { name: v }); if (r.error) return flash("Only admins can change the name"); onChanged(); back(); }} />}
      {sub === "notice" && <EditText title="Group Notice" initial={group?.about ?? ""} max={300} multiline readOnly={!isAdmin} onBack={back} onSave={async (v) => { const r = await groupUpdate(id, { about: v }); if (r.error) return flash("Only admins can edit the notice"); onChanged(); back(); }} />}
      {sub === "remark" && <EditText title="Remark" hint="Only you can see this name for the group." initial={group?.remark ?? ""} max={40} onBack={back} onSave={async (v) => { await groupSetMe(id, { remark: v }); onChanged(); back(); }} />}
      {sub === "alias" && <EditText title="My Alias in Group" hint="Everyone in this group sees you by this name." initial={group?.alias ?? ""} max={30} onBack={back} onSave={async (v) => { await groupSetMe(id, { alias: v }); onChanged(); back(); }} />}
      {sub === "qr" && group && <GroupQr group={group} onBack={back} />}
      {sub === "manage" && group && <ManageGroup group={group} members={members} onBack={back} onChanged={() => { loadMembers(); onChanged(); }} />}
      {sub === "search" && <SearchHistory scope={scope} id={id} onBack={back} />}
      {sub === "background" && <BackgroundPicker scope={scope} id={id} onBack={back} onChanged={onChanged} />}
      {sub === "add" && <AddMembers id={id} existing={members.map((m) => m.user_id)} onBack={back} onAdded={() => { loadMembers(); onChanged(); }} />}
      {sub === "remove" && <RemoveMembers id={id} members={members.filter((m) => m.role === "member")} onBack={back} onDone={() => { loadMembers(); onChanged(); back(); }} />}
    </div>
  );

  const gridMembers = members.slice(0, isAdmin && !course ? 13 : 14);
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onClose} title={scope === "dm" ? "Chat Info" : `Chat Info(${group?.members ?? members.length})`} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-10">
        <div className="bg-[var(--we-cell)] px-4 pb-3 pt-4">
          <div className="grid grid-cols-5 gap-x-3 gap-y-3">
            {scope === "dm" && other && (
              <>
                <Tile label={other.name} onClick={() => setOverlay({ t: "contact", id: other.id })}><SqAvatar name={other.name} color={other.color} size={52} /></Tile>
                <Tile label="" onClick={() => void newGroupWith()}><AddTile><Plus size={24} /></AddTile></Tile>
              </>
            )}
            {scope === "group" && gridMembers.map((m) => (
              <Tile key={m.user_id} label={m.name} onClick={() => setOverlay({ t: "contact", id: m.user_id })}><SqAvatar name={m.name} color={m.color} size={52} /></Tile>
            ))}
            {scope === "group" && !course && <Tile label="" onClick={() => (isAdmin ? setSub("add") : group?.invite_code ? setSub("qr") : flash("Ask an admin to add people"))}><AddTile><Plus size={24} /></AddTile></Tile>}
            {scope === "group" && isAdmin && !course && <Tile label="" onClick={() => setSub("remove")}><AddTile><Minus size={24} /></AddTile></Tile>}
          </div>
          {scope === "group" && members.length > gridMembers.length && <button onClick={() => setSub("members")} className="mt-4 w-full text-center text-[15px] text-[var(--we-sub)]">View More Members &gt;</button>}
        </div>

        {scope === "group" && (
          <CellGroup>
            <Cell label="Group Name" value={group?.name} onClick={() => (isAdmin && !course ? setSub("name") : undefined)} chevron={isAdmin && !course} />
            {!course && <Cell label="Group QR Code" right={<QrCode size={18} className="text-[var(--we-sub)]" />} onClick={() => setSub("qr")} />}
            <Cell label="Group Notice" sub={group?.about ? <span className="line-clamp-3">{group.about}</span> : undefined} value={group?.about ? undefined : "Not set"} onClick={() => setSub("notice")} />
            {isAdmin && !course && <Cell label="Manage Group" onClick={() => setSub("manage")} />}
            <Cell label="Remark" value={group?.remark ?? ""} onClick={() => setSub("remark")} />
          </CellGroup>
        )}
        {course && group?.shared_id && onOpenCourse && <CellGroup><Cell label="Course" value="Open notes and files" onClick={() => onOpenCourse(group.shared_id!)} /></CellGroup>}
        <CellGroup><Cell label="Search Chat History" onClick={() => setSub("search")} /></CellGroup>
        <CellGroup>
          {scope === "dm"
            ? <><Cell label="Mute Notifications" right={<Switch on={dmState.muted} onChange={async (v) => { await dmSet(id, { muted: v }); onChanged(); }} label="Mute notifications" />} />
              <Cell label="Sticky on Top" right={<Switch on={dmState.pinned} onChange={async (v) => { await dmSet(id, { pinned: v }); onChanged(); }} label="Sticky on top" />} /></>
            : <><Cell label="Mute Notifications" right={<Switch on={!!group?.muted} onChange={async (v) => { await groupUpdate(id, { muted: v }); onChanged(); }} label="Mute notifications" />} />
              <Cell label="Sticky on Top" right={<Switch on={!!group?.pinned} onChange={async (v) => { await groupSetMe(id, { pinned: v }); onChanged(); }} label="Sticky on top" />} /></>}
        </CellGroup>
        {scope === "group" && (
          <CellGroup>
            <Cell label="My Alias in Group" value={group?.alias || profile.name} onClick={() => setSub("alias")} />
            <Cell label="On-screen Names" right={<Switch on={names} onChange={(v) => { setNames(v); put(key("names", "g", id), v ? null : "0"); onChanged(); }} label="On-screen names" />} />
          </CellGroup>
        )}
        <CellGroup>
          <Cell label="Background" onClick={() => setSub("background")} />
          <Cell label="Clear Chat History" onClick={() => void clear()} />
          <Cell label="Report" onClick={() => void report()} />
        </CellGroup>
        {scope === "group" && !course && group?.role !== "owner" && <CellGroup><Cell label="Leave" danger center onClick={() => void leave()} /></CellGroup>}
        {scope === "dm" && other && <CellGroup><Cell label="Send Message" center onClick={() => { onClose(); onOpenDm(other.id); }} /></CellGroup>}
      </div>
    </div>
  );
}

async function groupLeaveSafe(id: string) {
  const err = await groupLeave(id);
  return { error: err ? (err === "course_group" ? "Leave the course to leave its chat" : err === "owner_cannot_leave" ? "Make someone else the owner first" : "Couldn't leave") : null };
}

function Tile({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="flex min-w-0 flex-col items-center gap-1">{children}<span className="w-full truncate text-center text-[11.5px] text-[var(--we-sub)]">{label}</span></button>;
}
const AddTile = ({ children }: { children: ReactNode }) => <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[6px] border border-dashed border-[var(--we-hint)] text-[var(--we-hint)]">{children}</span>;

function EditText({ title, hint, initial, max, multiline, readOnly, onBack, onSave }: { title: string; hint?: string; initial: string; max: number; multiline?: boolean; readOnly?: boolean; onBack: () => void; onSave: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return (
    <>
      <WeHeader onBack={onBack} title={title} right={!readOnly && <button onClick={() => onSave(v.trim())} className="mr-1 rounded-[4px] bg-[var(--we-accent)] px-3 py-1.5 text-[14px] font-medium text-white">Done</button>} />
      <div className="bg-[var(--we-cell)] px-4 py-3">
        {multiline ? <textarea value={v} readOnly={readOnly} onChange={(e) => setV(e.target.value.slice(0, max))} rows={6} className="w-full resize-none bg-transparent text-[16px] text-[var(--we-text)] outline-none" placeholder={readOnly ? "No notice yet." : "Write the group notice"} />
          : <input autoFocus value={v} onChange={(e) => setV(e.target.value.slice(0, max))} className="w-full bg-transparent text-[16px] text-[var(--we-text)] outline-none" />}
      </div>
      {hint && <p className="px-4 pt-2 text-[13px] text-[var(--we-sub)]">{hint}</p>}
      {readOnly && <p className="px-4 pt-2 text-[13px] text-[var(--we-sub)]">Only the group owner and admins can edit the notice.</p>}
    </>
  );
}

function MembersView({ members, onBack, onOpen }: { members: GroupMember[]; onBack: () => void; onOpen: (u: string) => void }) {
  const [q, setQ] = useState("");
  const shown = members.filter((m) => !q.trim() || `${m.name} ${m.handle ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <WeHeader onBack={onBack} title={`Group Members(${members.length})`} />
      <div className="bg-[var(--we-bg)] px-3 pb-2"><div className="flex items-center gap-2 rounded-[6px] bg-[var(--we-cell)] px-3 py-2"><Search size={16} className="text-[var(--we-sub)]" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" /></div></div>
      <div className="no-scrollbar grid min-h-0 flex-1 grid-cols-5 content-start gap-3 overflow-y-auto bg-[var(--we-cell)] p-4">
        {shown.map((m) => <Tile key={m.user_id} label={m.name} onClick={() => onOpen(m.user_id)}><SqAvatar name={m.name} color={m.color} size={52} /></Tile>)}
      </div>
    </>
  );
}

function GroupQr({ group, onBack }: { group: GroupRow; onBack: () => void }) {
  const { flash } = useApp();
  const [img, setImg] = useState<string | null>(null);
  const url = group.invite_code ? groupLink(group.invite_code) : "";
  useEffect(() => { if (url) void QRCode.toDataURL(url, { margin: 1, width: 520 }).then(setImg); }, [url]);
  async function share() {
    try { if (navigator.share) await navigator.share({ title: group.name, text: `Join "${group.name}" on Birdie`, url }); else { await navigator.clipboard.writeText(url); flash("Invite link copied"); } } catch { /* cancelled */ }
  }
  return (
    <>
      <WeHeader onBack={onBack} title="Group QR Code" />
      <div className="flex flex-1 items-start justify-center px-6 pt-6">
        <div className="w-full max-w-[320px] rounded-[8px] bg-[var(--we-cell)] p-6 text-center">
          <div className="mb-4 text-[17px] font-semibold text-[var(--we-text)]">{group.name}</div>
          {url ? (img ? <img src={img} alt="Group QR code" className="mx-auto w-full rounded" /> : <div className="aspect-square" />) : <p className="py-10 text-[14px] text-[var(--we-sub)]">Only admins can share the invite.</p>}
          {url && <p className="mt-4 text-[13px] text-[var(--we-sub)]">Scan with Birdie (Discover &gt; Scan) to join this group.</p>}
          {url && <button onClick={() => void share()} className="mt-4 w-full rounded-[6px] bg-[var(--we-accent)] py-2.5 text-[15px] font-medium text-white">Share invite link</button>}
        </div>
      </div>
    </>
  );
}

function ManageGroup({ group, members, onBack, onChanged }: { group: GroupRow; members: GroupMember[]; onBack: () => void; onChanged: () => void }) {
  const { flash } = useApp();
  return (
    <>
      <WeHeader onBack={onBack} title="Manage Group" />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <CellGroup gap={false}>
          <Cell label="Reset invite link" sub="The old QR code and link stop working." onClick={async () => { const r = await groupUpdate(group.id, { newLink: true }); flash(r.code ? "New link made" : "Couldn't reset the link"); onChanged(); }} />
        </CellGroup>
        <div className="px-4 pb-1 pt-4 text-[13px] text-[var(--we-sub)]">Group Admins</div>
        <CellGroup gap={false}>
          {members.map((m) => (
            <Cell key={m.user_id} label={<span className="flex items-center gap-3"><SqAvatar name={m.name} color={m.color} size={36} />{m.name}</span>}
              value={m.role === "member" ? undefined : m.role === "owner" ? "Owner" : "Admin"}
              right={m.role === "member" && group.role === "owner" ? <button onClick={async () => { await groupUpdate(group.id, { admin: m.user_id }); onChanged(); flash(`${m.name} is now an admin`); }} className="text-[14px] text-[var(--we-link)]">Make admin</button> : undefined} />
          ))}
        </CellGroup>
      </div>
    </>
  );
}

function SearchHistory({ scope, id, onBack }: { scope: Scope; id: string; onBack: () => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof searchChat>>>([]);
  useEffect(() => { const t = setTimeout(() => void searchChat(scope, id, q).then(setRows), 300); return () => clearTimeout(t); }, [scope, id, q]);
  return (
    <>
      <div className="flex items-center gap-2 bg-[var(--we-bg)] px-3 py-2">
        <div className="flex flex-1 items-center gap-2 rounded-[6px] bg-[var(--we-cell)] px-3 py-2"><Search size={16} className="text-[var(--we-sub)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" /></div>
        <button onClick={onBack} className="text-[15px] text-[var(--we-link)]">Cancel</button>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[var(--we-cell)]">
        {q.trim().length >= 2 && rows.length === 0 && <p className="py-10 text-center text-[14px] text-[var(--we-sub)]">No results</p>}
        {rows.map((r) => (
          <div key={r.id} className="border-b border-[var(--we-sep)] px-4 py-3">
            <div className="flex justify-between text-[13px] text-[var(--we-sub)]"><span>{r.name}</span><span>{new Date(r.created_at).toLocaleDateString()}</span></div>
            <div className="mt-0.5 text-[15px] text-[var(--we-text)]">{r.body}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function BackgroundPicker({ scope, id, onBack, onChanged }: { scope: Scope; id: string; onBack: () => void; onChanged: () => void }) {
  const { flash } = useApp();
  const [cur, setCur] = useState<string | null>(null);
  useEffect(() => { void Promise.resolve().then(() => setCur(chatBackground(scope, id))); }, [scope, id]);
  const pick = (v: string | null) => { put(key("bg", scope, id), v); setCur(v); onChanged(); };
  return (
    <>
      <WeHeader onBack={onBack} title="Background" />
      <div className="grid grid-cols-4 gap-3 bg-[var(--we-cell)] p-4">
        <button onClick={() => pick(null)} className="relative flex aspect-[3/5] items-center justify-center rounded-[6px] bg-[var(--we-chat)] text-[12px] text-[var(--we-sub)] ring-1 ring-[var(--we-sep)]">Default{!cur && <Check size={18} className="absolute bottom-1 right-1 text-[var(--we-accent)]" />}</button>
        {BACKGROUNDS.map((b) => <button key={b} onClick={() => pick(b)} className="relative aspect-[3/5] rounded-[6px] ring-1 ring-[var(--we-sep)]" style={{ background: b }} aria-label="Background">{cur === b && <Check size={18} className="absolute bottom-1 right-1 text-[var(--we-accent)]" />}</button>)}
      </div>
      <CellGroup>
        <label className="flex w-full cursor-pointer items-center pl-4 active:bg-black/5">
          <span className="mr-4 flex w-6 items-center justify-center"><ImagePlus size={20} /></span>
          <span className="cell-inner flex min-h-[54px] flex-1 items-center text-[16px] text-[var(--we-text)]">Choose from Album</span>
          <input type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
            const blob = await shrink(f, 1080);
            const data = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(blob); });
            try { pick(data); } catch { flash("That photo is too big"); }
          }} />
        </label>
      </CellGroup>
    </>
  );
}

function AddMembers({ id, existing, onBack, onAdded }: { id: string; existing: string[]; onBack: () => void; onAdded: () => void }) {
  const { findPeople, flash } = useApp();
  const [q, setQ] = useState(""); const [found, setFound] = useState<Person[]>([]);
  useEffect(() => { if (q.trim().length < 2) return; const t = setTimeout(() => void findPeople(q.trim().replace(/^@/, "")).then(setFound), 300); return () => clearTimeout(t); }, [q, findPeople]);
  return (
    <>
      <WeHeader onBack={onBack} title="Add Members" />
      <div className="bg-[var(--we-bg)] px-3 pb-2"><div className="flex items-center gap-2 rounded-[6px] bg-[var(--we-cell)] px-3 py-2"><Search size={16} className="text-[var(--we-sub)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} autoCapitalize="none" placeholder="Search name or Birdie ID" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" /></div></div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[var(--we-cell)]">{q.trim().length >= 2 && found.map((p) => (
        <Cell key={p.id} label={<span className="flex items-center gap-3"><SqAvatar name={p.name} color={p.color} size={40} />{p.name}</span>}
          right={existing.includes(p.id) ? <span className="text-[13px] text-[var(--we-sub)]">In group</span> : <button onClick={async () => { const err = await groupAdd(id, p.id); flash(err ? "Couldn't add them" : `${p.name} added`); if (!err) onAdded(); }} className="rounded-[4px] bg-[var(--we-accent)] px-3 py-1.5 text-[13px] text-white">Add</button>} />
      ))}</div>
    </>
  );
}

function RemoveMembers({ id, members, onBack, onDone }: { id: string; members: GroupMember[]; onBack: () => void; onDone: () => void }) {
  const [sel, setSel] = useState<string[]>([]);
  return (
    <>
      <WeHeader onBack={onBack} title="Remove Members" right={<button disabled={!sel.length} onClick={async () => { for (const u of sel) await groupLeave(id, u); onDone(); }} className="mr-1 rounded-[4px] bg-[var(--we-red)] px-3 py-1.5 text-[14px] text-white disabled:opacity-40">Remove{sel.length ? `(${sel.length})` : ""}</button>} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[var(--we-cell)]">{members.map((m) => (
        <button key={m.user_id} onClick={() => setSel((s) => (s.includes(m.user_id) ? s.filter((x) => x !== m.user_id) : [...s, m.user_id]))} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] px-4 py-2.5 text-left">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${sel.includes(m.user_id) ? "border-[var(--we-red)] bg-[var(--we-red)] text-white" : "border-[var(--we-hint)]"}`}>{sel.includes(m.user_id) && <Check size={13} />}</span>
          <SqAvatar name={m.name} color={m.color} size={40} /><span className="text-[16px] text-[var(--we-text)]">{m.name}</span>
        </button>
      ))}</div>
    </>
  );
}
