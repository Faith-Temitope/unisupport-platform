"use client";

import { isLowEndDevice } from "./perf";
import dynamic from "next/dynamic";
import { PocketDock } from "./Pocket";
import { useOnline } from "./offline";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Check, FastForward, Headset, LayoutDashboard, PenLine, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Entry from "./Entry";
import Mascot from "./Mascot";
import Sheets from "./Sheets";
import Study from "./Study";
import { AppProvider, useApp, type TabId } from "./store";
import { Btn } from "./ui";
import { logEvent } from "./live/analyticsData";
import { accentVars, useDark } from "./theme";
import { TabChats, TabCourses, TabDiscover, TabMe } from "./we";
import { PayToHost, payTo } from "./MeServices";
import { NoticesHost, openAchievements, openNotifications } from "./Notifications";
import { RepDeskHost } from "./RepDesk";

// Screens load only when first opened, so a cheap phone downloads and runs less at startup.
const Discover = dynamic(() => import("./Discover"), { ssr: false });
const Chats = dynamic(() => import("./Chats"), { ssr: false });
const Me = dynamic(() => import("./Me"), { ssr: false });
const Overlays = dynamic(() => import("./Overlays"), { ssr: false });
const Player = dynamic(() => import("./Player"), { ssr: false });
const Recorder = dynamic(() => import("./Recorder"), { ssr: false });
const Settings = dynamic(() => import("./Settings"), { ssr: false });
const Tour = dynamic(() => import("./Tour").then((m) => m.Tour), { ssr: false });
const JoinGroupSheet = dynamic(() => import("./Groups").then((m) => m.JoinGroupSheet), { ssr: false });
const FileViewer = dynamic(() => import("./FileViewer").then((m) => m.FileViewer), { ssr: false });
const PocketSheet = dynamic(() => import("./Pocket").then((m) => m.PocketSheet), { ssr: false });

/** True from the first time `on` is true, and stays true (so a screen keeps its state once opened). */
function useEver(on: boolean) {
  const [ever, setEver] = useState(on);
  if (on && !ever) setEver(true);
  return ever || on;
}

// WeChat-style: Courses, Chats, Discover, Me. Birdie AI and Unisupport Help are pinned at the top of Chats.
const NAV: [TabId, string, typeof TabChats][] = [["chats", "Chats", TabChats], ["study", "Courses", TabCourses], ["explore", "Discover", TabDiscover], ["me", "Me", TabMe]];
const ZOOM = { s: 0.92, m: 1, l: 1.1 } as const;

