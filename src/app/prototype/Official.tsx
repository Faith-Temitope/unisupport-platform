"use client";

// Verified accounts (WeChat's official accounts): companies with SIWES and internships, the SUG,
// departments and school bodies. Students chat with them, read their articles and videos, and use
// their menu. An account can only message you within 7 days of you writing to it.
import { ApplyVerifiedPage } from "./Verify";
import { shareToMoments } from "./Moments";
import { MomentsIcon } from "./we";
import type { MomentLink } from "./live/chatData";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, ChevronRight, ExternalLink, Eye, Keyboard, Menu as MenuIcon, Search, Send, Settings2, UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Rich } from "./Rich";
import { whileVisible } from "./perf";
import { clock, followOfficial, oaChat, oaMenuTap, oaPost, oaSend, officialProfile, searchOfficials, type OAccount, type OAMsg, type OAPostCard, type OAProfile, type OMenu } from "./live/chatData";
import { useApp } from "./store";
import { Empty, Segmented, Sheet, scrollToEnd } from "./ui";

export const CATEGORY_LABEL: Record<string, string> = { company: "Company", school: "School", sug: "Students' Union", department: "Department", organisation: "Organisation", government: "Government", unisupport: "Birdie" };

export function OALogo({ a, size = 44 }: { a: Pick<OAccount, "name" | "logo_url" | "color">; size?: number }) {
  return a.logo_url
    ? <img src={a.logo_url} alt="" className="shrink-0 rounded-xl object-cover" style={{ width: size, height: size }} />
    : <div className="disp flex shrink-0 items-center justify-center rounded-xl font-bold text-white" style={{ width: size, height: size, background: a.color, fontSize: size * 0.34 }}>{a.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase()}</div>;
}
export const Tick = ({ size = 14 }: { size?: number }) => <BadgeCheck size={size} className="shrink-0 fill-[#4C8DF6] text-white" aria-label="Verified" />;

function Head({ title, onBack, right }: { title: React.ReactNode; onBack: () => void; right?: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line)] px-3 pb-2.5 pt-2">
      <button onClick={onBack} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-xl active:bg-[var(--paper-dim)]"><ArrowLeft size={19} /></button>
      <div className="min-w-0 flex-1 text-center">{title}</div>
      <div className="flex w-9 justify-end">{right}</div>
    </div>
  );
}

function ArticleCard({ meta, onOpen }: { meta: Record<string, unknown>; onOpen: (id: string) => void }) {
  return (
    <button onClick={() => onOpen(String(meta.id))} className="block w-full max-w-[290px] overflow-hidden rounded-2xl bg-white text-left shadow-sm">
      {meta.cover_url ? <img src={String(meta.cover_url)} alt="" className="h-36 w-full object-cover" /> : null}
      <div className="px-3.5 py-2.5"><div className="line-clamp-2 text-[14.5px] font-bold leading-snug">{String(meta.title ?? "")}</div>{meta.summary ? <div className="mt-0.5 line-clamp-2 text-[12.5px] text-[var(--dim)]">{String(meta.summary)}</div> : null}</div>
    </button>
  );
}

/** Opening a menu link: inside the app if it's ours, otherwise a new tab. */
function openLink(url: string) { window.open(url, "_blank", "noopener"); }

