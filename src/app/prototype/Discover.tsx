"use client";

// Discover, laid out like WeChat's: Moments, Channels, Scan, Shake, Top Stories, Search, People at your
// school and Mini Programs. Each opens full screen (the bottom bar hides) and Back returns to the list.
import jsQR from "jsqr";
import { BookOpen, Bot, Briefcase, Package, PenLine, Presentation, Printer, Search, Smartphone, Zap } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Head, ListRow } from "./Chats";
import Explore from "./Explore";
import MomentsScreen from "./Moments";
import { OALogo, OAPostView, OAProfileView } from "./Official";
import { momentsFeed, peopleAtSchool, searchAll, shake, topStories, type ArticleCard, type ChatPerson, type Moment } from "./live/chatData";
import { JustDoIt } from "./JustDoIt";
import { navBack, useBackLayer } from "./nav";
import { InternshipCard, usePlacements } from "./Sponsored";
import { TutorialsSection } from "./Tutorials";
import { useApp } from "./store";
import { Badge, Cell, CellGroup, ChannelsIcon, MiniProgramsIcon, MomentsIcon, PeopleNearbyIcon, ScanIcon, SearchSparkIcon, ShakeIcon, SqAvatar, TopStoriesIcon, WeHeader } from "./we";
import { ago } from "./Moments";

const SEEN_KEY = "birdie-moments-seen";

export default function Discover({ active }: { active: boolean }) {
  const { discoverView: view, setDiscoverView: go, auth, setAuthOpen } = useApp();
  const [latest, setLatest] = useState<Moment | null>(null);
  const [seenAt, setSeenAt] = useState("");
  const signedIn = auth.status === "in";
  useEffect(() => {
    if (!active || view || !signedIn) return;
    void momentsFeed().then((l) => setLatest(l.find((m) => !m.mine) ?? null));
    try { void Promise.resolve().then(() => setSeenAt(localStorage.getItem(SEEN_KEY) ?? "")); } catch { /* ignore */ }
  }, [active, view, signedIn]);
  const open = (v: NonNullable<typeof view>) => {
    if (!signedIn && v.k !== "channels" && v.k !== "mini") { setAuthOpen(true); return; }
    if (v.k === "moments" && latest) { try { localStorage.setItem(SEEN_KEY, latest.created_at); } catch { /* ignore */ } setSeenAt(latest.created_at); }
    go(v);
  };
  const back = navBack;
  const fresh = !!latest && latest.created_at > seenAt;

  if (view) return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--we-bg)]">
      {view.k === "moments" && <MomentsScreen onBack={back} />}
      {view.k === "userMoments" && <MomentsScreen key={view.id} userId={view.id} onBack={back} />}
      {view.k === "channels" && <Explore active={active} onBack={back} />}
      {view.k === "scan" && <Scan onBack={back} />}
      {view.k === "shake" && <Shake onBack={back} />}
      {view.k === "stories" && <Stories onBack={back} onOpen={(id) => go({ k: "post", id })} />}
      {view.k === "search" && <SearchAll onBack={back} />}
      {view.k === "school" && <School onBack={back} />}
      {view.k === "mini" && <Mini onBack={back} />}
      {view.k === "post" && <OAPostView key={view.id} id={view.id} onBack={back} onProfile={(key) => go({ k: "oaProfile", key })} />}
      {view.k === "oaProfile" && <OAProfileWrap k={view.key} />}
    </div>
  );

  const icon = (n: ReactNode) => <span className="flex h-6 w-6 items-center justify-center">{n}</span>;
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--we-bg)]">
      <WeHeader title="Discover" />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-28">
        <CellGroup gap={false}>
          <Cell icon={icon(<MomentsIcon />)} label="Moments" onClick={() => open({ k: "moments" })}
            right={latest ? <span className="relative mr-1"><SqAvatar name={latest.author.name} color={latest.author.color} size={34} />{fresh && <span className="absolute -right-1 -top-1"><Badge dot /></span>}</span> : undefined} />
        </CellGroup>
        <CellGroup>
          <Cell icon={icon(<ChannelsIcon />)} label="Channels" onClick={() => open({ k: "channels" })} />
        </CellGroup>
        <CellGroup>
          <Cell icon={icon(<ScanIcon />)} label="Scan" onClick={() => open({ k: "scan" })} />
          <Cell icon={icon(<ShakeIcon />)} label="Shake" onClick={() => open({ k: "shake" })} />
        </CellGroup>
        <CellGroup>
          <Cell icon={icon(<TopStoriesIcon />)} label="Top Stories" onClick={() => open({ k: "stories" })} />
          <Cell icon={icon(<SearchSparkIcon />)} label="Search" onClick={() => open({ k: "search" })} />
        </CellGroup>
        <CellGroup>
          <Cell icon={icon(<PeopleNearbyIcon />)} label="People at Your School" onClick={() => open({ k: "school" })} />
        </CellGroup>
        <CellGroup>
          <Cell icon={icon(<MiniProgramsIcon />)} label="Mini Programs" onClick={() => open({ k: "mini" })} />
        </CellGroup>
      </div>
    </div>
  );
}

