"use client";

// Discover > Campus: Updates (from verified accounts: the school, SUG, departments; "Important" ones
// reach everyone at the school as a notification) and Gist (what students are saying about campus).
import { AlertTriangle, ChevronRight, Heart, MessageSquare, MoreHorizontal, PenSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ago } from "./Moments";
import { OALogo, Tick } from "./Official";
import { campusComment, campusComments, campusFeed, campusLike, deleteCampusComment, deleteCampusPost, postCampusUpdate, postGist, type CampusComment, type CampusPost } from "./live/campusData";
import { myManagedOfficials, type OAManaged } from "./live/chatData";
import { reportThing } from "./live/socialData";
import { useApp } from "./store";
import { Page } from "./ui";
import { SqAvatar, Switch, WeHeader } from "./we";

const SEEN = "birdie-campus-seen";
/** Is there an update you haven't seen (for the red dot on Discover)? */
export async function hasNewCampusUpdate() {
  const l = await campusFeed("update");
  let seen = ""; try { seen = localStorage.getItem(SEEN) ?? ""; } catch { /* ignore */ }
  return l.some((p) => p.created_at > seen);
}

function Card({ p, onChange, onRemoved, onComments }: { p: CampusPost; onChange: (p: CampusPost) => void; onRemoved: () => void; onComments: () => void }) {
  const { flash, setOverlay } = useApp();
  const [menu, setMenu] = useState(false);
  const who = p.account ? p.account.name : p.author?.name ?? "Student";
  return (
    <div className="border-b border-[var(--we-sep)] bg-[var(--we-cell)] px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        {p.account ? <OALogo a={p.account} size={36} /> : <SqAvatar name={who} color={p.author?.color} size={36} onClick={() => p.author && setOverlay({ t: "contact", id: p.author.id })} />}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-[15px] text-[var(--we-link)]"><span className="truncate">{who}</span>{p.account && <Tick />}</span>
          <span className="block text-[12px] text-[var(--we-hint)]">{ago(p.created_at)}</span>
        </span>
        {p.important && <span className="flex items-center gap-1 rounded-[4px] bg-[#FDECEA] px-1.5 py-0.5 text-[11.5px] font-medium text-[var(--we-red)]"><AlertTriangle size={12} /> Important</span>}
        <button onClick={() => setMenu((m) => !m)} aria-label="More" className="relative text-[var(--we-hint)]"><MoreHorizontal size={20} />
          {menu && (
            <span className="absolute right-0 top-6 z-10 w-36 overflow-hidden rounded-[6px] bg-[var(--we-pop)] text-left text-[14px] text-white shadow-xl">
              {p.mine ? <span role="button" onClick={async () => { setMenu(false); if (!confirm("Delete this post?")) return; await deleteCampusPost(p.id); onRemoved(); }} className="block px-4 py-2.5">Delete</span>
                : <span role="button" onClick={async () => { setMenu(false); const r = prompt("What's wrong with this post?"); if (r === null) return; const e = await reportThing("campus", p.id, r || undefined); flash(e ?? "Thanks. The Birdie team will look at it."); }} className="block px-4 py-2.5">Report</span>}
            </span>
          )}
        </button>
      </div>
      {p.title && <div className="mt-2 text-[16.5px] font-semibold leading-snug text-[var(--we-text)]">{p.title}</div>}
      <p className="mt-1 whitespace-pre-line break-words text-[15.5px] leading-snug text-[var(--we-text)]">{p.body}</p>
      <div className="mt-2.5 flex items-center gap-6 text-[13.5px] text-[var(--we-sub)]">
        <button onClick={async () => { const r = await campusLike(p.id, !p.liked); if (r.data) onChange(r.data); }} className={`flex items-center gap-1.5 ${p.liked ? "text-[var(--we-red)]" : ""}`}><Heart size={16} className={p.liked ? "fill-current" : ""} />{p.likes || "Like"}</button>
        <button onClick={onComments} className="flex items-center gap-1.5"><MessageSquare size={16} />{p.comments || "Comment"}</button>
      </div>
    </div>
  );
}

