"use client";

// Running a verified account from your phone: the inbox (with the 7-day reply window), publishing
// articles and videos, the welcome message, auto-replies, keyword replies, the bottom menu, and the team.
import { addSchoolDoc, deleteSchoolDoc, schoolDocsList } from "./live/campusData";
import { extractText } from "./extract";
import { scannable } from "./ingest";
import { readScan } from "./aiClient";
import { safeName, uploadTo } from "./live/helpData";
import { ArrowLeft, Clock, ImagePlus, Plus, Send, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { OALogo, Tick } from "./Official";
import { Rich } from "./Rich";
import { whileVisible } from "./perf";
import { initials } from "./PostCard";
import { listTime, oaAddAdmin, oaAdminInfo, oaConversation, oaDeletePost, oaInbox, oaPublish, oaRemoveAdmin, oaReply, oaUpdate, officialProfile, uploadOfficialMedia, type OAAdminInfo, type OAInboxRow, type OAMsg, type OAPostCard, type OMenu } from "./live/chatData";
import { uid, useApp } from "./store";
import { Avatar, Btn, Empty, Segmented, Sheet, TextField, scrollToEnd } from "./ui";

type Tab = "inbox" | "post" | "knowledge" | "settings" | "team";

export default function OfficialManage({ id, onBack, onPost }: { id: string; onBack: () => void; onPost: (id: string) => void }) {
  const { flash } = useApp();
  const [info, setInfo] = useState<OAAdminInfo | null>(null);
  const [tab, setTab] = useState<Tab>("inbox");
  const loadInfo = useCallback(async () => { const r = await oaAdminInfo(id); if (r.error) flash("You don't manage this account"); else setInfo(r.data); }, [id, flash]);
  useEffect(() => { void Promise.resolve().then(loadInfo); }, [loadInfo]);
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--paper)]">
      <div className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-2">
        <button onClick={onBack} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-xl active:bg-[var(--paper-dim)]"><ArrowLeft size={19} /></button>
        {info && <OALogo a={info} size={34} />}
        <div className="min-w-0 flex-1"><div className="flex items-center gap-1 text-[15px] font-bold"><span className="truncate">{info?.name ?? ""}</span><Tick /></div><div className="text-[11.5px] text-[var(--dim)]">{info ? `${info.followers} follower${info.followers === 1 ? "" : "s"} · you're ${info.role === "owner" ? "the owner" : "an admin"}` : ""}</div></div>
      </div>
      <div className="px-4 pb-2"><Segmented value={tab} onChange={setTab} options={[{ id: "inbox", label: "Inbox" }, { id: "post", label: "Post" }, { id: "knowledge", label: "Knowledge" }, { id: "settings", label: "Settings" }, { id: "team", label: "Team" }]} /></div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-1">
        {info && tab === "inbox" && <Inbox id={id} />}
        {info && tab === "post" && <Publish info={info} onPost={onPost} onChanged={loadInfo} />}
        {info && tab === "knowledge" && <Knowledge oa={id} />}
        {info && tab === "settings" && <SettingsForm info={info} onSaved={setInfo} />}
        {info && tab === "team" && <Team info={info} onChanged={loadInfo} />}
      </div>
    </div>
  );
}

function Inbox({ id }: { id: string }) {
  const [rows, setRows] = useState<OAInboxRow[] | null>(null);
  const [open, setOpen] = useState<OAInboxRow | null>(null);
  const load = useCallback(() => oaInbox(id).then(setRows), [id]);
  useEffect(() => { void Promise.resolve().then(load); const t = setInterval(whileVisible(() => void load()), 10000); return () => clearInterval(t); }, [load]);
  if (rows === null) return <p className="py-6 text-center text-[13px] text-[var(--dim)]">Loading...</p>;
  return (
    <>
      {rows.length === 0 ? <Empty title="No messages yet" text="When students write to your account, their chats land here. You can reply for 7 days after their last message." /> : (
        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">{rows.map((r) => (
          <button key={r.user.id} onClick={() => setOpen(r)} className="flex w-full items-center gap-3 border-b border-[var(--line)] p-3 text-left last:border-0 active:bg-[var(--paper-dim)]">
            <Avatar initials={initials(r.user.name)} color={r.user.color} size={42} />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2"><span className="truncate text-[14px] font-semibold">{r.user.name}</span><span className="shrink-0 text-[11px] text-[var(--dim)]">{listTime(r.last_at)}</span></div>
              <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--dim)]">{r.last}</span>
                {r.unread > 0 ? <span className="shrink-0 rounded-full bg-[#E5484D] px-1.5 text-[11px] font-bold text-white">{r.unread}</span> : !r.window_open && <span className="shrink-0 text-[10.5px] text-[var(--dim)]">closed</span>}</div>
            </div>
          </button>
        ))}</div>)}
      <Sheet open={!!open} onClose={() => { setOpen(null); void load(); }}>{open && <Conversation oa={id} user={open.user.id} />}</Sheet>
    </>
  );
}