function OAProfileWrap({ k }: { k: string }) {
  const { setDiscoverView: go, setTab, setChatView } = useApp();
  return <OAProfileView key={k} keyOrId={k} onBack={navBack} onChat={(id) => { go(null); setTab("chats"); setChatView({ k: "oa", id }); }}
    onPost={(id) => go({ k: "post", id })} onManage={(id) => { go(null); setTab("chats"); setChatView({ k: "manage", id }); }} />;
}

/** Points the camera at a Birdie QR code (someone's profile or a group invite) and opens it. */
function Scan({ onBack }: { onBack: () => void }) {
  const { openByHandle, flash } = useApp();
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const done = useRef(false);
  function handle(text: string) {
    if (done.current) return;
    let u: URL;
    try { u = new URL(text, window.location.origin); } catch { return; }
    if (u.origin !== window.location.origin) { done.current = true; flash("That QR code isn't a Birdie code"); onBack(); return; }
    const user = u.pathname.match(/^\/u\/([\w.]+)/)?.[1] ?? u.searchParams.get("u");
    done.current = true;
    if (user) { onBack(); void openByHandle(user).then((ok) => { if (!ok) flash(`No one on Birdie is called @${user}`); }); return; }
    window.location.href = u.href; // group invites and other Birdie links go through the normal link handling
  }
  useEffect(() => {
    let stream: MediaStream | null = null, raf = 0, on = true;
    const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });
    const tick = () => {
      const v = video.current;
      if (!on || !v || !ctx) return;
      if (v.readyState >= 2 && v.videoWidth) {
        const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * w);
        canvas.width = w; canvas.height = h; ctx.drawImage(v, 0, 0, w, h);
        const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h);
        if (code?.data) { handle(code.data); return; }
      }
      raf = requestAnimationFrame(tick);
    };
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } }).then((s) => {
      if (!on) { s.getTracks().forEach((t) => t.stop()); return; }
      stream = s;
      if (video.current) { video.current.srcObject = s; void video.current.play(); }
      raf = requestAnimationFrame(tick);
    }).catch(() => setErr("Birdie needs your camera to scan. Allow it in your browser settings."));
    return () => { on = false; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-black text-white">
      <div className="absolute inset-x-0 top-0 z-10"><WeHeader onBack={onBack} transparent /></div>
      <video ref={video} playsInline muted className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="relative h-60 w-60 overflow-hidden">
          {["left-0 top-0 border-l-[3px] border-t-[3px]", "right-0 top-0 border-r-[3px] border-t-[3px]", "bottom-0 left-0 border-b-[3px] border-l-[3px]", "bottom-0 right-0 border-b-[3px] border-r-[3px]"].map((c) => <span key={c} className={`absolute h-6 w-6 border-[var(--we-accent)] ${c}`} />)}
          <span className="scanline absolute inset-x-3 h-0.5 bg-[var(--we-accent)] shadow-[0_0_12px_var(--we-accent)]" />
        </span>
        <p className="mt-6 px-10 text-center text-[14px] text-white/80">{err ?? "Scan a classmate's Birdie QR code or a group invite"}</p>
      </div>
    </div>
  );
}