function Comments({ post, open, onClose, onChange }: { post: CampusPost | null; open: boolean; onClose: () => void; onChange: (p: CampusPost) => void }) {
  const { flash, setOverlay } = useApp();
  const [list, setList] = useState<CampusComment[] | null>(null);
  const [draft, setDraft] = useState("");
  const load = useCallback(() => { if (post) void campusComments(post.id).then(setList); }, [post]);
  useEffect(() => { if (open) void Promise.resolve().then(load); }, [open, load]);
  async function send() {
    if (!post || !draft.trim()) return;
    const r = await campusComment(post.id, draft.trim());
    if (r.error) return flash("Couldn't comment");
    setDraft(""); if (r.data) onChange(r.data); load();
  }
  return (
    <Page open={open} onClose={onClose} title="Comments">
      <div className="flex min-h-full flex-col">
        <div className="flex-1 bg-[var(--we-cell)]">
          {list === null ? <p className="py-8 text-center text-[13.5px] text-[var(--we-hint)]">Loading...</p> : list.length === 0 ? <p className="py-10 text-center text-[14px] text-[var(--we-sub)]">No comments yet</p> : list.map((c) => (
            <div key={c.id} className="flex gap-3 border-b border-[var(--we-sep)] px-4 py-3">
              <SqAvatar name={c.user.name} color={c.user.color} size={34} onClick={() => setOverlay({ t: "contact", id: c.user.id })} />
              <span className="min-w-0 flex-1"><span className="block text-[14px] text-[var(--we-link)]">{c.user.name}</span><span className="block whitespace-pre-line break-words text-[15px] text-[var(--we-text)]">{c.body}</span><span className="block text-[12px] text-[var(--we-hint)]">{ago(c.created_at)}</span></span>
              {c.mine && <button onClick={async () => { await deleteCampusComment(c.id); load(); }} className="self-start text-[12.5px] text-[var(--we-link)]">Delete</button>}
            </div>
          ))}
        </div>
        <div className="sticky bottom-0 flex items-end gap-2 border-t border-[var(--we-sep)] bg-[var(--we-bar)] px-2 py-2">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 1000))} rows={1} placeholder="Comment" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            className="max-h-24 min-h-9 min-w-0 flex-1 resize-none rounded-[4px] bg-[var(--we-input)] px-2.5 py-[7px] text-[16px] text-[var(--we-text)] outline-none" />
          <button onClick={() => void send()} disabled={!draft.trim()} className="mb-[2px] h-8 rounded-[4px] bg-[var(--we-accent)] px-3 text-[14px] font-medium text-white disabled:opacity-40">Send</button>
        </div>
      </div>
    </Page>
  );
}

function Compose({ open, kind, accounts, onClose, onPosted }: { open: boolean; kind: "update" | "gist"; accounts: OAManaged[]; onClose: () => void; onPosted: (p: CampusPost) => void }) {
  const { flash, setOverlay } = useApp();
  const [oa, setOa] = useState(accounts[0]?.id ?? "");
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [important, setImportant] = useState(false);
  const [busy, setBusy] = useState(false);
  async function post() {
    setBusy(true);
    const r = kind === "update" ? await postCampusUpdate(oa || accounts[0]?.id, title.trim(), body.trim(), important) : await postGist(title.trim(), body.trim());
    setBusy(false);
    if (r.error === "no_school") { flash("Add your school in Settings first"); setOverlay({ t: "settings" }); return; }
    if (r.error) return flash(r.error === "important_limit" ? "Only 3 important updates a day" : r.error === "slow_down" ? "You've posted a lot today" : "Couldn't post");
    setTitle(""); setBody(""); setImportant(false); if (r.data) onPosted(r.data);
  }
  return (
    <Page open={open} onClose={onClose} title={kind === "update" ? "Post an Update" : "Post to Gist"} tone="cell"
      right={<button onClick={() => void post()} disabled={busy || !body.trim()} className="mr-1 rounded-[4px] bg-[var(--we-accent)] px-3 py-1.5 text-[14px] font-medium text-white disabled:opacity-40">{busy ? "..." : "Post"}</button>}>
      <div className="px-5 pt-3">
        {kind === "update" && accounts.length > 1 && <select value={oa} onChange={(e) => setOa(e.target.value)} className="mb-3 w-full rounded-[6px] bg-[var(--we-bg)] px-3 py-2.5 text-[15px] text-[var(--we-text)] outline-none">{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}
        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 140))} placeholder="Headline (optional)" className="w-full border-b border-[var(--we-sep)] bg-transparent py-3 text-[17px] font-semibold text-[var(--we-text)] outline-none placeholder:font-normal placeholder:text-[var(--we-hint)]" />
        <textarea autoFocus value={body} onChange={(e) => setBody(e.target.value.slice(0, 4000))} rows={8} placeholder={kind === "update" ? "What does everyone need to know?" : "What's happening on campus?"} className="mt-2 w-full resize-none bg-transparent text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
        {kind === "update" && (
          <div className="mt-4 flex items-center gap-3 border-t border-[var(--we-sep)] py-4">
            <span className="min-w-0 flex-1"><span className="block text-[16px] text-[var(--we-text)]">Important</span><span className="block text-[12.5px] text-[var(--we-sub)]">Notify everyone at the school. For things like no lectures, an emergency, or a deadline moved. 3 a day.</span></span>
            <Switch on={important} onChange={setImportant} label="Important" />
          </div>
        )}
      </div>
    </Page>
  );
}

