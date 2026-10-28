"use client";

import { bizDirectory } from "./live/bizData";
import { openStore } from "./Shop";
import { BizAvatar } from "./bizkit";
import { whileVisible } from "./perf";
import { useViewState } from "./persist";
import { BadgeCheck, BookmarkPlus, ChevronLeft, Search } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { FeedAd, SlotAd, usePlacements } from "./Sponsored";
import { CampusDeals } from "./CampusDeals";
import { CertStrip } from "./Certificates";
import { topInterests } from "./engine";
import { logPostEvent } from "./live/recData";
import { courseGroupId } from "./live/chatData";
import PostCard, { initials } from "./PostCard";
import { firstName, naira, nowTime, useApp, type SharedCourse } from "./store";
import { Avatar, Btn, DemoControls, Empty, Page, Sheet } from "./ui";
import { ShareCourseForm } from "./ShareCourseForm";

// Discover > Channels (videos and posts), Discover > Shared Courses and Discover > Campus Deals.
export default function Explore({ active, onBack, section = "feed" }: { active: boolean; onBack?: () => void; section?: "feed" | "courses" | "deals" }) {
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
  const seg = section;
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
    const i = setInterval(whileVisible(() => loadSharedDetail(detail)), 5000);
    return () => clearInterval(i);
  }, [detail, loadSharedDetail]);

  // Fresh posts each time Explore is opened; a course tapped on someone's channel opens here.
  // Fresh posts when Explore opens, but not on every tab switch (saves data on slow networks).
  const lastLoad = useRef(0);
  useEffect(() => {
    if (!active) return;
    const now = performance.now();
    if (lastLoad.current && now - lastLoad.current < 90_000) return;
    lastLoad.current = now;
    void refreshFeed(); void loadForYou(true); void refreshTopics();
  }, [active, refreshFeed, loadForYou, refreshTopics]);
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
  // Draw 16 videos at a time; more are drawn (then fetched) as you scroll.
  const [shown, setShown] = useState(16);
  useEffect(() => {
    if (!sharedIntent || seg !== "courses") return;
    setDetail(sharedIntent); clearSharedIntent(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [sharedIntent, clearSharedIntent, seg]);

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
      const ranked = [...list].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) || b.createdAt - a.createdAt);
      // Like YouTube, every 5th video is from outside your usual topics, so you still discover new things.
      const mine = new Set(topics.filter((t) => t.mine).slice(0, 4).map((t) => t.topic));
      const outside = mine.size ? ranked.filter((p) => !p.tags.some((t) => mine.has(t))) : [];
      if (outside.length) {
        const used = new Set<string>(); const mixed: typeof ranked = [];
        const core = ranked.filter((p) => !outside.includes(p));
        let o = 0;
        for (const p of core) {
          if ((mixed.length + 1) % 5 === 0 && o < outside.length) { mixed.push(outside[o]); used.add(outside[o++].id); }
          mixed.push(p); used.add(p.id);
        }
        list = [...mixed, ...outside.filter((p) => !used.has(p.id))];
      } else list = ranked;
    } else if (tag === "For you" && settings.personalTags && interests.length) list = [...list].sort((a, b) => Number(interests.some((i) => has(b, i))) - Number(interests.some((i) => has(a, i))) || b.createdAt - a.createdAt);
    else list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [posts, q, tag, following, blocked, interests, settings.personalTags, forYou, topics]);
  const moreLocal = shown < feed.length;
  // Draw 16 videos at a time; more are drawn (then fetched) as you scroll.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || seg !== "feed" || (feedEnd && !moreLocal)) return;
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting) || loadingMore.current) return;
      if (moreLocal) { setShown((n) => n + 16); return; }
      loadingMore.current = true;
      const ranked = tag === "For you" && !q.trim() && forYou.length > 0;
      void (ranked ? loadForYou(false).then((n) => (n ? n : loadMoreFeed())) : loadMoreFeed()).then((n) => { loadingMore.current = false; if (n === 0) setFeedEnd(true); });
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seg, feedEnd, loadMoreFeed, loadForYou, forYou.length, tag, q, posts.length, shown, moreLocal]);

  const filteredShared = shared.filter((s) => !q.trim() || `${s.code} ${s.name} ${s.field}`.toLowerCase().includes(q.trim().toLowerCase()));
  const sel = shared.find((s) => s.id === detail) ?? null;

  const chip = (on: boolean) => `shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition active:scale-95 ${on ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-dim)] text-[var(--text)]"}`;

  return (
    <div className={`flex h-full flex-col ${seg !== "feed" ? "bg-[var(--we-bg)]" : ""}`}>
      <div ref={scroller} onScroll={onScroll} className="no-scrollbar relative flex-1 overflow-y-auto pb-32">
        {/* Header slides away while scrolling down and returns on the way up, so videos get the screen. */}
        {seg !== "feed" ? (
          <div className="sticky top-0 z-20 bg-[var(--we-bg)]">
            <div className="relative flex h-12 items-center justify-between px-2 text-[var(--we-text)]">
              {onBack ? <button onClick={onBack} aria-label="Back" className="flex h-10 w-10 items-center justify-center"><ChevronLeft size={26} /></button> : <span className="w-10" />}
              <span className="pointer-events-none absolute inset-x-20 text-center text-[16.5px] font-semibold">{seg === "courses" ? "Shared Courses" : "Campus Deals"}</span>
              {seg === "courses" ? <button onClick={() => setSearchOpen((o) => !o)} aria-label="Search" className="flex h-10 w-10 items-center justify-center"><Search size={21} /></button> : <span className="w-10" />}
            </div>
            {seg === "courses" && (searchOpen || q) && <div className="px-3 pb-2"><div className="flex items-center gap-2 rounded-[6px] bg-[var(--we-cell)] px-3 py-2"><Search size={16} className="text-[var(--we-sub)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses" className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--we-text)] outline-none" /></div></div>}
          </div>
        ) : (
        <div className={`sticky top-0 z-20 bg-[var(--paper)] pb-2 transition-transform duration-200 ${hideHead ? "-translate-y-full" : ""}`}>
          <div className="flex items-center gap-2 px-4 pt-2">
            {onBack && <button onClick={onBack} aria-label="Back" className="-ml-2 flex h-9 w-9 items-center justify-center"><ChevronLeft size={26} /></button>}
            <h2 className="disp flex-1 text-[21px] font-bold text-[var(--text)]">{seg === "feed" ? "Channels" : seg === "courses" ? "Shared Courses" : "Campus Deals"}</h2>
            <button onClick={() => setSearchOpen((o) => !o)} aria-label="Search" className="flex h-9 w-9 items-center justify-center rounded-full active:bg-[var(--paper-dim)]"><Search size={19} /></button>
            <button onClick={() => setOverlay({ t: "profile", id: "me" })} aria-label="My channel" className="active:scale-95"><Avatar initials={initials(profile.name || "Me")} color="#A63FBD" size={30} /></button>
          </div>
          {(searchOpen || q) && <div className="mx-4 mt-2 flex items-center gap-2 rounded-full bg-[var(--paper-dim)] px-3.5 py-2.5"><Search size={15} className="text-[var(--dim)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search videos, posts, courses..." className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#a99fb8]" />{q && <button onClick={() => { setQ(""); setSearchOpen(false); }} className="text-[12px] font-semibold text-[var(--dim)]">Clear</button>}</div>}
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-4">
            {seg === "feed" && tags.map((t) => (<button key={t} onClick={() => setTag(t)} className={`${chip(tag === t)} capitalize`}>{t}</button>))}
          </div>
        </div>
        )}

        <div className={seg === "feed" ? "px-5 pt-1" : ""}>
        {seg === "feed" ? (
          feed.length === 0 ? (
            <Empty icon={<Search size={20} />} title={posts.length === 0 ? "Nothing here yet" : "No matches"} text={posts.length === 0 ? "Follow creators and watch what other students post, or share something yourself. Tap the mascot and choose Post." : tag === "Following" ? "Follow a creator to see their posts here." : "Try another tag or search term."} action={<Btn variant="study" onClick={() => setOverlay({ t: "post" })}>Post something</Btn>} />
          ) : (
            <div className="-mx-5 space-y-5">{feed.slice(0, shown).map((p, i) => (<Fragment key={p.id}>
              <PostCard post={p} edge onProfile={(id) => setOverlay({ t: "profile", id })} />
              {feedCards.length > 0 && (i === 3 || (i > 3 && (i - 3) % 8 === 0)) && <FeedAd p={feedCards[Math.floor((i - 3) / 8) % feedCards.length]} edge />}
            </Fragment>))}
              <div ref={sentinel} className="py-4 text-center text-[12px] text-[var(--dim)]">{feedEnd ? "You're all caught up" : "Loading more..."}</div>
            </div>
          )
        ) : seg === "deals" ? (
          <div><ShopOffers /><div className="px-4 pt-2"><CampusDeals campus={campus} deals={deals} /></div></div>
        ) : (
          <div>
            <div className="bg-[var(--we-cell)]">
              <button onClick={() => (courses.length ? setShareOpen(true) : flash("Create a course in Courses first"))} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-black/5">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--we-accent)] text-white"><BookmarkPlus size={20} /></span>
                <span className="min-w-0 flex-1"><span className="block text-[16px] text-[var(--we-text)]">Share One of My Courses</span><span className="block text-[12.5px] text-[var(--we-sub)]">Free or paid. You keep 90% of sales.</span></span>
              </button>
            </div>
            <div className="px-3 pt-2"><CertStrip active={active && seg === "courses"} /><SlotAd surface="courses" active={active && seg === "courses"} /></div>
            <div className="px-4 pb-1.5 pt-3 text-[13px] text-[var(--we-sub)]">{filteredShared.length ? "Courses students shared" : ""}</div>
            {filteredShared.length === 0 ? <p className="px-10 py-12 text-center text-[14px] leading-relaxed text-[var(--we-sub)]">No shared courses yet. When students share their course notes, files and recordings, they show here.</p> : (
              <div className="bg-[var(--we-cell)]">{filteredShared.map((s) => {
                const joined = s.members.includes("me") || s.ownerId === "me";
                return (
                  <button key={s.id} onClick={() => setDetail(s.id)} className="flex w-full items-center gap-3 pl-4 text-left active:bg-black/5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white" style={{ background: courseColor(s.code) }}>{s.code.replace(/\s+/g, "").slice(0, 4)}</span>
                    <span className="flex min-h-[68px] min-w-0 flex-1 items-center gap-2 border-b border-[var(--we-sep)] py-2.5 pr-4">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px] text-[var(--we-text)]">{s.code} · {s.name}</span>
                        <span className="block truncate text-[12.5px] text-[var(--we-sub)]">{[s.school, `by ${s.ownerName || (s.ownerId === "me" ? profile.name || "you" : personById(s.ownerId)?.name ?? "a student")}`].filter(Boolean).join(" · ")}</span>
                        <span className="block truncate text-[12.5px] text-[var(--we-hint)]">{s.members.length} member{s.members.length === 1 ? "" : "s"} · {contentsLabel(s)}</span>
                      </span>
                      {joined ? <BadgeCheck size={18} className="shrink-0 text-[var(--we-accent)]" /> : <PriceTag price={s.priceNgn} />}
                    </span>
                  </button>
                );
              })}</div>
            )}
          </div>
        )}
        </div>
      </div>

      <Page open={!!sel} onClose={() => setDetail(null)} title={sel ? sel.code : ""}>
        {sel && <SharedDetail s={sel} buying={buying} onJoin={() => void join(sel)} onOpen={() => { const c = courses.find((x) => x.sharedId === sel.id); setDetail(null); if (c) goStudy({ courseId: c.id }); else setTab("study"); }} onLeave={() => { leaveShared(sel.id); flash("Left the course chat"); }} onSend={(t) => sendShared(sel.id, t)} onProfile={(id) => { setDetail(null); setOverlay({ t: "profile", id }); }} me={firstName(profile)} personName={(id) => (id === "me" ? "You" : personById(id)?.name ?? "Someone")} />}
      </Page>

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