export function OAChat({ id, onBack, onProfile, onPost }: { id: string; onBack: () => void; onProfile: (key: string) => void; onPost: (id: string) => void }) {
  const { flash } = useApp();
  const [acct, setAcct] = useState<OAccount | null>(null);
  const [msgs, setMsgs] = useState<OAMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const apply = (d: { account: OAccount; messages: OAMsg[] } | null) => { if (d) { setAcct(d.account); setMsgs(d.messages); } };
  const load = useCallback(async () => { const r = await oaChat(id); apply(r.data); }, [id]);
  useEffect(() => { void Promise.resolve().then(load); const t = setInterval(whileVisible(() => void load()), 8000); return () => clearInterval(t); }, [load]);
  useEffect(() => { scrollToEnd(end.current); }, [msgs.length]);
  const menu: OMenu[] = acct?.menu ?? [];
  useEffect(() => { if (acct && menu.length === 0) void Promise.resolve().then(() => setTyping(true)); }, [acct, menu.length]);

  async function send() {
    const t = draft.trim(); if (!t) return;
    setDraft("");
    const r = await oaSend(id, t);
    if (r.error) { setDraft(t); flash(r.error === "slow_down" ? "Slow down a little" : "Couldn't send"); return; }
    apply(r.data);
  }
  async function tap(it: { label: string; kind?: string; value?: string }) {
    setOpenMenu(null);
    if (it.kind === "link" && it.value) { openLink(it.value); return; }
    const r = await oaMenuTap(id, it.label);
    if (r.error) flash("Couldn't load that"); else apply(r.data);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--paper)]">
      <Head onBack={onBack} title={<span className="inline-flex max-w-full items-center gap-1 text-[15.5px] font-bold"><span className="truncate">{acct?.name ?? ""}</span><Tick /></span>}
        right={<button onClick={() => acct && onProfile(acct.handle)} aria-label="Account profile" className="flex h-9 w-9 items-center justify-center rounded-xl active:bg-[var(--paper-dim)]"><UserRound size={18} /></button>} />
      <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#EFE8F4] px-3 py-3" onClick={() => setOpenMenu(null)}>
        {msgs.length === 0 && acct && <div className="pt-14 text-center text-[13px] text-[var(--dim)]">Write to {acct.name}. They can reply to you for 7 days after you message them.</div>}
        {msgs.map((m, i) => {
          const showTime = !msgs[i - 1] || new Date(m.created_at).getTime() - new Date(msgs[i - 1].created_at).getTime() > 5 * 60_000;
          return (
            <div key={m.id}>
              {showTime && <div className="pb-1.5 text-center text-[11px] text-[#8a7fa0]">{clock(m.created_at)}</div>}
              {m.kind === "article" ? (
                <div className="flex gap-2">{acct && <OALogo a={acct} size={36} />}<ArticleCard meta={m.meta} onOpen={onPost} /></div>
              ) : (
                <div className={`flex items-start gap-2 ${m.from_oa ? "" : "flex-row-reverse"}`}>
                  {m.from_oa && acct && <OALogo a={acct} size={36} />}
                  <div className={`max-w-[76%] rounded-2xl px-3 py-2 text-[14.5px] leading-snug shadow-sm ${m.from_oa ? "rounded-tl-md bg-white" : "rounded-tr-md bg-[#D9B8EC]"}`}><Rich text={m.body} /></div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <div className="relative shrink-0 border-t border-[var(--line)] bg-[var(--paper)]">
        <AnimatePresence>
          {openMenu !== null && menu[openMenu]?.items?.length ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-full z-10 mb-1 min-w-[150px] overflow-hidden rounded-xl bg-[var(--ink)] text-[13.5px] text-[var(--paper)] shadow-xl"
              style={{ left: `calc(${(100 / menu.length) * openMenu}% + 40px)` }}>
              {menu[openMenu].items!.map((it) => <button key={it.label} onClick={() => void tap(it)} className="block w-full border-b border-white/10 px-4 py-3 text-left last:border-0">{it.label}</button>)}
            </motion.div>
          ) : null}
        </AnimatePresence>
        {typing || menu.length === 0 ? (
          <div className="flex items-end gap-2 px-3 pb-3 pt-2.5">
            {menu.length > 0 && <button onClick={() => setTyping(false)} aria-label="Menu" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--line)]"><MenuIcon size={18} /></button>}
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} rows={1} placeholder={`Message ${acct?.name ?? ""}`} className="max-h-28 min-h-10 min-w-0 flex-1 resize-none rounded-xl bg-[var(--paper-dim)] px-3.5 py-2.5 text-[14.5px] outline-none" />
            <button onClick={() => void send()} disabled={!draft.trim()} aria-label="Send" className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-[var(--uni)] px-3.5 text-white disabled:opacity-40"><Send size={16} /></button>
          </div>
        ) : (
          <div className="flex items-stretch">
            <button onClick={() => setTyping(true)} aria-label="Type a message" className="flex w-12 shrink-0 items-center justify-center border-r border-[var(--line)] py-3.5"><Keyboard size={19} /></button>
            {menu.map((g, i) => (
              <button key={g.label} onClick={(e) => { e.stopPropagation(); if (g.items?.length) setOpenMenu(openMenu === i ? null : i); else void tap(g); }} className="flex min-w-0 flex-1 items-center justify-center gap-1 border-r border-[var(--line)] px-1 py-3.5 text-[13.5px] font-semibold last:border-0">
                {g.items?.length ? <MenuIcon size={12} className="shrink-0 text-[var(--dim)]" /> : null}<span className="truncate">{g.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function OAProfileView({ keyOrId, onBack, onChat, onPost, onManage }: { keyOrId: string; onBack: () => void; onChat: (id: string) => void; onPost: (id: string) => void; onManage: (id: string) => void }) {
  const { flash } = useApp();
  const [p, setP] = useState<OAProfile | null | undefined>(undefined);
  const [tab, setTab] = useState<"articles" | "videos" | "services">("articles");
  const [aboutOpen, setAboutOpen] = useState(false);
  const load = useCallback(() => officialProfile(keyOrId).then(setP), [keyOrId]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  if (p === undefined) return <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--dim)]">Loading...</div>;
  if (p === null) return <div className="flex flex-1 flex-col"><Head onBack={onBack} title="" /><Empty title="Account not found" text="It may have been renamed or suspended." /></div>;
  const articles = p.posts.filter((x) => x.kind === "article"), videos = p.posts.filter((x) => x.kind === "video");
  async function follow() {
    const r = await followOfficial(p!.id, !p!.following);
    if (r.error) return flash("Couldn't update");
    flash(p!.following ? "Unfollowed" : `Following ${p!.name}`); void load();
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--paper)]">
      <Head onBack={onBack} title="" right={p.my_role ? <button onClick={() => onManage(p.id)} aria-label="Manage account" className="flex h-9 w-9 items-center justify-center rounded-xl active:bg-[var(--paper-dim)]"><Settings2 size={18} /></button> : undefined} />
      <div className="no-scrollbar flex-1 overflow-y-auto">
        <div className="px-5 pb-4 pt-2">
          <div className="flex items-center gap-3.5"><OALogo a={p} size={64} />
            <div className="min-w-0"><div className="flex items-center gap-1.5 text-[19px] font-bold leading-tight"><span className="truncate">{p.name}</span><Tick size={17} /></div>
              <div className="text-[12.5px] text-[var(--dim)]">{CATEGORY_LABEL[p.category] ?? "Verified"}{p.school ? ` · ${p.school}` : ""}</div></div></div>
          {p.about && <button onClick={() => setAboutOpen(true)} className="mt-3 flex w-full items-start gap-1 text-left text-[13.5px] leading-snug text-[var(--dim)]"><span className="line-clamp-2 flex-1">{p.about}</span><ChevronRight size={15} className="mt-0.5 shrink-0" /></button>}
          <div className="mt-2 text-[12.5px] text-[var(--dim)]">{p.posts.length} post{p.posts.length === 1 ? "" : "s"} · {p.followers} follower{p.followers === 1 ? "" : "s"}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => void follow()} className={`rounded-xl py-2.5 text-[14px] font-semibold active:scale-95 ${p.following ? "bg-[var(--paper-dim)]" : "bg-[var(--ink)] text-[var(--paper)]"}`}>{p.following ? "Following" : "Follow"}</button>
            <button onClick={() => onChat(p.id)} className="rounded-xl bg-[var(--paper-dim)] py-2.5 text-[14px] font-semibold active:scale-95">Messages</button>
          </div>
        </div>
        <div className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--paper)] px-5 py-2"><Segmented value={tab} onChange={setTab} options={[{ id: "articles", label: "Articles" }, { id: "videos", label: "Videos" }, { id: "services", label: "Services" }]} /></div>
        <div className="px-5 py-3">
          {tab === "articles" && (articles.length === 0 ? <p className="py-8 text-center text-[13px] text-[var(--dim)]">No articles yet.</p> : (
            <div className="space-y-2">{articles.map((a) => <PostRow key={a.id} p={a} onOpen={onPost} />)}</div>))}
          {tab === "videos" && (videos.length === 0 ? <p className="py-8 text-center text-[13px] text-[var(--dim)]">No videos yet.</p> : (
            <div className="grid grid-cols-3 gap-1.5">{videos.map((v) => (
              <button key={v.id} onClick={() => onPost(v.id)} className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[var(--ink)]">
                {v.cover_url ? <img src={v.cover_url} alt="" className="h-full w-full object-cover" /> : <video src={v.video_url ?? undefined} muted preload="metadata" className="h-full w-full object-cover" />}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 text-left text-[11px] font-semibold text-white line-clamp-2">{v.title}</span>
              </button>
            ))}</div>))}
          {tab === "services" && (p.menu.length === 0 ? <p className="py-8 text-center text-[13px] text-[var(--dim)]">No services listed.</p> : (
            <div className="space-y-4">{p.menu.map((g) => (
              <div key={g.label}>
                <div className="mb-1.5 text-[13px] font-bold">{g.label}</div>
                {(g.items?.length ? g.items : [{ label: g.label, kind: g.kind ?? "reply", value: g.value ?? "" }]).map((it) => (
                  <button key={it.label} onClick={() => (it.kind === "link" ? openLink(it.value) : onChat(p.id))} className="mb-1.5 mr-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--paper-dim)] px-3 py-1.5 text-[12.5px] font-semibold">{it.label}{it.kind === "link" && <ExternalLink size={11} />}</button>
                ))}
              </div>
            ))}</div>))}
        </div>
      </div>
      <Sheet open={aboutOpen} onClose={() => setAboutOpen(false)} title={p.name}><p className="whitespace-pre-line text-[14px] leading-relaxed text-[var(--dim)]">{p.about}</p></Sheet>
    </div>
  );
}

function PostRow({ p, onOpen }: { p: OAPostCard; onOpen: (id: string) => void }) {
  return (
    <button onClick={() => onOpen(p.id)} className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-3 text-left active:scale-[0.99]">
      <div className="min-w-0 flex-1"><div className="line-clamp-2 text-[14px] font-bold leading-snug">{p.title}</div><div className="mt-1 text-[11.5px] text-[var(--dim)]">{new Date(p.created_at).toLocaleDateString([], { day: "numeric", month: "short" })} · {p.views} read{p.views === 1 ? "" : "s"}</div></div>
      {p.cover_url && <img src={p.cover_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
    </button>
  );
}

export function OAPostView({ id, onBack, onProfile }: { id: string; onBack: () => void; onProfile: (key: string) => void }) {
  const [p, setP] = useState<Awaited<ReturnType<typeof oaPost>> | undefined>(undefined);
  useEffect(() => { void oaPost(id).then(setP); }, [id]);
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--paper)]">
      <Head onBack={onBack} title={p ? <span className="text-[14px] font-semibold text-[var(--dim)]">{p.account.name}</span> : ""} />
      {p === undefined ? <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--dim)]">Loading...</div> : p === null ? <Empty title="This post was removed" text="The account may have taken it down." /> : (
        <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-10 pt-4">
          <h1 className="disp text-[22px] font-bold leading-tight">{p.title}</h1>
          <button onClick={() => onProfile(p.account.handle)} className="mt-2 flex items-center gap-2 text-[13px]"><OALogo a={p.account} size={24} /><span className="font-semibold text-[#4C6EF5]">{p.account.name}</span><Tick size={13} /><span className="text-[var(--dim)]">{new Date(p.created_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}</span></button>
          {p.kind === "video" && p.video_url ? <video src={p.video_url} controls playsInline className="mt-4 w-full rounded-2xl bg-black" poster={p.cover_url ?? undefined} />
            : p.cover_url ? <img src={p.cover_url} alt="" className="mt-4 w-full rounded-2xl" /> : null}
          {p.summary && <p className="mt-4 text-[14.5px] font-semibold leading-relaxed text-[var(--dim)]">{p.summary}</p>}
          {p.body && <div className="mt-3 text-[15px] leading-relaxed"><Rich text={p.body} /></div>}
          {p.link_url && <a href={p.link_url} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] py-3.5 text-[14.5px] font-semibold text-[var(--paper)]">Open link <ExternalLink size={15} /></a>}
          <div className="mt-6 flex items-center gap-1.5 text-[12px] text-[var(--dim)]"><Eye size={13} /> {p.views} read{p.views === 1 ? "" : "s"}
            <ShareToMomentsBtn link={{ url: `${typeof window === "undefined" ? "" : window.location.origin}/prototype?oa_post=${p.id}`, title: p.title, thumb: p.cover_url && /^https?:/.test(p.cover_url) ? p.cover_url : null, source: p.account.name }} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Find verified accounts (SUG, departments, companies with SIWES) and apply for one. */
export function VerifiedDirectory({ onBack, onProfile }: { onBack: () => void; onProfile: (key: string) => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof searchOfficials>> | null>(null);
  const [apply, setApply] = useState(false);
  useEffect(() => { const t = setTimeout(() => void searchOfficials(q).then(setRows), q ? 300 : 0); return () => clearTimeout(t); }, [q]);
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--paper)]">
      <Head onBack={onBack} title={<span className="text-[15.5px] font-bold">Verified accounts</span>} />
      <div className="px-4 pt-3"><div className="flex items-center gap-2 rounded-xl bg-[var(--paper-dim)] px-3.5 py-2.5"><Search size={16} className="text-[var(--dim)]" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="SUG, departments, companies..." className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" /></div></div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-3">
        {rows === null ? <p className="py-6 text-center text-[13px] text-[var(--dim)]">Loading...</p> : rows.length === 0 ? <Empty icon={<BadgeCheck size={20} />} title={q ? "No account matches" : "No verified accounts yet"} text="Student unions, departments and companies offering SIWES and internships will show up here." /> : (
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">{rows.map((a) => (
            <button key={a.id} onClick={() => onProfile(a.handle)} className="flex w-full items-center gap-3 border-b border-[var(--line)] p-3 text-left last:border-0 active:bg-[var(--paper-dim)]">
              <OALogo a={a} size={44} />
              <div className="min-w-0 flex-1"><div className="flex items-center gap-1 text-[14.5px] font-semibold"><span className="truncate">{a.name}</span><Tick /></div><div className="truncate text-[12px] text-[var(--dim)]">{CATEGORY_LABEL[a.category]}{a.school ? ` · ${a.school}` : ""} · {a.followers} follower{a.followers === 1 ? "" : "s"}</div></div>
              {a.following && <span className="text-[11.5px] font-semibold text-[var(--dim)]">Following</span>}
            </button>
          ))}</div>)}
        <button onClick={() => setApply(true)} className="mt-4 w-full rounded-2xl border border-dashed border-[var(--line)] p-4 text-left">
          <div className="text-[14px] font-bold">Run a company, SUG or department?</div>
          <div className="mt-0.5 text-[12.5px] leading-snug text-[var(--dim)]">Get a verified account: chat with students, auto-replies, a menu, and articles and videos they can follow.</div>
        </button>
      </div>
      <ApplyVerifiedSheet open={apply} onClose={() => setApply(false)} />
    </div>
  );
}

// The request form lives in Verify.tsx (documents, a selfie and the declaration).
export const ApplyVerifiedSheet = ApplyVerifiedPage;

/** "Share to Moments" for an article: opens the Moments composer with it attached. */
function ShareToMomentsBtn({ link }: { link: MomentLink }) {
  const { setTab, setDiscoverView, setOverlay } = useApp();
  return <button onClick={() => shareToMoments(link, { setTab, setDiscoverView, setOverlay })} className="ml-auto flex items-center gap-1.5 rounded-full bg-[var(--paper-dim)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text)]"><MomentsIcon size={16} /> Share to Moments</button>;
}