function Conversation({ oa, user }: { oa: string; user: string }) {
  const { flash } = useApp();
  const [c, setC] = useState<{ user: { name: string; color: string; handle: string | null }; messages: OAMsg[]; window_open: boolean; window_ends: string | null } | null>(null);
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { void oaConversation(oa, user).then((r) => setC(r.data)); }, [oa, user]);
  useEffect(() => { scrollToEnd(end.current, false); }, [c?.messages.length]);
  async function send() {
    const t = draft.trim(); if (!t) return;
    const r = await oaReply(oa, user, t);
    if (r.error) { flash(r.error === "window_closed" ? "It's been more than 7 days since they wrote. You can't message them until they write again." : "Couldn't send"); return; }
    setDraft(""); setC(r.data);
  }
  if (!c) return <p className="py-6 text-center text-[13px] text-[var(--dim)]">Loading...</p>;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5"><Avatar initials={initials(c.user.name)} color={c.user.color} size={36} /><div><div className="text-[15px] font-bold">{c.user.name}</div>{c.user.handle && <div className="text-[12px] text-[var(--dim)]">@{c.user.handle}</div>}</div></div>
      <div className="max-h-[45vh] space-y-2 overflow-y-auto rounded-2xl bg-[#EFE8F4] p-3">
        {c.messages.map((m) => (
          <div key={m.id} className={`flex ${m.from_oa ? "justify-end" : ""}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13.5px] leading-snug ${m.from_oa ? "bg-[#D9B8EC]" : "bg-white"}`}>
              {m.kind === "article" ? <span className="font-semibold">[Article] {m.body}</span> : <Rich text={m.body} />}
              {m.from_oa && m.kind !== "text" && <div className="mt-0.5 text-[10px] text-[#7a6f8c]">{m.kind === "auto" ? "auto-reply" : m.kind === "menu" ? "menu reply" : ""}</div>}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      {c.window_open ? (
        <>
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--dim)]"><Clock size={13} /> You can reply until {c.window_ends ? new Date(c.window_ends).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "7 days after their last message"}.</div>
          <div className="flex items-end gap-2"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder="Reply as the account" className="min-w-0 flex-1 resize-none rounded-xl bg-[var(--paper-dim)] px-3 py-2.5 text-[14px] outline-none" /><button onClick={() => void send()} disabled={!draft.trim()} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--uni)] text-white disabled:opacity-40"><Send size={16} /></button></div>
        </>
      ) : <div className="rounded-xl bg-[var(--paper-dim)] p-3 text-[12.5px] leading-snug text-[var(--dim)]">It&apos;s been more than 7 days since {c.user.name.split(" ")[0]} wrote, so you can&apos;t message them. They still see your articles on your profile, and you can reply as soon as they write again.</div>}
    </div>
  );
}