function SharedDetail({ s, buying, onJoin, onOpen, onLeave, onProfile, personName }: { s: SharedCourse; buying: boolean; onJoin: () => void; onOpen: () => void; onLeave: () => void; onSend?: (t: string) => void; me?: string; onProfile: (id: string) => void; personName: (id: string) => string | undefined }) {
  const { setChatView, flash } = useApp();
  const owner = s.ownerId === "me";
  const joined = s.members.includes("me") || owner;
  const joinLabel = buying ? "Working..." : s.priceNgn ? `Buy for ${naira(s.priceNgn)}` : "Add to My Courses";
  async function openChat() {
    const gid = await courseGroupId(s.id);
    if (!gid) return flash("The course chat opens once you've added the course");
    setChatView({ k: "group", id: gid });
  }
  return (
    <div className="pb-10">
      <div className="flex flex-col items-center bg-[var(--we-cell)] px-6 pb-6 pt-5 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full text-[15px] font-semibold text-white" style={{ background: courseColor(s.code) }}>{s.code.replace(/\s+/g, "").slice(0, 4)}</span>
        <div className="mt-2 text-[18px] font-semibold text-[var(--we-text)]">{s.code} · {s.name}</div>
        <div className="mt-0.5 text-[13px] text-[var(--we-sub)]">{[s.school, `Shared by ${s.ownerName || personName(s.ownerId) || "a student"}`].filter(Boolean).join(" · ")}</div>
        {s.description && <p className="mt-3 text-[14.5px] leading-snug text-[var(--we-text)]">{s.description}</p>}
      </div>
      <div className="mt-2 bg-[var(--we-cell)] px-4">
        <div className="flex items-center justify-between border-b border-[var(--we-sep)] py-3.5 text-[16px] text-[var(--we-text)]"><span>What&apos;s included</span><span className="text-[14px] text-[var(--we-sub)]">{contentsLabel(s)}</span></div>
        <div className="flex items-center justify-between py-3.5 text-[16px] text-[var(--we-text)]"><span>Price</span><PriceTag price={s.priceNgn} /></div>
      </div>
      <div className="px-4 pb-1.5 pt-4 text-[13px] text-[var(--we-sub)]">Members ({s.members.length})</div>
      <div className="flex flex-wrap gap-3 bg-[var(--we-cell)] px-4 py-3">{s.members.slice(0, 20).map((id) => (
        <button key={id} onClick={() => id !== "me" && onProfile(id)} className="flex w-14 flex-col items-center gap-1"><Avatar initials={initials(personName(id) || "?")} color={courseColor(id)} size={44} /><span className="w-full truncate text-center text-[11.5px] text-[var(--we-sub)]">{id === "me" ? "You" : personName(id) || "Student"}</span></button>
      ))}</div>
      <div className="mt-4 space-y-2 px-4">
        {joined ? (<>
          <button onClick={() => void openChat()} className="w-full rounded-[6px] bg-[var(--we-accent)] py-3 text-[16px] font-medium text-white">Open Course Chat</button>
          <button onClick={onOpen} className="w-full rounded-[6px] bg-[var(--we-cell)] py-3 text-[16px] text-[var(--we-text)]">{owner ? "Open the Course" : "Open in My Courses"}</button>
          {!owner && !s.priceNgn && <button onClick={onLeave} className="w-full py-2 text-[15px] text-[var(--we-red)]">Remove from My Courses</button>}
        </>) : (<>
          <button disabled={buying} onClick={onJoin} className="w-full rounded-[6px] bg-[var(--we-accent)] py-3 text-[16px] font-medium text-white disabled:opacity-50">{joinLabel}</button>
          {!!s.priceNgn && <p className="text-center text-[12.5px] text-[var(--we-sub)]">Paid once from your Birdie balance. You keep anything the owner adds later.</p>}
        </>)}
      </div>
    </div>
  );
}