/** Shake your phone (or tap) to meet another student who is shaking at about the same time. */
function Shake({ onBack }: { onBack: () => void }) {
  const { setOverlay } = useApp();
  const [state, setState] = useState<"idle" | "looking" | "none">("idle");
  const [hit, setHit] = useState<(ChatPerson & { school: string | null }) | null>(null);
  const busy = useRef(false);
  async function go() {
    if (busy.current) return;
    busy.current = true; setState("looking"); setHit(null);
    navigator.vibrate?.(200);
    const r = await shake();
    busy.current = false;
    if (r) { setHit(r); setState("idle"); } else setState("none");
  }
  useEffect(() => {
    let last = 0;
    const onMove = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity; if (!a) return;
      const f = Math.abs(a.x ?? 0) + Math.abs(a.y ?? 0) + Math.abs(a.z ?? 0);
      if (f > 38 && e.timeStamp - last > 2500) { last = e.timeStamp; void go(); }
    };
    window.addEventListener("devicemotion", onMove);
    return () => window.removeEventListener("devicemotion", onMove);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function tap() {
    const D = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (D.requestPermission) { try { await D.requestPermission(); } catch { /* ignore */ } }
    void go();
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#2E2E2E] text-white">
      <WeHeader onBack={onBack} title="Shake" transparent />
      <button onClick={() => void tap()} className="flex flex-1 flex-col items-center justify-center gap-5">
        <span className={state === "looking" ? "animate-[wiggle_0.4s_ease-in-out_3]" : ""}><Smartphone size={110} strokeWidth={1} /></span>
        <span className="text-[14px] text-white/70">{state === "looking" ? "Looking for someone shaking at the same time..." : state === "none" ? "No one else is shaking right now. Try again." : "Shake your phone, or tap here"}</span>
      </button>
      {hit && (
        <button onClick={() => setOverlay({ t: "contact", id: hit.id })} className="mx-5 mb-12 flex items-center gap-3 rounded-[6px] bg-white/95 p-3 text-left text-[var(--we-text)]">
          <SqAvatar name={hit.name} color={hit.color} size={48} />
          <span className="min-w-0"><span className="block truncate text-[16px] font-medium">{hit.name}</span><span className="block truncate text-[13px] text-[var(--we-sub)]">{hit.school ?? "On Birdie"}</span></span>
        </button>
      )}
    </div>
  );
}

function Stories({ onBack, onOpen }: { onBack: () => void; onOpen: (id: string) => void }) {
  const [items, setItems] = useState<ArticleCard[] | null>(null);
  useEffect(() => { void topStories().then(setItems); }, []);
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="Top Stories" />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-10">
        {items === null ? <p className="py-10 text-center text-[13px] text-[var(--we-sub)]">Loading...</p>
          : items.length === 0 ? <p className="px-10 py-16 text-center text-[14px] text-[var(--we-sub)]">Articles from verified accounts (your SUG, departments, companies) show here.</p>
          : <div className="bg-[var(--we-cell)]">{items.map((a) => (
            <button key={a.id} onClick={() => onOpen(a.id)} className="flex w-full gap-3 border-b border-[var(--we-sep)] px-4 py-3.5 text-left active:bg-black/5">
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[16px] leading-snug text-[var(--we-text)]">{a.title}</span>
                <span className="mt-2 flex items-center gap-1.5 text-[12.5px] text-[var(--we-hint)]"><OALogo a={a.account} size={16} />{a.account.name} · {ago(a.created_at)}</span>
              </span>
              {a.cover_url && <img src={a.cover_url} alt="" className="h-[68px] w-[90px] shrink-0 rounded-[3px] object-cover" />}
            </button>
          ))}</div>}
      </div>
    </div>
  );
}