export default function Campus({ onBack, onArticles }: { onBack: () => void; onArticles: () => void }) {
  const { auth, profile, setOverlay } = useApp();
  const [tab, setTab] = useState<"update" | "gist">("update");
  const [items, setItems] = useState<CampusPost[] | null>(null);
  const [accounts, setAccounts] = useState<OAManaged[]>([]);
  const [compose, setCompose] = useState(false);
  const [comments, setComments] = useState<CampusPost | null>(null);
  const load = useCallback(async () => { setItems(null); setItems(await campusFeed(tab)); }, [tab]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => {
    if (auth.status === "in") void myManagedOfficials().then(setAccounts);
    try { localStorage.setItem(SEEN, new Date().toISOString()); } catch { /* ignore */ }
  }, [auth.status]);
  const replace = (p: CampusPost) => { setItems((xs) => (xs ?? []).map((x) => (x.id === p.id ? p : x))); setComments((c) => (c && c.id === p.id ? p : c)); };
  const canPost = tab === "gist" || accounts.length > 0;
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="Campus" right={canPost && auth.status === "in" ? <button onClick={() => setCompose(true)} aria-label="Post" className="flex h-10 w-10 items-center justify-center"><PenSquare size={20} /></button> : undefined} />
      <div className="flex gap-6 px-4 pb-2 text-[15px]">
        {([["update", "Updates"], ["gist", "Gist"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`pb-1 ${tab === id ? "border-b-2 border-[var(--we-accent)] font-medium text-[var(--we-text)]" : "text-[var(--we-link)]"}`}>{label}</button>
        ))}
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-10">
        {!profile.institution && <button onClick={() => setOverlay({ t: "settings" })} className="mx-3 mb-2 block w-[calc(100%-1.5rem)] rounded-[8px] bg-[#FFF6DD] px-4 py-3 text-left text-[13.5px] text-[#7a5a10]">Add your school in Settings to see your campus.</button>}
        {items === null ? <p className="py-10 text-center text-[13.5px] text-[var(--we-hint)]">Loading...</p>
          : items.length === 0 ? <p className="px-10 py-12 text-center text-[14px] leading-relaxed text-[var(--we-sub)]">{tab === "update" ? "Updates from your school, SUG and departments show here. Important ones also come to your phone." : "Nothing yet. Tap the pen to share what's happening on campus."}</p>
          : items.map((p) => <Card key={p.id} p={p} onChange={replace} onRemoved={() => setItems((xs) => (xs ?? []).filter((x) => x.id !== p.id))} onComments={() => setComments(p)} />)}
        {tab === "update" && (
          <button onClick={onArticles} className="mt-3 flex w-full items-center justify-between bg-[var(--we-cell)] px-4 py-3.5 text-left text-[15.5px] text-[var(--we-text)]">Articles from verified accounts<ChevronRight size={18} className="text-[var(--we-hint)]" /></button>
        )}
      </div>
      <Compose open={compose} kind={tab} accounts={accounts} onClose={() => setCompose(false)} onPosted={(p) => { setCompose(false); setItems((xs) => [p, ...(xs ?? [])]); }} />
      <Comments post={comments} open={!!comments} onClose={() => setComments(null)} onChange={replace} />
    </div>
  );
}
