"use client";

import { useViewState } from "./persist";
import { BadgeCheck, BookmarkPlus, Search, Send, Users } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { FeedAd, usePlacements } from "./Sponsored";
import { CampusDeals } from "./CampusDeals";
import { CertStrip } from "./Certificates";
import { topInterests } from "./engine";
import { logPostEvent } from "./live/recData";
import PostCard, { initials } from "./PostCard";
import { firstName, naira, nowTime, useApp, type SharedCourse } from "./store";
import { Avatar, Btn, DemoControls, Empty, Label, Segmented, Sheet } from "./ui";
import { ShareCourseForm } from "./ShareCourseForm";

export default function Explore({ active }: { active: boolean }) {
  const { posts, courses, chats, settings, following, blocked, shared, setOverlay, setTab, goStudy, joinShared, leaveShared, sendShared, loadSharedDetail, personById, profile, flash, setWalletOpen, refreshFeed, loadMoreFeed, searchFeed, sharedIntent, clearSharedIntent, forYou, loadForYou, topics, refreshTopics } = useApp();
  const [buying, setBuying] = useState(false);
  async function join(s: SharedCourse) {
    setBuying(true);
    const r = await joinShared(s.id);
    setBuying(false);
    if (!r.error) return flash(s.priceNgn ? `Unlocked. ${s.code} is in your Study` : "Added to your Study");
    if (r.error === "insufficient_funds") { flash(`Top up first. This course is ${naira(s.priceNgn ?? 0)}`); setWalletOpen(true); return; }
    if (r.error === "sign_in_required") return flash("Sign in to add shared courses");
    if (r.error === "not_available_to_you") return flash("This course is only open to students from a certain country, region or school");
    flash("Couldn't add that course. Try again.");
  }
  const [seg, setSeg] = useViewState<"feed" | "courses" | "deals">("explore.seg", "feed");
  const campus = usePlacements("campus", undefined, seg === "deals");
  const deals = usePlacements("deal", undefined, seg === "deals");
  const feedCards = usePlacements("card", "explore", active);
  const [q, setQ] = useState("");
  const [tag, setTag] = useViewState("explore.tag", "For you");
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

  // Fresh posts each time Explore is opened; a course tapped on someone's channel opens here.
  useEffect(() => { if (active) { void refreshFeed(); void loadForYou(true); void refreshTopics(); } }, [active, refreshFeed, loadForYou, refreshTopics]);
  // Search and subject tags ask the server too, so they find posts beyond the pages loaded so far.
  useEffect(() => {
    const term = q.trim() || (tag !== "For you" && tag !== "Following" ? tag : "");
    if (!active || term.length < 2) return;
    // Searches and topic taps also teach the For you ranking what you're into.
    const t = setTimeout(() => { void searchFeed(term); void logPostEvent(null, "search", { term }); }, 700);
    return () => clearTimeout(t);
  }, [active, q, tag, searchFeed]);
  // Header and bottom nav hide on scroll down, return on scroll up.
  const scroller = useRef<HTMLDivElement>(null);
  const { barsHidden: hideHead, setBarsHidden: setHideHead } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const lastY = useRef(0);
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    if (y > lastY.current + 8 && y > 90) setHideHead(true);
    else if (y < lastY.current - 8 || y < 40) setHideHead(false);
    lastY.current = y;
  };
  // Endless feed: the next page loads when the bottom of the list scrolls into view.
  const sentinel = useRef<HTMLDivElement>(null);
  const [feedEnd, setFeedEnd] = useState(false);
  const loadingMore = useRef(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || seg !== "feed" || feedEnd) return;
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting) || loadingMore.current) return;
      loadingMore.current = true;
      const ranked = tag === "For you" && !q.trim() && forYou.length > 0;
      void (ranked ? loadForYou(false).then((n) => (n ? n : loadMoreFeed())) : loadMoreFeed()).then((n) => { loadingMore.current = false; if (n === 0) setFeedEnd(true); });
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seg, feedEnd, loadMoreFeed, loadForYou, forYou.length, tag, q, posts.length]);
  useEffect(() => {
    if (!sharedIntent) return;
    setSeg("courses"); setDetail(sharedIntent); clearSharedIntent(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [sharedIntent, clearSharedIntent]);

  // Topic chips: what you watch, like and search most, then the biggest topics on Birdie.
  // Until the server has topics, fall back to what you study and chat about with Birdie.
  const interests = useMemo(() => topInterests(chats, courses), [chats, courses]);
  const tags = useMemo(() => {
    const t = ["For you", "Following"];
    if (topics.length) t.push(...topics.filter((x) => settings.personalTags || !x.mine).map((x) => x.topic));
    else if (settings.personalTags) t.push(...interests); else t.push(...Array.from(new Set(posts.map((p) => p.field))).slice(0, 6));
    return t;
  }, [topics, interests, posts, settings.personalTags]);

  const feed = useMemo(() => {
    const term = q.trim().toLowerCase();
    const has = (p: (typeof posts)[number], s: string) => `${p.title} ${p.field} ${p.tags.join(" ")} ${p.body ?? ""}`.toLowerCase().includes(s);
    let list = posts.filter((p) => !blocked.includes(p.authorId) && (!term || has(p, term)) && (tag === "For you" || (tag === "Following" ? following.includes(p.authorId) : has(p, tag.toLowerCase()))));
    if (tag === "For you" && !term && forYou.length) {
      // Birdie's ranking first, then anything newer that hasn't been ranked yet.
      const rank = new Map(forYou.map((r, i) => [r.id, i]));
      list = [...list].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) || b.createdAt - a.createdAt);
    } else if (tag === "For you" && settings.personalTags && interests.length) list = [...list].sort((a, b) => Number(interests.some((i) => has(b, i))) - Number(interests.some((i) => has(a, i))) || b.createdAt - a.createdAt);
    else list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [posts, q, tag, following, blocked, interests, settings.personalTags, forYou]);

  const filteredShared = shared.filter((s) => !q.trim() || `${s.code} ${s.name} ${s.field}`.toLowerCase().includes(q.trim().toLowerCase()));
  const sel = shared.find((s) => s.id === detail) ?? null;

  const chip = (on: boolean) => `shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition active:scale-95 ${on ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-dim)] text-[var(--text)]"}`;

  return (
    <div className="flex h-full flex-col">
      <div ref={scroller} onScroll={onScroll} className="no-scrollbar relative flex-1 overflow-y-auto pb-32">
        {/* Header slides away while scrolling down and returns on the way up, so videos get the screen. */}
        <div className={`sticky top-0 z-20 bg-[var(--paper)] pb-2 transition-transform duration-200 ${hideHead ? "-translate-y-full" : ""}`}>
          <div className="flex items-center gap-2 px-4 pt-2">
            <h2 className="disp flex-1 text-[21px] font-bold text-[var(--text)]">Explore</h2>
            <button onClick={() => setSearchOpen((o) => !o)} aria-label="Search" className="flex h-9 w-9 items-center justify-center rounded-full active:bg-[var(--paper-dim)]"><Search size={19} /></button>
            <button onClick={() => setOverlay({ t: "profile", id: "me" })} aria-label="My channel" className="active:scale-95"><Avatar initials={initials(profile.name || "Me")} color="#A63FBD" size={30} /></button>
          </div>
          {(searchOpen || q) && <div className="mx-4 mt-2 flex items-center gap-2 rounded-full bg-[var(--paper-dim)] px-3.5 py-2.5"><Search size={15} className="text-[var(--dim)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search videos, posts, courses..." className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#a99fb8]" />{q && <button onClick={() => { setQ(""); setSearchOpen(false); }} className="text-[12px] font-semibold text-[var(--dim)]">Clear</button>}</div>}
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-4">
            {([["feed", "Videos"], ["courses", "Courses"], ["deals", "Campus & deals"]] as const).map(([id, label]) => (<button key={id} onClick={() => setSeg(id)} className={chip(seg === id)}>{label}</button>))}
            {seg === "feed" && <span className="my-1 w-px shrink-0 bg-[var(--line)]" />}
            {seg === "feed" && tags.map((t) => (<button key={t} onClick={() => setTag(t)} className={`${chip(tag === t)} capitalize`}>{t}</button>))}
          </div>
        </div>

        <div className="px-5 pt-1">
        {seg === "feed" ? (
          feed.length === 0 ? (
            <Empty icon={<Search size={20} />} title={posts.length === 0 ? "Nothing here yet" : "No matches"} text={posts.length === 0 ? "Follow creators and watch what other students post, or share something yourself. Tap the mascot and choose Post." : tag === "Following" ? "Follow a creator to see their posts here." : "Try another tag or search term."} action={<Btn variant="study" onClick={() => setOverlay({ t: "post" })}>Post something</Btn>} />
          ) : (
            <div className="-mx-5 space-y-5">{feed.map((p, i) => (<Fragment key={p.id}>
              <PostCard post={p} edge onProfile={(id) => setOverlay({ t: "profile", id })} />
              {feedCards.length > 0 && (i === 3 || (i > 3 && (i - 3) % 8 === 0)) && <FeedAd p={feedCards[Math.floor((i - 3) / 8) % feedCards.length]} edge />}
            </Fragment>))}
              <div ref={sentinel} className="py-4 text-center text-[12px] text-[var(--dim)]">{feedEnd ? "You're all caught up" : "Loading more..."}</div>
            </div>
          )
        ) : seg === "deals" ? (
          <CampusDeals campus={campus} deals={deals} />
        ) : (
          <div className="space-y-3">
            <CertStrip active={active && seg === "courses"} />
            <Btn variant="ghost" onClick={() => (courses.length ? setShareOpen(true) : flash("Create a course in Study first"))}>Share one of my courses</Btn>
            {filteredShared.length === 0 ? <Empty icon={<Users size={20} />} title="No shared courses yet" text="Students share their course libraries here. Add one to your Study and chat with everyone in it." /> : filteredShared.map((s) => {
              const joined = s.members.includes("me") || s.ownerId === "me";
              return (
                <button key={s.id} onClick={() => setDetail(s.id)} className="w-full rounded-2xl border border-[var(--line)] bg-white p-3.5 text-left active:scale-[0.98]">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[14.5px] font-bold text-[var(--text)]">{s.code} · {s.name}</div><div className="mt-0.5 text-[12px] text-[var(--dim)]">{s.school ? `${s.school} · ` : ""}shared by {s.ownerName || (s.ownerId === "me" ? profile.name || "you" : personById(s.ownerId)?.name)}</div></div>{joined ? <BadgeCheck size={18} className="shrink-0 text-[var(--uni)]" /> : <PriceTag price={s.priceNgn} />}</div>
                  <div className="mt-2.5 flex gap-4 text-[12px] font-semibold text-[var(--dim)]"><span className="flex items-center gap-1"><Users size={13} /> {s.members.length}</span><span>{contentsLabel(s)}</span><span>{s.messages.length} messages</span></div>
                </button>
              );
            })}
          </div>
        )}
        </div>
      </div>

      <Sheet open={!!sel} onClose={() => setDetail(null)} title={sel ? `${sel.code} · ${sel.name}` : ""}>
        {sel && <SharedDetail s={sel} buying={buying} onJoin={() => void join(sel)} onOpen={() => { const c = courses.find((x) => x.sharedId === sel.id); setDetail(null); if (c) goStudy({ courseId: c.id }); else setTab("study"); }} onLeave={() => { leaveShared(sel.id); flash("Left the course chat"); }} onSend={(t) => sendShared(sel.id, t)} onProfile={(id) => { setDetail(null); setOverlay({ t: "profile", id }); }} me={firstName(profile)} personName={(id) => (id === "me" ? "You" : personById(id)?.name ?? "Someone")} />}
      </Sheet>

      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} />

      <DemoControls active={active} title="Explore: how it works">
        <ul className="list-disc space-y-1.5 pl-4 text-[12.5px] leading-snug text-[var(--text)]"><li>Tap a video to watch it, with more on the same subject underneath</li><li>Tags come from your courses and your Birdie chats</li><li>Tap a creator&apos;s avatar to view and follow them</li><li>Inside a shared course, use its Chat tab to talk to everyone in it</li><li>Tap the mascot and choose Post to upload a video or write a post</li></ul>
      </DemoControls>
    </div>
  );
}