function Shell() {
  const { tab, setTab, chatView, setChatView, discoverView, setDiscoverView, watch, chatBadge, toast, setPhone, setSlot, settings, resetAll, resetKey, skipHours, flash, goBirdie, goStudy, refreshWallet, setWalletOpen, auth, openByHandle, setAuthOpen, plus, setOverlay, profile, boot, setTourOpen, overlay, watching, minimizeWatch, tourOpen, recorderOpen, pocketOpen, viewFile } = useApp();
  const seen = { explore: useEver(tab === "explore"), chats: useEver(tab === "chats" || auth.status === "in"), me: useEver(tab === "me"), settings: useEver(overlay?.t === "settings"), overlays: useEver((!!overlay && overlay.t !== "settings") || !!watching), player: useEver(!!watching), tour: useEver(tourOpen), recorder: useEver(recorderOpen), pocket: useEver(pocketOpen), viewer: useEver(!!viewFile) };
  const show = (id: TabId) => ({ display: tab === id ? "flex" : "none" });
  // Internal tools (staff app links, timer skip, reset) stay reachable at ?dev=1 for us; real
  // users, testers and Play Store reviewers never see them.
  const [dev, setDev] = useState(false);
  useEffect(() => { setDev(new URLSearchParams(window.location.search).has("dev")); }, []);
  useEffect(() => { void logEvent("page_view", tab); }, [tab]);
  const dark = useDark(settings.theme);
  // Weak phones get calmer motion (fades instead of moving things), which keeps scrolling smooth.
  const [lowEnd] = useState(() => isLowEndDevice());
  const online = useOnline();
  // Bottom nav slides away while scrolling down the Discover feed, and inside any open chat (like WeChat).
  const inChat = tab === "chats" && !!chatView;
  const hideNav = inChat || (tab === "explore" && !!discoverView);
  const [navH, setNavH] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setNavH(e.borderBoxSize?.[0]?.blockSize ?? e.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Once the app is up and idle, fetch the other tabs' code quietly so switching to them is instant,
  // without making the first screen wait for it.
  useEffect(() => {
    if (boot !== "done") return;
    const warm = () => { void import("./Discover"); void import("./Explore"); void import("./Chats"); void import("./Birdie"); void import("./Me"); void import("./Settings"); void import("./Overlays"); };
    const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
    const t = setTimeout(() => (w.requestIdleCallback ? w.requestIdleCallback(warm, { timeout: 4000 }) : warm()), 1500);
    return () => clearTimeout(t);
  }, [boot]);

  // New students get the tour once, right after they set up their profile.
  useEffect(() => {
    if (boot !== "done" || !profile.onboarded) return;
    try { if (localStorage.getItem("birdie-tour-seen")) return; } catch { return; }
    const t = setTimeout(() => setTourOpen(true), 900);
    return () => clearTimeout(t);
  }, [boot, profile.onboarded, setTourOpen]);

  // Tapping a phone notification: ?tab=chats, ?dm=<thread>, ?group=<id>, ?oa=<account>, ?oa_inbox=<account>...
  const openLink = (href: string) => {
    const q = new URL(href, window.location.origin).searchParams;
    const t = q.get("tab"); const chat = q.get("chat"); const group = q.get("group");
    setOverlay(null);
    if (!q.get("watch")) minimizeWatch(); // the link wins over a video that's open full screen
    if (t === "study" || t === "explore" || t === "chats" || t === "me" || t === "birdie" || t === "help") setTab(t);
    if (t === "chats" && !group && !q.get("dm") && !q.get("oa") && !q.get("oa_inbox") && !q.get("friends") && !q.get("oa_post")) setChatView(null); // a link to Chats lands on the list
    if (group) setChatView({ k: "group", id: group });
    if (q.get("dm")) setChatView({ k: "dm", id: q.get("dm")! });
    if (q.get("oa")) setChatView({ k: "oa", id: q.get("oa")! });
    if (q.get("oa_inbox")) setChatView({ k: "manage", id: q.get("oa_inbox")! });
    if (chat) setOverlay({ t: "thread", id: chat });
    if (q.get("friends")) setChatView({ k: "friends" });
    if (q.get("schedule")) { setTab("study"); setTimeout(() => window.dispatchEvent(new Event("birdie-open-schedule")), 50); }
    if (q.get("campus")) { setTab("explore"); setDiscoverView({ k: "stories" }); }
    if (q.get("payto")) payTo(q.get("payto")!, Number(q.get("amount") ?? 0) || undefined);
    if (q.get("oa_post")) setChatView({ k: "post", id: q.get("oa_post")! });
    if (q.get("watch")) watch(q.get("watch")!);
    if (q.get("notifications")) openNotifications();
    if (q.get("achievements")) { setTab("me"); openAchievements(); }
    if (q.get("quiz")) goBirdie({ courseId: q.get("quiz")!, mode: "test" });
    if (q.get("course")) goStudy({ courseId: q.get("course")!, tab: q.get("ctab") ?? "materials" });
    if (t === "explore" || q.get("moments")) { setTab("explore"); setDiscoverView(q.get("moments") ? { k: "moments" } : null); }
  };
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // After saved screens are restored (a microtask), so the link wins over the last screen.
    if (["tab", "chat", "group", "dm", "oa", "oa_inbox", "moments", "oa_post", "watch", "friends", "payto", "schedule", "campus", "notifications", "achievements", "quiz", "course"].some((k) => q.get(k))) { const href = window.location.href; window.history.replaceState(null, "", window.location.pathname); setTimeout(() => openLink(href), 0); }
    const onMsg = (e: MessageEvent) => { if (e.data?.type === "open-link") openLink(e.data.url); };
    const onLink = (e: Event) => { const href = String((e as CustomEvent).detail ?? ""); const u = new URL(href, window.location.origin); if (u.pathname.startsWith("/u/")) void openByHandle(u.pathname.slice(3)); else openLink(href); };
    navigator.serviceWorker?.addEventListener("message", onMsg);
    window.addEventListener("birdie-open-link", onLink);
    return () => { navigator.serviceWorker?.removeEventListener("message", onMsg); window.removeEventListener("birdie-open-link", onLink); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A group invite link (/g/code -> ?join=code): offer to join once signed in.
  const [joinCode, setJoinCode] = useState<string | null>(null);
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("join");
    if (!code) return;
    if (auth.status === "guest" || auth.status === "out") { setAuthOpen(true); return; }
    if (auth.status !== "in") return;
    window.history.replaceState(null, "", window.location.pathname);
    setJoinCode(code);
  }, [auth.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Someone's username link (/u/handle -> ?u=handle): open their channel so you can add and chat.
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get("u");
    if (!u) return;
    if (auth.status === "guest" || auth.status === "out") { setAuthOpen(true); return; }
    if (auth.status !== "in") return;
    window.history.replaceState(null, "", window.location.pathname);
    void openByHandle(u).then((ok) => { if (!ok) flash(`No one on Birdie is called @${u}`); });
  }, [auth.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Coming back from the Paystack checkout: confirm the payment and credit the wallet.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("topup");
    if (!ref) return;
    window.history.replaceState(null, "", window.location.pathname);
    (async () => {
      try {
        const r = await fetch(`/api/wallet/topup/verify?reference=${encodeURIComponent(ref)}`);
        const j = await r.json();
        if (j.status === "paid") { await refreshWallet(); flash("Top-up successful"); setWalletOpen(true); }
        else flash(j.status === "failed" ? "Payment failed" : "Payment not completed");
      } catch { flash("Couldn't confirm the payment"); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MotionConfig reducedMotion={settings.reduceMotion || lowEnd ? "always" : "user"}>
      <div className={`min-h-[100dvh] w-full ${dark ? "bg-[#0B0810]" : "bg-[#EAE2F2]"} lg:flex lg:items-center lg:justify-center lg:px-4 lg:py-8`} style={accentVars(plus ? settings.accent : "purple")}>
        <div className="mx-auto flex w-full max-w-[980px] flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
          <div className="h-[100dvh] w-full overflow-hidden bg-[var(--ink)] lg:h-[844px] lg:w-[390px] lg:max-w-full lg:shrink-0 lg:rounded-[48px] lg:p-[14px] lg:shadow-[0_40px_80px_-20px_rgba(40,10,70,0.55)]">
            <div ref={setPhone} className={`relative h-full w-full overflow-hidden bg-[var(--paper)] text-[var(--text)] lg:rounded-[34px] ${settings.dyslexia ? "dys" : ""} ${dark ? "theme-dark" : ""}`} style={{ zoom: ZOOM[settings.textSize] }}>
              <div className="absolute left-1/2 top-0 z-50 hidden h-[26px] w-[110px] -translate-x-1/2 rounded-b-[18px] bg-[var(--ink)] lg:block" />
              <div className="flex h-full flex-col">
                {!online && <div className="z-20 shrink-0 bg-[#3a2a12] px-4 py-1.5 text-center text-[12px] font-semibold text-[#FFE3A3]">You&apos;re offline. Your courses, notes and downloads still work.</div>}
                <div className="hidden h-12 shrink-0 items-center justify-between px-7 text-[13px] font-semibold text-[var(--text)] lg:flex"><span>9:41</span><span className="tracking-widest">●●●</span></div>
                <div className="relative min-h-0 flex-1">
                  <div key={`s${resetKey}`} className="absolute inset-0 flex-col" style={show("study")}><Study /></div>
                  <div key={`e${resetKey}`} className="absolute inset-0 flex-col" style={show("explore")}>{seen.explore && <Discover active={tab === "explore"} />}</div>
                  <div key={`c${resetKey}`} className="absolute inset-0 flex-col" style={show("chats")}>{seen.chats && <Chats active={tab === "chats"} />}</div>
                  <div key={`m${resetKey}`} className="absolute inset-0 flex-col" style={show("me")}>{seen.me && <Me active={tab === "me"} />}</div>
                </div>
                <div ref={navRef} className="relative z-10 flex shrink-0 items-end justify-around border-t border-[var(--we-sep)] bg-[var(--we-bar)] px-2.5 pb-1 pt-1.5 transition-[margin,transform] duration-200" style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))", marginBottom: hideNav ? -navH : 0, transform: hideNav ? "translateY(calc(100% + 24px))" : undefined }}>
                  {NAV.map(([id, label, Icon]) => {
                    const on = tab === id;
                    // Tapping Chats or Discover while already there goes back to its list.
                    return (<button key={id} onClick={() => { if (id === "chats" && tab === "chats") setChatView(null); else if (id === "explore" && tab === "explore") setDiscoverView(null); else setTab(id); }} className={`relative flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] transition ${on ? "text-[var(--we-accent)]" : "text-[var(--we-text)]"}`}><Icon on={on} />{label}
                      {id === "chats" && chatBadge > 0 && <span className="absolute left-1/2 top-0 ml-2.5 min-w-[17px] rounded-full bg-[var(--we-red)] px-1 text-center text-[10px] font-bold leading-[17px] text-white">{chatBadge > 99 ? "99+" : chatBadge}</span>}</button>);
                  })}
                </div>
              </div>

              <Mascot />
              <PayToHost />
              <NoticesHost />
              <RepDeskHost />
              {seen.recorder && <Recorder />}
              <Sheets />
              {seen.overlays && <Overlays />}
              <PocketDock />
              {seen.pocket && <PocketSheet />}
              {seen.player && <Player bottom={hideNav ? 8 : navH + 22} />}
              {seen.settings && <Settings />}
              <Entry />
              {seen.tour && <Tour />}
              {seen.viewer && <FileViewer />}
              {joinCode && <JoinGroupSheet code={joinCode} onDone={() => setJoinCode(null)} />}
              <AnimatePresence>
                {toast && (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-24 left-1/2 z-[95] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--ink)] px-4 py-3 text-[13px] font-semibold text-[var(--paper)] shadow-xl"><Check size={15} className="text-[#D68BE8]" strokeWidth={3} /> {toast}</motion.div>)}
              </AnimatePresence>
            </div>
          </div>

          {dev ? (
            <aside className="w-full max-w-[390px] shrink-0 space-y-4 pb-8 lg:pb-0 lg:pt-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--uni-deep)]">Dev tools · ?dev=1</div>
              <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Test helpers</div>
                <div className="space-y-2.5">
                  <Btn variant="ghost" onClick={() => skipHours(12)}><span className="inline-flex items-center gap-2"><FastForward size={16} /> Skip 12 hours (recommendation timer)</span></Btn>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Staff apps</div>
                <div className="space-y-2">
                  {([["/prototype/live/staff", "Live staff app", "Real desk + writer app for signed-in staff", Headset], ["/prototype/writer", "Writer app (sample)", "Chats, quotes, delivery, earnings", PenLine], ["/prototype/desk", "Help desk (sample)", "Inbox, assign writers, review queue", Headset], ["/prototype/console", "Team console", "AI brains, pricing, users, revenue", LayoutDashboard]] as const).map(([href, t, sub, Icon]) => (
                    <Link key={href} href={href} className="flex items-center gap-3 rounded-xl bg-[var(--paper-dim)] p-3 transition hover:bg-[var(--uni-soft)]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ink)] text-[#E6B3F2]"><Icon size={17} /></span><span><span className="block text-[14px] font-bold text-[var(--text)]">{t}</span><span className="block text-[12px] text-[var(--dim)]">{sub}</span></span></Link>
                  ))}
                </div>
              </div>
              <div ref={setSlot} className="space-y-4" />
              <button onClick={resetAll} className="flex w-full items-center justify-center gap-2 py-2 text-[13px] font-semibold text-[var(--dim)] hover:text-[var(--text)]"><RotateCcw size={14} /> Reset everything</button>
            </aside>
          ) : (
            <aside className="hidden w-full max-w-[390px] shrink-0 space-y-4 lg:block lg:pt-4">
              <div className="disp flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C05BD6] to-[#8A2FA3] text-[26px] font-bold text-white">B</div>
              <h1 className="disp text-[26px] font-bold leading-tight text-[var(--text)]">Birdie</h1>
              <p className="text-[14px] leading-relaxed text-[var(--dim)]">A study partner that knows your courses. Study, explore, ask Birdie, and get real human help from Unisupport when you need it.</p>
              <div className="flex items-center gap-3 pt-2 text-[12.5px] text-[var(--dim)]"><Link href="/terms" className="hover:text-[var(--text)]">Terms</Link><span>·</span><Link href="/privacy" className="hover:text-[var(--text)]">Privacy</Link></div>
            </aside>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}

export default function Prototype() {
  return (<AppProvider><Shell /></AppProvider>);
}