function Publish({ info, onPost, onChanged }: { info: OAAdminInfo; onPost: (id: string) => void; onChanged: () => void }) {
  const { flash } = useApp();
  const [kind, setKind] = useState<"article" | "video">("article");
  const [f, setF] = useState({ title: "", summary: "", body: "", link: "" });
  const [cover, setCover] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [posts, setPosts] = useState<OAPostCard[]>([]);
  const coverIn = useRef<HTMLInputElement>(null), videoIn = useRef<HTMLInputElement>(null);
  const loadPosts = useCallback(() => officialProfile(info.id).then((p) => setPosts(p?.posts ?? [])), [info.id]);
  useEffect(() => { void Promise.resolve().then(loadPosts); }, [loadPosts]);
  async function upload(file: File | undefined, set: (u: string) => void) {
    if (!file) return;
    setBusy(`Uploading ${file.type.startsWith("video") ? "video" : "photo"}...`);
    const r = await uploadOfficialMedia(info.id, file);
    setBusy(null);
    if (r.url) set(r.url); else flash(r.error ?? "Couldn't upload");
  }
  async function publish() {
    setBusy("Publishing...");
    const r = await oaPublish(info.id, { kind, title: f.title, summary: f.summary, body: f.body, cover, video, link: f.link.trim() });
    setBusy(null);
    if (r.error) { flash(r.error === "daily_limit" ? `You can post ${info.posts_daily} times a day` : r.error === "bad_link" ? "Links must start with https://" : "Add a title (and a video for video posts)"); return; }
    flash(r.data?.delivered ? `Published. Sent to ${r.data.delivered} recent chat${r.data.delivered === 1 ? "" : "s"}.` : "Published to your profile");
    setF({ title: "", summary: "", body: "", link: "" }); setCover(null); setVideo(null); void loadPosts(); onChanged();
  }
  const left = Math.max(0, info.posts_daily - info.posts_today);
  return (
    <div className="space-y-3">
      <Segmented value={kind} onChange={setKind} options={[{ id: "article", label: "Article" }, { id: "video", label: "Video" }]} />
      <TextField value={f.title} onChange={(v) => setF((x) => ({ ...x, title: v.slice(0, 140) }))} placeholder="Title" />
      <TextField value={f.summary} onChange={(v) => setF((x) => ({ ...x, summary: v.slice(0, 300) }))} placeholder="One-line summary (shows on the card)" />
      {kind === "article" && <TextField value={f.body} onChange={(v) => setF((x) => ({ ...x, body: v }))} placeholder="Write the article. **bold**, lists and ### headings work." multiline />}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => coverIn.current?.click()} className="flex h-24 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[var(--line)] text-[12.5px] font-semibold text-[var(--dim)]">{cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <span className="flex items-center gap-1.5"><ImagePlus size={16} /> Cover photo</span>}</button>
        {kind === "video" && <button onClick={() => videoIn.current?.click()} className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-[var(--line)] text-[12.5px] font-semibold text-[var(--dim)]">{video ? "Video added ✓" : "Add video (max 50 MB)"}</button>}
      </div>
      <TextField value={f.link} onChange={(v) => setF((x) => ({ ...x, link: v }))} placeholder="Link (optional), e.g. https://apply.yourcompany.com" />
      {busy && <p className="text-center text-[12.5px] font-semibold text-[var(--dim)]">{busy}</p>}
      <div className="grid grid-cols-2 gap-2"><Btn variant="ghost" disabled={!f.title.trim()} onClick={() => setPreview(true)}>Preview</Btn><Btn disabled={!!busy || f.title.trim().length < 3 || (kind === "video" && !video) || left === 0} onClick={() => void publish()}>Publish</Btn></div>
      <p className="text-[11.5px] leading-snug text-[var(--dim)]">{left} post{left === 1 ? "" : "s"} left today. Everyone sees it on your profile; students who wrote to you in the last 7 days also get it in their chat.</p>
      <input ref={coverIn} type="file" accept="image/*" hidden onChange={(e) => { void upload(e.target.files?.[0], setCover); e.target.value = ""; }} />
      <input ref={videoIn} type="file" accept="video/*" hidden onChange={(e) => { void upload(e.target.files?.[0], setVideo); e.target.value = ""; }} />
      {posts.length > 0 && <div className="pt-2"><div className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-[var(--dim)]">Published</div>
        <div className="space-y-1.5">{posts.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-xl bg-white p-2.5 ring-1 ring-[var(--line)]">
            <button onClick={() => onPost(p.id)} className="min-w-0 flex-1 text-left"><div className="truncate text-[13.5px] font-semibold">{p.title}</div><div className="text-[11px] text-[var(--dim)]">{p.kind} · {p.views} read{p.views === 1 ? "" : "s"} · {listTime(p.created_at)}</div></button>
            <button onClick={async () => { if (!confirm("Delete this post?")) return; await oaDeletePost(p.id); void loadPosts(); }} aria-label="Delete post" className="p-1.5 text-[var(--dim)]"><Trash2 size={15} /></button>
          </div>
        ))}</div></div>}
      <Sheet open={preview} onClose={() => setPreview(false)} title="Preview">
        {cover && <img src={cover} alt="" className="mb-3 w-full rounded-2xl" />}
        <div className="disp text-[20px] font-bold leading-tight">{f.title}</div>
        {f.summary && <p className="mt-2 font-semibold text-[var(--dim)]">{f.summary}</p>}
        <div className="mt-2 text-[14.5px] leading-relaxed"><Rich text={f.body} /></div>
      </Sheet>
    </div>
  );
}

