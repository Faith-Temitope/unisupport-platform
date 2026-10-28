"use client";

// Mini Programs > Hostel & Roommates and Lost & Found: noticeboards for your school only. Any student
// can post (5 a day per board); tap Message to chat with whoever posted it.
import { MessageCircle, MoreHorizontal, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { campusFeed, deleteCampusPost, postBoard, type BoardKind, type CampusPost } from "./live/campusData";
import { reportThing } from "./live/socialData";
import { ago } from "./Moments";
import { useApp } from "./store";
import { Page } from "./ui";
import { SqAvatar, WeHeader } from "./we";

const COPY = {
  hostel: { title: "Hostel & Roommates", empty: "No hostel posts at your school yet", what: "e.g. Roommate needed, Ikole hostel", details: "Price, location, who you're looking for", tabs: null },
  lostfound: { title: "Lost & Found", empty: "Nothing lost or found yet", what: "e.g. Blue ID card", details: "Where and when, and how to describe it", tabs: [["lost", "Lost"], ["found", "Found"]] as [BoardKind, string][] },
};

function Card({ p, onRemoved }: { p: CampusPost; onRemoved: () => void }) {
  const { flash, setOverlay, openDm } = useApp();
  const [menu, setMenu] = useState(false);
  const who = p.author?.name ?? "Student";
  return (
    <div className="border-b border-[var(--we-sep)] bg-[var(--we-cell)] px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <SqAvatar name={who} color={p.author?.color} size={36} onClick={() => p.author && setOverlay({ t: "contact", id: p.author.id })} />
        <span className="min-w-0 flex-1"><span className="block truncate text-[15px] text-[var(--we-link)]">{who}</span><span className="block text-[12px] text-[var(--we-hint)]">{ago(p.created_at)}</span></span>
        <button onClick={() => setMenu((m) => !m)} aria-label="More" className="relative text-[var(--we-hint)]"><MoreHorizontal size={20} />
          {menu && (
            <span className="absolute right-0 top-6 z-10 w-36 overflow-hidden rounded-[6px] bg-[var(--we-pop)] text-left text-[14px] text-white shadow-xl">
              {p.mine ? <span role="button" onClick={async () => { setMenu(false); if (!confirm("Delete this post?")) return; await deleteCampusPost(p.id); onRemoved(); }} className="block px-4 py-2.5">{p.kind === "hostel" ? "Delete" : "Sorted, delete it"}</span>
                : <span role="button" onClick={async () => { setMenu(false); const r = prompt("What's wrong with this post?"); if (r === null) return; const e = await reportThing("campus", p.id, r || undefined); flash(e ?? "Thanks. The Birdie team will look at it."); }} className="block px-4 py-2.5">Report</span>}
            </span>
          )}
        </button>
      </div>
      {p.title && <div className="mt-2 text-[16.5px] font-semibold leading-snug text-[var(--we-text)]">{p.title}</div>}
      {p.body && p.body !== p.title && <p className="mt-1 whitespace-pre-line break-words text-[15px] leading-snug text-[var(--we-text)]">{p.body}</p>}
      {!p.mine && p.author && (
        <button onClick={() => void openDm(p.author!.id)} className="mt-2.5 flex items-center gap-1.5 rounded-[4px] bg-[var(--we-bg)] px-3 py-1.5 text-[14px] text-[var(--we-text)] active:opacity-70"><MessageCircle size={16} /> Message</button>
      )}
    </div>
  );
}

export function Board({ board, onBack }: { board: "hostel" | "lostfound"; onBack: () => void }) {
  const { flash, auth, setAuthOpen, profile } = useApp();
  const c = COPY[board];
  const [kind, setKind] = useState<BoardKind>(board === "hostel" ? "hostel" : "lost");
  const [list, setList] = useState<CampusPost[] | null>(null);
  const [compose, setCompose] = useState(false);
  const [f, setF] = useState({ title: "", body: "", kind: kind });
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { void campusFeed(kind).then(setList); }, [kind]);
  useEffect(() => { void Promise.resolve().then(() => { setList(null); load(); }); }, [load]);

  async function post() {
    setBusy(true); const r = await postBoard(f.kind, f.title.trim(), f.body.trim()); setBusy(false);
    if (r.error) return flash(r.error === "no_school" ? "Add your school in Settings first" : r.error === "slow_down" ? "That's 5 posts today on this board. Try tomorrow." : r.error === "title_needed" ? "Add a title" : "Couldn't post it");
    setCompose(false); setF((x) => ({ ...x, title: "", body: "" })); flash("Posted for your school");
    if (f.kind !== kind) setKind(f.kind); else load();
  }
  function open() {
    if (auth.status !== "in") return setAuthOpen(true);
    setF({ title: "", body: "", kind }); setCompose(true);
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title={c.title} right={<button onClick={open} aria-label="New post" className="flex h-10 w-10 items-center justify-center"><span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.6px] border-current"><Plus size={15} strokeWidth={2.2} /></span></button>} />
      {c.tabs && (
        <div className="flex justify-center gap-10 bg-[var(--we-bg)] pb-2 text-[15.5px]">
          {c.tabs.map(([id, label]) => <button key={id} onClick={() => setKind(id)} className={`pb-1 ${kind === id ? "border-b-2 border-[var(--we-accent)] font-medium text-[var(--we-text)]" : "text-[var(--we-sub)]"}`}>{label}</button>)}
        </div>
      )}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-10">
        {list === null ? <p className="py-12 text-center text-[14px] text-[var(--we-sub)]">Loading...</p>
          : list.length === 0 ? (
            <div className="px-10 py-16 text-center">
              <p className="text-[15px] text-[var(--we-sub)]">{!profile.institution ? "Add your school in Settings to see your school's board" : board === "lostfound" ? `Nothing ${kind} yet` : c.empty}</p>
              {profile.institution && <button onClick={open} className="mt-4 rounded-[6px] bg-[var(--we-accent)] px-6 py-2 text-[15px] font-medium text-white">Post</button>}
            </div>
          ) : list.map((p) => <Card key={p.id} p={p} onRemoved={() => setList((l) => l?.filter((x) => x.id !== p.id) ?? null)} />)}
      </div>
      <Page open={compose} onClose={() => setCompose(false)} title={board === "hostel" ? "Hostel Post" : f.kind === "lost" ? "I Lost Something" : "I Found Something"}
        right={<button disabled={busy || f.title.trim().length < 2} onClick={() => void post()} className="mr-2 rounded-[4px] bg-[var(--we-accent)] px-3 py-1.5 text-[14px] font-medium text-white disabled:opacity-40">Post</button>}>
        {c.tabs && (
          <div className="mx-4 mt-2 grid grid-cols-2 overflow-hidden rounded-[6px] bg-[var(--we-cell)] text-center text-[15px]">
            {c.tabs.map(([id, label]) => <button key={id} onClick={() => setF((x) => ({ ...x, kind: id }))} className={`py-2.5 ${f.kind === id ? "bg-[var(--we-accent)] font-medium text-white" : "text-[var(--we-text)]"}`}>{label}</button>)}
          </div>
        )}
        <div className="mt-2 bg-[var(--we-cell)]">
          <input autoFocus value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value.slice(0, 140) }))} placeholder={c.what} className="w-full border-b border-[var(--we-sep)] bg-transparent px-4 py-3.5 text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
          <textarea value={f.body} onChange={(e) => setF((x) => ({ ...x, body: e.target.value.slice(0, 2000) }))} placeholder={c.details} rows={6} className="w-full resize-none bg-transparent px-4 py-3 text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
        </div>
        <p className="px-4 pt-2 text-[13px] text-[var(--we-sub)]">Only students at {profile.institution || "your school"} see this.</p>
      </Page>
    </div>
  );
}