function PriceTag({ price }: { price?: number }) {
  return price ? <span className="shrink-0 rounded-full bg-[var(--ink)] px-2.5 py-1 text-[11.5px] font-bold text-[var(--paper)]">{naira(price)}</span> : <span className="shrink-0 rounded-full bg-[var(--study-soft)] px-2.5 py-1 text-[11.5px] font-bold text-[var(--study)]">Free</span>;
}
function contentsLabel(s: SharedCourse) {
  const c = s.itemCounts;
  if (!c) return `${s.files.length} files`;
  const parts = [c.notes && `${c.notes} note${c.notes === 1 ? "" : "s"}`, c.files && `${c.files} file${c.files === 1 ? "" : "s"}`, c.recs && `${c.recs} recording${c.recs === 1 ? "" : "s"}`].filter(Boolean);
  return parts.length ? parts.join(", ") : "Nothing shared yet";
}

function SharedDetail({ s, buying, onJoin, onOpen, onLeave, onSend, onProfile, personName }: { s: SharedCourse; buying: boolean; onJoin: () => void; onOpen: () => void; onLeave: () => void; onSend: (t: string) => void; onProfile: (id: string) => void; me: string; personName: (id: string) => string }) {
  const [tab, setTab] = useState<"about" | "chat">("about");
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const owner = s.ownerId === "me";
  const joined = s.members.includes("me") || owner;
  const joinLabel = buying ? "Working..." : s.priceNgn ? `Buy for ${naira(s.priceNgn)}` : "Add to my Study and join chat";
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [s.messages.length, tab]);
  return (
    <div>
      <Segmented value={tab} onChange={setTab} options={[{ id: "about", label: "About" }, { id: "chat", label: `Chat (${s.messages.length})` }]} />
      {tab === "about" ? (
        <div className="mt-4 space-y-4">
          <p className="text-[13.5px] leading-snug text-[var(--text)]">{s.description}</p>
          <div className="rounded-xl bg-[var(--paper-dim)] px-3 py-2 text-[12.5px] text-[var(--dim)]">Shared by <b className="text-[var(--text)]">{s.ownerName || personName(s.ownerId)}</b>{s.school ? <> · <b className="text-[var(--text)]">{s.school}</b></> : null}</div>
          <div><Label>Members ({s.members.length})</Label><div className="flex flex-wrap gap-2">{s.members.map((id) => (<button key={id} onClick={() => id !== "me" && onProfile(id)} className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 ring-1 ring-[var(--line)]"><Avatar initials={initials(personName(id))} color="#7C4DDB" size={26} /><span className="text-[12.5px] font-semibold">{personName(id)}</span></button>))}</div></div>
          <div><Label>What&apos;s included</Label><div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-[13px] ring-1 ring-[var(--line)]"><span>{contentsLabel(s)}</span><PriceTag price={s.priceNgn} /></div></div>
          {joined ? (<div className="space-y-2"><Btn variant="study" onClick={onOpen}>{owner ? "Open (manage sharing from the course)" : "Open in my Study"}</Btn>{!owner && !s.priceNgn && <Btn variant="ghost" onClick={onLeave}>Leave chat</Btn>}</div>) : (<>
            <Btn variant="study" disabled={buying} onClick={onJoin}><span className="inline-flex items-center gap-2"><BookmarkPlus size={16} /> {joinLabel}</span></Btn>
            {!!s.priceNgn && <p className="text-center text-[11.5px] text-[var(--dim)]">One-time payment from your Birdie balance. You keep access, including anything the owner adds to this listing later.</p>}
          </>)}
        </div>
      ) : (
        <div className="mt-3">
          <div className="no-scrollbar h-[300px] space-y-2 overflow-y-auto rounded-2xl bg-[#F0E9F6] p-3">
            {s.messages.length === 0 && <div className="pt-16 text-center text-[13px] text-[var(--dim)]">No messages yet. Say hi to the class.</div>}
            {s.messages.map((m) => (<div key={m.id} className={`flex ${m.authorId === "me" ? "justify-end" : ""}`}><div className={`max-w-[82%] rounded-2xl px-3 py-2 text-[13.5px] leading-snug shadow-sm ${m.authorId === "me" ? "rounded-tr-md bg-[#EBD3F5]" : "rounded-tl-md bg-white"}`}>{m.authorId !== "me" && <div className="text-[11px] font-bold text-[var(--birdie)]">{personName(m.authorId)}</div>}{m.text}<div className="mt-0.5 text-right text-[10px] text-[#8a7fa0]">{m.t}</div></div></div>))}
            <div ref={end} />
          </div>
          {joined ? (<div className="mt-3 flex gap-2"><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { onSend(draft.trim()); setDraft(""); } }} placeholder="Message the class" className="min-w-0 flex-1 rounded-full bg-[var(--paper-dim)] px-4 py-3 text-[14px] outline-none placeholder:text-[#a99fb8]" /><button onClick={() => { if (draft.trim()) { onSend(draft.trim()); setDraft(""); } }} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--uni)] text-white active:scale-90"><Send size={17} /></button></div>) : <div className="mt-3"><Btn variant="study" disabled={buying} onClick={onJoin}>{s.priceNgn ? joinLabel : "Join to chat"}</Btn></div>}
        </div>
      )}
    </div>
  );
}

function ShareSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { courses } = useApp();
  const avail = courses.filter((c) => !c.sharedId && !c.sourceCourseId);
  const [picked, setPicked] = useState("");
  const cid = avail.some((c) => c.id === picked) ? picked : avail[0]?.id ?? "";
  const course = avail.find((c) => c.id === cid);
  return (
    <Sheet open={open} onClose={onClose} title="Share a course">
      {!course ? <p className="text-[13.5px] text-[var(--dim)]">All your courses are already shared.</p> : (<div className="space-y-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">{avail.map((c) => (<button key={c.id} onClick={() => setPicked(c.id)} className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold ${cid === c.id ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{c.code}</button>))}</div>
        {open && <ShareCourseForm key={course.id} course={course} mode="new" onDone={onClose} />}
      </div>)}
    </Sheet>
  );
}

export { nowTime };