function SettingsForm({ info, onSaved }: { info: OAAdminInfo; onSaved: (i: OAAdminInfo) => void }) {
  const { flash } = useApp();
  const [f, setF] = useState({ name: info.name, about: info.about ?? "", welcome: info.welcome ?? "", auto_reply: info.auto_reply ?? "", logo_url: info.logo_url ?? "" });
  const [keywords, setKeywords] = useState<{ k: string; reply: string }[]>(info.keywords ?? []);
  const [menu, setMenu] = useState<OMenu[]>(info.menu ?? []);
  const [busy, setBusy] = useState(false);
  const logoIn = useRef<HTMLInputElement>(null);
  async function save() {
    setBusy(true);
    const clean = menu.map((g) => ({ label: g.label.trim(), ...(g.items?.length ? { items: g.items.filter((i) => i.label.trim() && i.value.trim()).map((i) => ({ label: i.label.trim(), kind: i.kind, value: i.value.trim() })) } : { kind: g.kind ?? "reply", value: (g.value ?? "").trim() }) })).filter((g) => g.label);
    const r = await oaUpdate(info.id, { ...f, keywords: keywords.filter((k) => k.k.trim() && k.reply.trim()), menu: clean });
    setBusy(false);
    if (r.error) { flash(r.error === "bad_link" ? "Menu links must start with https://" : r.error === "bad_menu" ? "Up to 3 menu buttons, 5 items each, every item needs a name" : "Couldn't save"); return; }
    if (r.data) onSaved(r.data);
    flash("Saved");
  }
  const setGroup = (i: number, g: OMenu) => setMenu((m) => m.map((x, j) => (j === i ? g : x)));
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={() => logoIn.current?.click()} aria-label="Change logo"><OALogo a={{ name: f.name, logo_url: f.logo_url || null, color: info.color }} size={56} /></button>
        <div className="min-w-0 flex-1"><TextField value={f.name} onChange={(v) => setF((x) => ({ ...x, name: v }))} placeholder="Account name" /></div>
      </div>
      <input ref={logoIn} type="file" accept="image/*" hidden onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; const r = await uploadOfficialMedia(info.id, file); if (r.url) setF((x) => ({ ...x, logo_url: r.url! })); else flash(r.error ?? "Couldn't upload"); }} />
      <TextField value={f.about} onChange={(v) => setF((x) => ({ ...x, about: v }))} placeholder="About the account" multiline />
      <Section title="Welcome message" sub="Sent once when someone follows you.">
        <TextField value={f.welcome} onChange={(v) => setF((x) => ({ ...x, welcome: v }))} placeholder="Welcome to SUG FUL! Tap the menu below for..." multiline />
      </Section>
      <Section title="Auto-reply" sub="Sent when someone writes to you (at most once every 12 hours each).">
        <TextField value={f.auto_reply} onChange={(v) => setF((x) => ({ ...x, auto_reply: v }))} placeholder="Thanks for writing. We reply 9am to 5pm, Monday to Friday." multiline />
      </Section>
      <Section title="Keyword replies" sub="If a message contains the word, this reply goes out instantly.">
        {keywords.map((k, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input value={k.k} onChange={(e) => setKeywords((ks) => ks.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))} placeholder="Word, e.g. fees" className="w-24 shrink-0 rounded-xl bg-[var(--paper-dim)] px-3 py-2 text-[13.5px] outline-none" />
            <input value={k.reply} onChange={(e) => setKeywords((ks) => ks.map((x, j) => (j === i ? { ...x, reply: e.target.value } : x)))} placeholder="Reply" className="min-w-0 flex-1 rounded-xl bg-[var(--paper-dim)] px-3 py-2 text-[13.5px] outline-none" />
            <button onClick={() => setKeywords((ks) => ks.filter((_, j) => j !== i))} aria-label="Remove" className="text-[var(--dim)]"><X size={16} /></button>
          </div>
        ))}
        {keywords.length < 30 && <button onClick={() => setKeywords((ks) => [...ks, { k: "", reply: "" }])} className="flex items-center gap-1 text-[13px] font-semibold text-[var(--uni-deep)]"><Plus size={14} /> Add keyword</button>}
      </Section>
      <Section title="Menu" sub="Up to 3 buttons at the bottom of your chat. A button can open a list of up to 5 items. Items either reply in the chat or open a link.">
        {menu.map((g, i) => (
          <div key={i} className="mb-3 rounded-xl border border-[var(--line)] bg-white p-2.5">
            <div className="flex gap-2"><input value={g.label} onChange={(e) => setGroup(i, { ...g, label: e.target.value.slice(0, 16) })} placeholder="Button name" className="min-w-0 flex-1 rounded-lg bg-[var(--paper-dim)] px-3 py-2 text-[13.5px] font-semibold outline-none" />
              <button onClick={() => setMenu((m) => m.filter((_, j) => j !== i))} aria-label="Remove button" className="text-[var(--dim)]"><Trash2 size={15} /></button></div>
            {(g.items ?? []).map((it, j) => (
              <div key={j} className="mt-2 grid grid-cols-[1fr_auto] gap-1.5">
                <input value={it.label} onChange={(e) => setGroup(i, { ...g, items: g.items!.map((x, k) => (k === j ? { ...x, label: e.target.value.slice(0, 24) } : x)) })} placeholder="Item name" className="rounded-lg bg-[var(--paper-dim)] px-3 py-1.5 text-[13px] outline-none" />
                <select value={it.kind} onChange={(e) => setGroup(i, { ...g, items: g.items!.map((x, k) => (k === j ? { ...x, kind: e.target.value as "link" | "reply" } : x)) })} className="rounded-lg bg-[var(--paper-dim)] px-2 text-[12.5px] outline-none"><option value="reply">Reply</option><option value="link">Link</option></select>
                <input value={it.value} onChange={(e) => setGroup(i, { ...g, items: g.items!.map((x, k) => (k === j ? { ...x, value: e.target.value } : x)) })} placeholder={it.kind === "link" ? "https://..." : "What to reply"} className="col-span-2 rounded-lg bg-[var(--paper-dim)] px-3 py-1.5 text-[13px] outline-none" />
              </div>
            ))}
            {(g.items?.length ?? 0) < 5 && <button onClick={() => setGroup(i, { label: g.label, items: [...(g.items ?? []), { label: "", kind: "reply", value: "" }] })} className="mt-2 flex items-center gap-1 text-[12.5px] font-semibold text-[var(--uni-deep)]"><Plus size={13} /> Add item</button>}
          </div>
        ))}
        {menu.length < 3 && <button onClick={() => setMenu((m) => [...m, { label: "", items: [{ label: "", kind: "reply", value: "" }] }])} className="flex items-center gap-1 text-[13px] font-semibold text-[var(--uni-deep)]"><Plus size={14} /> Add menu button</button>}
      </Section>
      <Btn disabled={busy} onClick={() => void save()}>{busy ? "Saving..." : "Save changes"}</Btn>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return <div><div className="text-[13.5px] font-bold">{title}</div><div className="mb-2 text-[12px] leading-snug text-[var(--dim)]">{sub}</div>{children}</div>;
}

