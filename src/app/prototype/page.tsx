"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { BookOpen, Check, Compass, FastForward, LifeBuoy, RotateCcw, Users, PenLine, Headset, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import Birdie from "./Birdie";
import Entry from "./Entry";
import Explore from "./Explore";
import Help from "./Help";
import Mascot from "./Mascot";
import Overlays from "./Overlays";
import Recorder from "./Recorder";
import Settings from "./Settings";
import Sheets from "./Sheets";
import Study from "./Study";
import { AppProvider, useApp, type TabId } from "./store";
import { Btn } from "./ui";

const NAV: [TabId, string, typeof Compass | null][] = [["study", "Study", BookOpen], ["explore", "Explore", Compass], ["birdie", "Birdie", null], ["help", "Help", LifeBuoy]];
const ZOOM = { s: 0.92, m: 1, l: 1.1 } as const;

function Shell() {
  const { tab, setTab, toast, setPhone, setSlot, settings, resetAll, resetKey, demoOn, setDemo, skipHours, recommendation, flash, refreshWallet, setWalletOpen } = useApp();
  const show = (id: TabId) => ({ display: tab === id ? "flex" : "none" });

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
    <MotionConfig reducedMotion={settings.reduceMotion ? "always" : "user"}>
      <div className="flex min-h-screen items-center justify-center bg-[#EAE2F2] px-4 py-8">
        <div className="flex w-full max-w-[980px] flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
          <div className="h-[844px] w-[390px] max-w-full shrink-0 rounded-[48px] bg-[var(--ink)] p-[14px] shadow-[0_40px_80px_-20px_rgba(40,10,70,0.55)]">
            <div ref={setPhone} className={`relative h-full w-full overflow-hidden rounded-[34px] bg-[var(--paper)] ${settings.dyslexia ? "dys" : ""}`} style={{ zoom: ZOOM[settings.textSize] }}>
              <div className="absolute left-1/2 top-0 z-50 h-[26px] w-[110px] -translate-x-1/2 rounded-b-[18px] bg-[var(--ink)]" />
              <div className="flex h-full flex-col">
                <div className="flex h-12 shrink-0 items-center justify-between px-7 text-[13px] font-semibold text-[var(--text)]"><span>9:41</span><span className="tracking-widest">●●●</span></div>
                <div className="relative min-h-0 flex-1">
                  <div key={`s${resetKey}`} className="absolute inset-0 flex-col" style={show("study")}><Study /></div>
                  <div key={`e${resetKey}`} className="absolute inset-0 flex-col" style={show("explore")}><Explore active={tab === "explore"} /></div>
                  <div key={`b${resetKey}`} className="absolute inset-0 flex-col" style={show("birdie")}><Birdie active={tab === "birdie"} /></div>
                  <div key={`h${resetKey}`} className="absolute inset-0 flex-col" style={show("help")}><Help active={tab === "help"} /></div>
                </div>
                <div className="flex shrink-0 items-end justify-around bg-[var(--ink)] px-2.5 pb-5 pt-2.5">
                  {NAV.map(([id, label, Icon]) => {
                    const on = tab === id;
                    if (!Icon) return (
                      <button key={id} onClick={() => setTab(id)} className="-translate-y-4 flex flex-col items-center gap-1 text-[11px] font-semibold text-[var(--paper)]" aria-label="Birdie">
                        <span className={`disp flex h-[52px] w-[52px] items-center justify-center rounded-full border-4 border-[var(--ink)] bg-gradient-to-br from-[#C05BD6] to-[#8A2FA3] text-[22px] font-bold text-white transition ${on ? "shadow-[0_8px_24px_-4px_rgba(192,91,214,0.95)]" : "shadow-[0_8px_20px_-6px_rgba(192,91,214,0.6)]"}`}>B</span>{label}
                      </button>
                    );
                    return (<button key={id} onClick={() => setTab(id)} className={`relative flex flex-col items-center gap-1 px-3 py-1.5 text-[11px] font-semibold transition ${on ? "text-[var(--paper)]" : "text-white/45"}`}><Icon size={20} className={on ? "text-[#D68BE8]" : ""} />{label}{id === "study" && recommendation && tab !== "study" && <span className="absolute right-2 top-0.5 h-2 w-2 rounded-full bg-[var(--help)]" />}</button>);
                  })}
                </div>
              </div>

              <Mascot />
              <Recorder />
              <Sheets />
              <Overlays />
              <Settings />
              <Entry />
              <AnimatePresence>
                {toast && (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-24 left-1/2 z-[95] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--ink)] px-4 py-3 text-[13px] font-semibold text-[var(--paper)] shadow-xl"><Check size={15} className="text-[#D68BE8]" strokeWidth={3} /> {toast}</motion.div>)}
              </AnimatePresence>
            </div>
          </div>

          <aside className="w-full max-w-[390px] shrink-0 space-y-4 lg:pt-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--uni-deep)]">Interactive prototype</div>
              <h1 className="disp mt-1 text-[26px] font-bold leading-tight text-[var(--text)]">Birdie, with Unisupport inside Help</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--dim)]">Starts completely empty, like a new user. Everything you add is real inside this session: notes, files, recordings, posts, chats.</p>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Test helpers</div>
              <div className="space-y-2.5">
                <Btn variant={demoOn ? "birdie" : "ghost"} onClick={() => setDemo(!demoOn)}><span className="inline-flex items-center gap-2"><Users size={16} /> Demo community: {demoOn ? "on" : "off"}</span></Btn>
                <p className="text-[12px] leading-snug text-[var(--dim)]">Adds a few sample students, posts and shared courses so you can try follow, chat and shared-course chat with no other users. Clearly separate from your own data.</p>
                <Btn variant="ghost" onClick={() => skipHours(12)}><span className="inline-flex items-center gap-2"><FastForward size={16} /> Skip 12 hours (recommendation timer)</span></Btn>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">The other apps</div>
              <div className="space-y-2">
                {([["/prototype/live/staff", "Live staff app", "Real desk + writer app for signed-in staff", Headset], ["/prototype/writer", "Writer app (sample)", "Chats, quotes, delivery, earnings", PenLine], ["/prototype/desk", "Help desk (sample)", "Inbox, assign writers, review queue", Headset], ["/prototype/console", "Team console", "AI brains, pricing, users, revenue", LayoutDashboard]] as const).map(([href, t, sub, Icon]) => (
                  <Link key={href} href={href} className="flex items-center gap-3 rounded-xl bg-[var(--paper-dim)] p-3 transition hover:bg-[var(--uni-soft)]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ink)] text-[#E6B3F2]"><Icon size={17} /></span><span><span className="block text-[14px] font-bold text-[var(--text)]">{t}</span><span className="block text-[12px] text-[var(--dim)]">{sub}</span></span></Link>
                ))}
              </div>
            </div>

            <div ref={setSlot} className="space-y-4" />
            <button onClick={resetAll} className="flex w-full items-center justify-center gap-2 py-2 text-[13px] font-semibold text-[var(--dim)] hover:text-[var(--text)]"><RotateCcw size={14} /> Reset everything</button>
          </aside>
        </div>
      </div>
    </MotionConfig>
  );
}

export default function Prototype() {
  return (<AppProvider><Shell /></AppProvider>);
}