const courseColor = (t: string) => ["#3D83F7", "#7C4DDB", "#1B8A85", "#D9467E", "#E2553F", "#A63FBD", "#F5A623", "#2F9E5B"][[...t].reduce((a, c) => a + c.charCodeAt(0), 0) % 8];

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

/** Campus Deals: offers and discount codes from shops at your school. */
function ShopOffers() {
  const [list, setList] = useState<Awaited<ReturnType<typeof bizDirectory>>>([]);
  useEffect(() => { void bizDirectory(null).then((l) => setList(l.filter((b) => b.offer))); }, []);
  if (!list.length) return null;
  return (
    <div>
      <div className="px-4 pb-1.5 pt-3 text-[13px] text-[var(--we-sub)]">Offers at your school</div>
      <div className="bg-[var(--we-cell)]">{list.map((b) => (
        <button key={b.id} onClick={() => openStore(b.id)} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 text-left last:border-0 active:bg-[var(--we-bg)]">
          <BizAvatar b={b} />
          <span className="min-w-0 flex-1"><span className="block truncate text-[16px] text-[var(--we-text)]">{b.offer!.title}</span><span className="block truncate text-[13px] text-[var(--we-sub)]">{b.name}{b.biz_category ? ` · ${b.biz_category}` : ""}{b.featured ? " · Sponsored" : ""}</span></span>
          {b.offer!.percent_off ? <span className="shrink-0 rounded-[4px] bg-[#FFF4E0] px-2 py-1 text-[13px] font-medium text-[#C77700]">{b.offer!.percent_off}% off</span> : null}
        </button>
      ))}</div>
    </div>
  );
}