function Team({ info, onChanged }: { info: OAAdminInfo; onChanged: () => void }) {
  const { flash } = useApp();
  const [handle, setHandle] = useState("");
  const owner = info.role === "owner";
  return (
    <div className="space-y-3">
      <div className="space-y-1">{info.admins.map((a) => (
        <div key={a.id} className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 ring-1 ring-[var(--line)]">
          <Avatar initials={initials(a.name)} color={a.color} size={34} />
          <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold">{a.name}</div><div className="text-[11.5px] text-[var(--dim)]">{a.handle ? `@${a.handle} · ` : ""}{a.role}</div></div>
          {owner && a.role !== "owner" && <button onClick={async () => { await oaRemoveAdmin(info.id, a.id); onChanged(); }} className="text-[12.5px] font-semibold text-[var(--help)]">Remove</button>}
        </div>
      ))}</div>
      {owner ? (
        <div className="flex gap-2"><input value={handle} onChange={(e) => setHandle(e.target.value)} autoCapitalize="none" placeholder="Add an admin by @username" className="min-w-0 flex-1 rounded-xl bg-[var(--paper-dim)] px-3 py-2.5 text-[13.5px] outline-none" />
          <button onClick={async () => { const r = await oaAddAdmin(info.id, handle); if (r.error) flash(r.error === "no_such_user" ? "No one has that username" : "Couldn't add"); else { setHandle(""); onChanged(); flash("Added"); } }} disabled={handle.trim().length < 2} className="rounded-xl bg-[var(--ink)] px-4 text-[13px] font-semibold text-[var(--paper)] disabled:opacity-40">Add</button></div>
      ) : <p className="text-[12.5px] text-[var(--dim)]">Only the owner can add or remove admins.</p>}
      <p className="text-[11.5px] leading-snug text-[var(--dim)]">Admins can reply to chats, publish, and edit the menu and auto-replies.</p>
    </div>
  );
}

