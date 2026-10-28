"use client";

// Discover, laid out like WeChat's: Moments, Channels, Scan, Shake, Top Stories, Search, People at your
// school and Mini Programs. Each opens full screen (the bottom bar hides) and Back returns to the list.
import jsQR from "jsqr";
import { BookOpen, Bot, Briefcase, Camera, QrCode, Tag, ImagePlus, LayoutGrid, Plus, ScanLine, Search, Smartphone, Zap } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Head, ListRow } from "./Chats";
import Channels from "./Channels";
import Explore from "./Explore";
import MomentsScreen, { hasNewMomentNotices } from "./Moments";
import { OALogo, OAPostView, OAProfileView } from "./Official";
import { momentsFeed, peopleAtSchool, searchAll, shake, topStories, type ArticleCard, type ChatPerson, type Moment } from "./live/chatData";
import { JustDoIt } from "./JustDoIt";
import { payTo } from "./MeServices";
import { groupPreview, joinGroup } from "./live/groupData";
import { navBack, useBackLayer } from "./nav";
import { InternshipCard, usePlacements } from "./Sponsored";
import { useApp } from "./store";
import { Badge, Cell, CellGroup, ChannelsIcon, MiniProgramsIcon, MomentsIcon, PeopleNearbyIcon, ScanIcon, SearchSparkIcon, ShakeIcon, SqAvatar, TopStoriesIcon, WeHeader } from "./we";
import { ago } from "./Moments";

const SEEN_KEY = "birdie-moments-seen";

export default function Discover({ active }: { active: boolean }) {
  const { discoverView: view, setDiscoverView: go, auth, setAuthOpen, sharedIntent } = useApp();
  // A shared course opened from somewhere else (a link, a chat) shows in Shared Courses.
  useEffect(() => { if (sharedIntent && view?.k !== "sharedCourses") go({ k: "sharedCourses" }); }, [sharedIntent]); // eslint-disable-line react-hooks/exhaustive-deps
  const [latest, setLatest] = useState<Moment | null>(null);
  const [seenAt, setSeenAt] = useState("");
  const [notices, setNotices] = useState(false);
  const [menu, setMenu] = useState(false);
  useBackLayer(menu, () => setMenu(false));
  const signedIn = auth.status === "in";
  useEffect(() => {
    if (!active || view || !signedIn) return;
    void momentsFeed().then((l) => setLatest(l.find((m) => !m.mine) ?? null));
    void hasNewMomentNotices().then(setNotices);
    try { void Promise.resolve().then(() => setSeenAt(localStorage.getItem(SEEN_KEY) ?? "")); } catch { /* ignore */ }
  }, [active, view, signedIn]);
  const open = (v: NonNullable<typeof view>) => {
    if (!signedIn && !["channels", "sharedCourses", "deals", "mini"].includes(v.k)) { setAuthOpen(true); return; }
    if (v.k === "moments" && latest) { try { localStorage.setItem(SEEN_KEY, latest.created_at); } catch { /* ignore */ } setSeenAt(latest.created_at); }
    go(v);
  };
  const back = navBack;
  const fresh = (!!latest && latest.created_at > seenAt) || notices;

  if (view) return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--we-bg)]">
      {view.k === "moments" && <MomentsScreen onBack={back} />}
      {view.k === "userMoments" && <MomentsScreen key={view.id} userId={view.id} onBack={back} />}
      {view.k === "channels" && <Channels active={active} onBack={back} onSearch={() => go({ k: "search" })} />}
      {view.k === "sharedCourses" && <Explore active={active} onBack={back} section="courses" />}
      {view.k === "deals" && <Explore active={active} onBack={back} section="deals" />}
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
      <div className="relative z-30">
        <WeHeader title="Discover" right={<>
          <button onClick={() => open({ k: "search" })} aria-label="Search" className="flex h-10 w-10 items-center justify-center"><Search size={21} /></button>
          <button onClick={() => setMenu((m) => !m)} aria-label="More" className="flex h-10 w-10 items-center justify-center"><span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.6px] border-current"><Plus size={15} strokeWidth={2.2} /></span></button>
        </>} />
        {menu && (<>
          <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
          <div className="absolute right-3 top-12 z-30 w-[180px] rounded-[6px] bg-[var(--we-pop)] py-1 text-[15.5px] text-white shadow-2xl">
            <span className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 bg-[var(--we-pop)]" />
            {[
              { label: "Post to Moments", Icon: Camera, run: () => open({ k: "moments" }) },
              { label: "Scan", Icon: ScanLine, run: () => open({ k: "scan" }) },
              { label: "Shake", Icon: Smartphone, run: () => open({ k: "shake" }) },
              { label: "Mini Programs", Icon: LayoutGrid, run: () => open({ k: "mini" }) },
            ].map(({ label, Icon, run }) => <button key={label} onClick={() => { setMenu(false); run(); }} className="relative flex w-full items-center gap-3.5 px-4 py-3 text-left active:bg-white/10"><Icon size={20} strokeWidth={1.7} />{label}</button>)}
          </div>
        </>)}
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-28">
        <CellGroup gap={false}>
          <Cell icon={icon(<MomentsIcon />)} label="Moments" onClick={() => open({ k: "moments" })}
            right={latest ? <span className="relative mr-1"><SqAvatar name={latest.author.name} color={latest.author.color} size={34} />{fresh && <span className="absolute -right-1 -top-1"><Badge dot /></span>}</span> : undefined} />
        </CellGroup>
        <CellGroup>
          <Cell icon={icon(<ChannelsIcon />)} label="Channels" onClick={() => open({ k: "channels" })} />
        </CellGroup>
        <CellGroup>
          <Cell icon={icon(<BookOpen size={22} className="text-[#2F9E5B]" />)} label="Shared Courses" onClick={() => open({ k: "sharedCourses" })} />
          <Cell icon={icon(<Tag size={22} className="text-[#FA9D3B]" />)} label="Campus Deals" onClick={() => open({ k: "deals" })} />
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