function SearchAll({ onBack }: { onBack: () => void }) {
  const { setOverlay, setDiscoverView: go } = useApp();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Awaited<ReturnType<typeof searchAll>> | null>(null);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { void Promise.resolve().then(() => setRes(null)); return; }
    const h = setTimeout(() => void searchAll(t).then(setRes), 300);
    return () => clearTimeout(h);
  }, [q]);
  const empty = res && !res.people.length && !res.accounts.length && !res.articles.length;
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-bg)]">
      <div className="flex items-center gap-2 px-3 pb-2 pt-2">
        <div className="flex flex-1 items-center gap-2 rounded-[6px] bg-[var(--we-cell)] px-3 py-2"><Search size={16} className="text-[var(--we-sub)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[16px] text-[var(--we-text)] outline-none" /></div>
        <button onClick={onBack} className="px-1 text-[16px] text-[var(--we-link)]">Cancel</button>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-10">
        {!res && <p className="px-10 pt-12 text-center text-[14px] text-[var(--we-hint)]">Search for students, verified accounts and articles</p>}
        {empty && <p className="pt-12 text-center text-[14px] text-[var(--we-sub)]">No results for &quot;{q.trim()}&quot;</p>}
        {res && res.people.length > 0 && <><Head t="People" /><div className="bg-[var(--we-cell)]">{res.people.map((p) => <ListRow key={p.id} avatar={<SqAvatar name={p.name} color={p.color} size={44} />} name={p.name} last={[p.handle && `@${p.handle}`, p.school].filter(Boolean).join(" · ")} onClick={() => setOverlay({ t: "contact", id: p.id })} />)}</div></>}
        {res && res.accounts.length > 0 && <><Head t="Verified Accounts" /><div className="bg-[var(--we-cell)]">{res.accounts.map((a) => <ListRow key={a.id} avatar={<OALogo a={a} size={44} />} name={a.name} tick last={a.about ?? ""} onClick={() => go({ k: "oaProfile", key: a.handle })} />)}</div></>}
        {res && res.articles.length > 0 && <><Head t="Articles" /><div className="bg-[var(--we-cell)]">{res.articles.map((a) => <ListRow key={a.id} avatar={<OALogo a={a.account} size={44} />} name={a.title} last={a.account.name} onClick={() => go({ k: "post", id: a.id })} />)}</div></>}
      </div>
    </div>
  );
}

function School({ onBack }: { onBack: () => void }) {
  const { setOverlay, profile } = useApp();
  const [items, setItems] = useState<Awaited<ReturnType<typeof peopleAtSchool>> | null>(null);
  useEffect(() => { void peopleAtSchool().then(setItems); }, []);
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="People at Your School" />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-10">
        {items === null ? <p className="py-10 text-center text-[13px] text-[var(--we-sub)]">Loading...</p>
          : items.length === 0 ? <p className="px-10 py-16 text-center text-[14px] leading-relaxed text-[var(--we-sub)]">{profile.institution ? "No one else from your school is on Birdie yet." : "Add your school in Settings to see classmates on Birdie."}</p>
          : <>
            <div className="px-4 pb-1.5 pt-3 text-[13px] text-[var(--we-sub)]">{items[0]?.school ?? profile.institution}</div>
            <div className="bg-[var(--we-cell)]">{items.map((p) => <ListRow key={p.id} avatar={<SqAvatar name={p.name} color={p.color} size={44} />} name={p.name} last={[p.program, p.level && `${p.level} level`].filter(Boolean).join(" · ") || (p.handle ? `@${p.handle}` : "")} onClick={() => setOverlay({ t: "contact", id: p.id })} />)}</div>
          </>}
      </div>
    </div>
  );
}

type MiniSub = null | "tutorials" | "print" | "internships" | "jdi";