/** The handbook, policies and notices students can ask Birdie about ("where do I do clearance?"). */
function Knowledge({ oa }: { oa: string }) {
  const { flash, auth } = useApp();
  const [docs, setDocs] = useState<Awaited<ReturnType<typeof schoolDocsList>> | null>(null);
  const [title, setTitle] = useState(""); const [text, setText] = useState(""); const [busy, setBusy] = useState<string | null>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const load = useCallback(() => void schoolDocsList(oa).then(setDocs), [oa]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function fromFile(f?: File) {
    if (!f) return;
    setBusy(`Reading ${f.name}...`);
    let t = await extractText(f);
    if ((!t || t.trim().length < 40) && scannable(f.name)) {
      // A scan or photo: read it with Birdie (the same way course files are read).
      const path = `${auth.userId}/school/${uid()}-${safeName(f.name)}`;
      const err = await uploadTo("study-files", path, f);
      if (!err) { const r = await readScan(path); if (r.ok) t = r.text; }
    }
    setBusy(null);
    if (!t || t.trim().length < 40) return flash("Couldn't find text in that file. Paste it instead.");
    setText(t); if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }
  async function save() {
    setBusy("Saving...");
    const r = await addSchoolDoc(oa, title.trim(), text);
    setBusy(null);
    if (r.error) return flash(r.error === "no_school" ? "Set the account's school in Settings first" : r.error === "too_long" ? "That's very long. Split it into parts." : "Couldn't save it");
    flash("Saved. Students can ask Birdie about it now."); setTitle(""); setText(""); load();
  }
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-snug text-[var(--dim)]">Add your student handbook, policies, fees, clearance steps and notices. Students at your school ask Birdie (&quot;where do I do clearance?&quot;) and it answers from these, naming the document.</p>
      <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
        <TextField value={title} onChange={setTitle} placeholder="Title, e.g. Student Handbook 2026" />
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Paste the text here, or pick a file" className="mt-2 w-full resize-none rounded-xl border-2 border-[var(--line)] p-3 text-[14px] outline-none" />
        <input ref={fileIn} type="file" accept=".pdf,.docx,.txt,.md,image/*" hidden onChange={(e) => { void fromFile(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Btn variant="ghost" onClick={() => fileIn.current?.click()}>Pick a file</Btn>
          <Btn disabled={!!busy || title.trim().length < 2 || text.trim().length < 40} onClick={() => void save()}>{busy ?? "Save"}</Btn>
        </div>
      </div>
      {docs === null ? <p className="text-[13px] text-[var(--dim)]">Loading...</p> : docs.length === 0 ? <p className="text-[13px] text-[var(--dim)]">Nothing added yet.</p> : docs.map((d) => (
        <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-3">
          <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">{d.title}</span><span className="block text-[12px] text-[var(--dim)]">{Math.max(1, Math.round(d.chars / 1000))}k characters · {new Date(d.created_at).toLocaleDateString()}</span></span>
          <button onClick={async () => { if (!confirm(`Remove "${d.title}"?`)) return; await deleteSchoolDoc(d.id); load(); }} className="text-[13px] font-semibold text-[var(--help)]">Remove</button>
        </div>
      ))}
    </div>
  );
}