/** Scan: points the camera at a QR code (or reads one from a photo). On Android, Chrome's built-in
 *  barcode detector runs on Google's scanner; other phones use our own decoder. Birdie codes (someone's
 *  profile, a group invite) open inside the app; anything else is shown first, never opened blindly. */
type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
const BIRDIE_HOSTS = ["unisupportorg.vercel.app", "getunisupport.xyz", "www.getunisupport.xyz"];

function makeDetector(): Detector | null {
  const W = window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector };
  try { return W.BarcodeDetector ? new W.BarcodeDetector({ formats: ["qr_code"] }) : null; } catch { return null; }
}
async function decode(det: Detector | null, src: HTMLVideoElement | HTMLImageElement, canvas: HTMLCanvasElement): Promise<string | null> {
  if (det) { try { const r = await det.detect(src); if (r[0]?.rawValue) return r[0].rawValue; } catch { /* fall through */ } }
  const w0 = src instanceof HTMLVideoElement ? src.videoWidth : src.naturalWidth, h0 = src instanceof HTMLVideoElement ? src.videoHeight : src.naturalHeight;
  if (!w0 || !h0) return null;
  const w = Math.min(800, w0), h = Math.round((h0 / w0) * w);
  const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) return null;
  canvas.width = w; canvas.height = h; ctx.drawImage(src, 0, 0, w, h);
  return jsQR(ctx.getImageData(0, 0, w, h).data, w, h)?.data ?? null;
}