/** Birdie's tools. Tutorials, printing, internships and Just Do It used to sit inside Unisupport Help. */
function Mini({ onBack }: { onBack: () => void }) {
  const { openPrint, goBirdie, setDiscoverView: go, setTab, auth, setAuthOpen } = useApp();
  const [sub, setSub] = useState<MiniSub>(null);
  useBackLayer(!!sub, () => setSub(null));
  const need = (f: () => void) => () => (auth.status === "in" ? f() : setAuthOpen(true));
  const close = () => setSub(null);

  if (sub === "jdi") return <JustDoIt onBack={close} />;
  if (sub === "tutorials") return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--paper)]">
      <WeHeader onBack={close} title="Tutorials" />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-2"><TutorialsSection active /></div>
    </div>
  );
  if (sub === "print") return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={close} title="Print & Deliver" />
      <CellGroup gap={false}>
        <Cell icon={<Printer size={22} className="text-[#3D83F7]" />} label="Print a Document" sub="We print it and deliver it to you" onClick={need(() => openPrint({ kind: "print" }))} />
        <Cell icon={<PenLine size={22} className="text-[#E2553F]" />} label="Handwrite My Work" sub="A real person writes it out by hand" onClick={need(() => openPrint({ kind: "handwrite" }))} />
        <Cell icon={<Package size={22} className="text-[#F5A623]" />} label="My Orders" onClick={need(() => openPrint({ kind: "orders" }))} />
      </CellGroup>
      <a href="/partner" className="mt-5 block text-center text-[13px] text-[var(--we-link)]">Own a print shop? Become a Birdie print partner</a>
    </div>
  );
  if (sub === "internships") return <Internships onBack={close} />;

  const apps: { label: string; color: string; icon: ReactNode; run: () => void }[] = [
    { label: "Tutorials", color: "#1B8A85", icon: <Presentation size={26} />, run: () => setSub("tutorials") },
    { label: "Print & Deliver", color: "#3D83F7", icon: <Printer size={26} />, run: () => setSub("print") },
    { label: "Internships & SIWES", color: "#7C4DDB", icon: <Briefcase size={26} />, run: () => setSub("internships") },
    { label: "Just Do It", color: "#E2553F", icon: <Zap size={26} />, run: need(() => setSub("jdi")) },
    { label: "Birdie AI", color: "#8A2FA3", icon: <Bot size={26} />, run: () => goBirdie({ courseId: "general" }) },
    { label: "Shared Courses", color: "#2F9E5B", icon: <BookOpen size={26} />, run: () => go({ k: "channels" }) },
    { label: "My Courses", color: "#D9467E", icon: <BookOpen size={26} />, run: () => { go(null); setTab("study"); } },
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="Mini Programs" />
      <div className="px-4 pb-2 pt-3 text-[13px] text-[var(--we-sub)]">Birdie tools</div>
      <div className="grid grid-cols-4 gap-y-5 bg-[var(--we-cell)] px-2 py-5">{apps.map((a) => (
        <button key={a.label} onClick={a.run} className="flex min-w-0 flex-col items-center gap-2 active:opacity-70">
          <span className="flex h-14 w-14 items-center justify-center rounded-full text-white" style={{ background: a.color }}>{a.icon}</span>
          <span className="line-clamp-2 max-w-full px-1 text-center text-[12px] leading-tight text-[var(--we-text)]">{a.label}</span>
        </button>
      ))}</div>
    </div>
  );
}

function Internships({ onBack }: { onBack: () => void }) {
  const list = usePlacements("internship", undefined, true);
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--paper)]">
      <WeHeader onBack={onBack} title="Internships & SIWES" />
      <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-24 pt-2">
        {list.length === 0 ? <p className="px-4 py-12 text-center text-[13.5px] leading-relaxed text-[var(--we-sub)]">Placements and internships for students in your area show up here. Make sure your school and region are on your profile.</p>
          : list.map((p) => <InternshipCard key={p.id} p={p} />)}
        <a href="/internships" className="block pt-2 text-center text-[13px] text-[var(--we-link)]">Hiring interns? Post a placement on Birdie</a>
      </div>
    </div>
  );
}