function Scan({ onBack }: { onBack: () => void }) {
  const { openByHandle, flash, setChatView, setDiscoverView, setTab } = useApp();
  const video = useRef<HTMLVideoElement>(null);
  const photo = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<null | { kind: "group"; code: string; name: string; members: number; joined: boolean; id: string } | { kind: "link"; url: string } | { kind: "text"; text: string }>(null);
  const [paused, setPaused] = useState(false);
  const busy = useRef(false);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  async function handle(text: string) {
    if (busy.current) return;
    busy.current = true; setPaused(true); navigator.vibrate?.(60);
    try {
      let u: URL | null = null;
      try { u = new URL(text, window.location.origin); } catch { u = null; }
      const ours = !!u && /^https?:$/.test(u.protocol) && (u.host === window.location.host || BIRDIE_HOSTS.includes(u.host));
      if (u && ours) {
        const payee = u.pathname.match(/^\/pay-me\/([\w.]+)/)?.[1] ?? u.searchParams.get("payto");
        if (payee) { setDiscoverView(null); payTo(payee, Number(u.searchParams.get("amount") ?? 0) || undefined); return; }
        const user = u.pathname.match(/^\/u\/([\w.]+)/)?.[1] ?? u.searchParams.get("u");
        if (user) { const ok = await openByHandle(user); if (ok) { setDiscoverView(null); return; } flash(`No one on Birdie is called @${user}`); setPaused(false); return; }
        const code = u.pathname.match(/^\/g\/([A-Za-z0-9]+)/)?.[1] ?? u.searchParams.get("join");
        if (code) {
          const g = await groupPreview(code);
          if (!g) { flash("That group link has expired"); setPaused(false); return; }
          setResult({ kind: "group", code, name: g.name, members: g.members, joined: g.joined, id: g.id }); return;
        }
      }
      if (u && /^https?:$/.test(u.protocol) && /^https?:\/\//i.test(text)) { setResult({ kind: "link", url: u.href }); return; }
      setResult({ kind: "text", text });
    } finally { busy.current = false; }
  }
  const again = () => { setResult(null); setPaused(false); };

  useEffect(() => {
    let stream: MediaStream | null = null, on = true, timer: ReturnType<typeof setTimeout> | null = null;
    const det = makeDetector(), canvas = document.createElement("canvas");
    const tick = async () => {
      const v = video.current;
      if (!on) return;
      if (v && !pausedRef.current && v.readyState >= 2) { const t = await decode(det, v, canvas); if (t && on) void handle(t); }
      timer = setTimeout(() => void tick(), det ? 180 : 250);
    };
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } } }).then((s) => {
      if (!on) { s.getTracks().forEach((t) => t.stop()); return; }
      stream = s;
      if (video.current) { video.current.srcObject = s; void video.current.play(); }
      void tick();
    }).catch(() => setErr("Birdie needs your camera to scan. Allow it in your phone's settings, or pick a photo of the code."));
    return () => { on = false; if (timer) clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fromPhoto(f?: File) {
    if (!f) return;
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = async () => { const t = await decode(makeDetector(), img, document.createElement("canvas")); URL.revokeObjectURL(url); if (t) void handle(t); else flash("No QR code found in that photo"); };
    img.src = url;
  }
  async function join(code: string) {
    const r = await joinGroup(code);
    if (r.error || !r.id) return flash(r.error === "group_full" ? "That group is full" : "Couldn't join that group");
    setDiscoverView(null); setChatView({ k: "group", id: r.id });
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-black text-white">
      <div className="absolute inset-x-0 top-0 z-10"><WeHeader onBack={onBack} transparent /></div>
      <video ref={video} playsInline muted className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="relative h-60 w-60 overflow-hidden">
          {["left-0 top-0 border-l-[3px] border-t-[3px]", "right-0 top-0 border-r-[3px] border-t-[3px]", "bottom-0 left-0 border-b-[3px] border-l-[3px]", "bottom-0 right-0 border-b-[3px] border-r-[3px]"].map((c) => <span key={c} className={`absolute h-6 w-6 border-[var(--we-accent)] ${c}`} />)}
          {!paused && <span className="scanline absolute inset-x-3 h-0.5 bg-[var(--we-accent)] shadow-[0_0_12px_var(--we-accent)]" />}
        </span>
        <p className="mt-6 px-10 text-center text-[14px] text-white/80">{err ?? "Scan a classmate's code, a group invite or a Receive Money code"}</p>
      </div>
      <div className="absolute inset-x-0 bottom-10 flex justify-between px-8">
        <button onClick={() => { setDiscoverView(null); setTab("me"); }} className="flex flex-col items-center gap-1.5 text-[12px] text-white/90"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15"><QrCode size={22} /></span>My QR Code</button>
        <button onClick={() => photo.current?.click()} className="flex flex-col items-center gap-1.5 text-[12px] text-white/90"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15"><ImagePlus size={22} /></span>Album</button>
      </div>
      <input ref={photo} type="file" accept="image/*" hidden onChange={(e) => { void fromPhoto(e.target.files?.[0]); e.target.value = ""; }} />

      {result && (
        <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-[14px] bg-[var(--we-cell)] px-5 pb-8 pt-5 text-[var(--we-text)]">
          {result.kind === "group" && (<>
            <div className="text-[13px] text-[var(--we-sub)]">Group invite</div>
            <div className="mt-1 text-[18px] font-semibold">{result.name}</div>
            <div className="text-[13px] text-[var(--we-sub)]">{result.members} member{result.members === 1 ? "" : "s"}</div>
            <button onClick={() => (result.joined ? (setDiscoverView(null), setChatView({ k: "group", id: result.id })) : void join(result.code))} className="mt-4 w-full rounded-[6px] bg-[var(--we-accent)] py-3 text-[16px] font-medium text-white">{result.joined ? "Open Chat" : "Join Group"}</button>
          </>)}
          {result.kind === "link" && (<>
            <div className="text-[13px] text-[var(--we-sub)]">This code is a link to another website</div>
            <div className="mt-1 break-all text-[15px] text-[var(--we-link)]">{result.url}</div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { void navigator.clipboard?.writeText(result.url); flash("Copied"); }} className="flex-1 rounded-[6px] bg-[var(--we-bg)] py-3 text-[15px]">Copy</button>
              <button onClick={() => window.open(result.url, "_blank", "noopener")} className="flex-1 rounded-[6px] bg-[var(--we-accent)] py-3 text-[15px] font-medium text-white">Open Link</button>
            </div>
          </>)}
          {result.kind === "text" && (<>
            <div className="text-[13px] text-[var(--we-sub)]">Scanned text</div>
            <div className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-[15px]">{result.text}</div>
            <button onClick={() => { void navigator.clipboard?.writeText(result.text); flash("Copied"); }} className="mt-4 w-full rounded-[6px] bg-[var(--we-accent)] py-3 text-[15px] font-medium text-white">Copy</button>
          </>)}
          <button onClick={again} className="mt-2 w-full py-2.5 text-[15px] text-[var(--we-link)]">Scan Again</button>
        </div>
      )}
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
  const { setOverlay, setDiscoverView: go, posts, searchFeed, goBirdie } = useApp();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | "people" | "channels" | "articles" | "accounts">("all");
  const [res, setRes] = useState<Awaited<ReturnType<typeof searchAll>> | null>(null);
  const [trending, setTrending] = useState<ArticleCard[]>([]);
  useEffect(() => { void topStories().then((l) => setTrending(l.slice(0, 8))); }, []);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { void Promise.resolve().then(() => setRes(null)); return; }
    const h = setTimeout(() => { void searchAll(t).then(setRes); void searchFeed(t); }, 300);
    return () => clearTimeout(h);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const term = q.trim().toLowerCase();
  const vids = res ? posts.filter((p) => `${p.title} ${p.body ?? ""} ${p.tags.join(" ")}`.toLowerCase().includes(term)).slice(0, 6) : [];
  const show = (c: typeof cat) => cat === "all" || cat === c;
  const empty = res && !res.people.length && !res.accounts.length && !res.articles.length && !vids.length;
  const CATS = [["all", "All"], ["people", "People"], ["channels", "Channels"], ["articles", "Articles"], ["accounts", "Verified"]] as const;
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-bg)]">
      <div className="flex items-center gap-2 px-3 pb-2 pt-2">
        <div className="flex flex-1 items-center gap-2 rounded-[6px] bg-[var(--we-cell)] px-3 py-2"><Search size={16} className="text-[var(--we-sub)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[16px] text-[var(--we-text)] outline-none" /></div>
        <button onClick={onBack} className="px-1 text-[16px] text-[var(--we-link)]">Cancel</button>
      </div>
      <div className="no-scrollbar flex shrink-0 gap-5 overflow-x-auto px-4 pb-2 text-[15px]">
        {CATS.map(([id, label]) => <button key={id} onClick={() => setCat(id)} className={`shrink-0 pb-1 ${cat === id ? "border-b-2 border-[var(--we-accent)] font-medium text-[var(--we-text)]" : "text-[var(--we-link)]"}`}>{label}</button>)}
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-10">
        {!res && (trending.length > 0 ? (
          <div className="mx-3 mt-2 rounded-[8px] bg-[var(--we-cell)] px-4 py-3">
            <div className="pb-2 text-[13px] text-[var(--we-sub)]">On campus now</div>
            {trending.map((a) => <button key={a.id} onClick={() => go({ k: "post", id: a.id })} className="block w-full truncate py-2.5 text-left text-[15.5px] text-[var(--we-text)]">{a.title}</button>)}
          </div>
        ) : <p className="px-10 pt-12 text-center text-[14px] text-[var(--we-hint)]">Search students, channel videos, verified accounts and articles</p>)}
        {res && term && (
          <button onClick={() => goBirdie({ courseId: "general", prompt: q.trim() })} className="mx-3 mt-2 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-[8px] bg-[var(--we-cell)] px-4 py-3 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#C05BD6] to-[#8A2FA3] font-bold text-white">B</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[15.5px] text-[var(--we-text)]">Ask Birdie: {q.trim()}</span><span className="block text-[12.5px] text-[var(--we-sub)]">Get an answer from Birdie AI</span></span>
          </button>
        )}
        {empty && <p className="pt-10 text-center text-[14px] text-[var(--we-sub)]">No results for &quot;{q.trim()}&quot;</p>}
        {res && show("people") && res.people.length > 0 && <><Head t="People" /><div className="bg-[var(--we-cell)]">{res.people.map((p) => <ListRow key={p.id} avatar={<SqAvatar name={p.name} color={p.color} size={44} />} name={p.name} last={[p.handle && `@${p.handle}`, p.school].filter(Boolean).join(" · ")} onClick={() => setOverlay({ t: "contact", id: p.id })} />)}</div></>}
        {res && show("channels") && vids.length > 0 && <><Head t="Channels" /><div className="grid grid-cols-2 gap-2 px-3">{vids.map((p) => (
          <button key={p.id} onClick={() => go({ k: "channels" })} className="overflow-hidden rounded-[8px] bg-[var(--we-cell)] text-left">
            <span className="relative block aspect-[3/4] bg-black">{p.youtubeId ? <img src={`https://i.ytimg.com/vi/${p.youtubeId}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center p-3 text-center text-[14px] text-white" style={{ background: p.grad }}>{p.title}</span>}</span>
            <span className="block truncate px-2 py-2 text-[13.5px] text-[var(--we-text)]">{p.title}</span>
          </button>
        ))}</div></>}
        {res && show("accounts") && res.accounts.length > 0 && <><Head t="Verified Accounts" /><div className="bg-[var(--we-cell)]">{res.accounts.map((a) => <ListRow key={a.id} avatar={<OALogo a={a} size={44} />} name={a.name} tick last={a.about ?? ""} onClick={() => go({ k: "oaProfile", key: a.handle })} />)}</div></>}
        {res && show("articles") && res.articles.length > 0 && <><Head t="Articles" /><div className="bg-[var(--we-cell)]">{res.articles.map((a) => <ListRow key={a.id} avatar={<OALogo a={a.account} size={44} />} name={a.title} last={a.account.name} onClick={() => go({ k: "post", id: a.id })} />)}</div></>}
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

type MiniSub = null | "internships" | "jdi";

/** Birdie's tools. (Printing and tutorials are in Me > Services.) */
function Mini({ onBack }: { onBack: () => void }) {
  const { goBirdie, setDiscoverView: go, setTab, auth, setAuthOpen } = useApp();
  const [sub, setSub] = useState<MiniSub>(null);
  const [recent, setRecent] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("birdie-mini-recent") ?? "[]"); } catch { return []; } });
  useBackLayer(!!sub, () => setSub(null));
  const need = (f: () => void) => () => (auth.status === "in" ? f() : setAuthOpen(true));
  const close = () => setSub(null);

  if (sub === "jdi") return <JustDoIt onBack={close} />;
  if (sub === "internships") return <Internships onBack={close} />;

  const apps: { label: string; color: string; icon: ReactNode; run: () => void }[] = [
    { label: "Internships & SIWES", color: "#7C4DDB", icon: <Briefcase size={26} />, run: () => setSub("internships") },
    { label: "Just Do It", color: "#E2553F", icon: <Zap size={26} />, run: need(() => setSub("jdi")) },
    { label: "Birdie AI", color: "#8A2FA3", icon: <Bot size={26} />, run: () => goBirdie({ courseId: "general" }) },
    { label: "Shared Courses", color: "#2F9E5B", icon: <BookOpen size={26} />, run: () => go({ k: "sharedCourses" }) },
    { label: "My Courses", color: "#D9467E", icon: <BookOpen size={26} />, run: () => { go(null); setTab("study"); } },
  ];
  // Recently Used: the last four you opened, kept on this phone.
  const recentApps = recent.map((l) => apps.find((a) => a.label === l)).filter(Boolean).slice(0, 4) as typeof apps;
  const openApp = (a: (typeof apps)[number]) => () => {
    const next = [a.label, ...recent.filter((l) => l !== a.label)].slice(0, 8);
    setRecent(next); try { localStorage.setItem("birdie-mini-recent", JSON.stringify(next)); } catch { /* ignore */ }
    a.run();
  };
  const tileOf = (a: (typeof apps)[number]) => (
    <button key={a.label} onClick={openApp(a)} className="flex min-w-0 flex-col items-center gap-2 active:opacity-70">
      <span className="flex h-14 w-14 items-center justify-center rounded-full text-white" style={{ background: a.color }}>{a.icon}</span>
      <span className="line-clamp-2 max-w-full px-1 text-center text-[12px] leading-tight text-[var(--we-text)]">{a.label}</span>
    </button>
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="Mini Programs" />
      <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-10 pt-2">
        {recentApps.length > 0 && (
          <div className="rounded-[10px] bg-[var(--we-cell)] px-2 pb-4 pt-3">
            <div className="px-2 pb-3 text-[15px] font-medium text-[var(--we-text)]">Recently Used</div>
            <div className="grid grid-cols-4 gap-y-4">{recentApps.map((a) => tileOf(a))}</div>
          </div>
        )}
        <div className="rounded-[10px] bg-[var(--we-cell)] px-2 pb-4 pt-3">
          <div className="px-2 pb-3 text-[15px] font-medium text-[var(--we-text)]">All Mini Programs</div>
          <div className="grid grid-cols-4 gap-y-4">{apps.map((a) => tileOf(a))}</div>
        </div>
      </div>
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
