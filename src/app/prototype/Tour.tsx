"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { Backpack, BookOpen, Briefcase, Clapperboard, Coins, Crown, FolderTree, GraduationCap, Heart, LifeBuoy, Megaphone, Mic, Printer, Sparkles, Users, WifiOff, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import Buddy, { type Skin } from "@/components/brand/Buddy";
import { useApp } from "./store";

type Slide = { kicker: string; title: string; body?: string; points: [LucideIcon, string][]; skin: Skin; reading?: boolean; bg: string; mood?: "happy" | "love" | "idle" };

// What a new student needs to see to "get it": what Birdie does, and how it pays them back.
const SLIDES: Slide[] = [
  { kicker: "Welcome to Birdie", title: "Study smarter. Get help fast. Earn from what you know.", body: "Your courses, a study partner that knows them, the best videos from other students, and real people when you're stuck. One app.", points: [], skin: "robot", mood: "happy", bg: "from-[#2A1640] to-[#120B1C]" },
  { kicker: "Study", title: "Every course, organised the way your school is", points: [[FolderTree, "Folders for school, level and semester, as deep as you need"], [BookOpen, "Slides, PDFs, notes and photos of the board in one place"], [Mic, "Record a lecture and Birdie writes it up for you"], [WifiOff, "Deadlines, streaks and a focus timer. Works offline too"]], skin: "robot", reading: true, bg: "from-[#3B2A7A] to-[#1A1240]" },
  { kicker: "Birdie AI", title: "A study partner that has read your notes", points: [[Sparkles, "Ask anything. It answers from your material first"], [GraduationCap, "\"Teach me step by step\": it explains, then checks you got it"], [BookOpen, "Quizzes and exam practice, marked for you"], [Clapperboard, "Narrated video lessons made from your notes"]], body: "Free on Spark, as much as you need.", skin: "robot", mood: "happy", bg: "from-[#6E2A80] to-[#2A1640]" },
  { kicker: "Explore", title: "Learn from students like you", points: [[Clapperboard, "Videos picked for what you study, and new things to discover"], [Users, "Follow creators, comment, make playlists"], [Megaphone, "Campus & deals: student offers near your school"]], skin: "bird", mood: "happy", bg: "from-[#1F5FD1] to-[#16224A]" },
  { kicker: "Earn", title: "Your notes are worth money", points: [[BookOpen, "Share a course for free, or set a price"], [Coins, "Classmates buy it and you keep 90%"], [Users, "You choose what's inside and who sees it: your school, state or country"]], body: "Good notes help a whole class. Now they pay you too.", skin: "me", mood: "love", bg: "from-[#0E7F55] to-[#0B2B22]" },
  { kicker: "More ways to earn", title: "Teach, lead your class, build a following", points: [[GraduationCap, "Host tutorials before exams. Free or paid, you keep 90%"], [Crown, "Course reps earn 5% of what their class buys on Birdie"], [Clapperboard, "Post videos and grow a channel"], [Sparkles, "The first creators get the Founding Creator badge, never given again"]], skin: "bird", mood: "happy", bg: "from-[#C9971F] to-[#3a2a0a]" },
  { kicker: "Help", title: "Real people when you're stuck", points: [[LifeBuoy, "Chat with Unisupport. They connect you with a writer, pinned in your chats"], [BookOpen, "Share a course in any chat so they see your notes"], [Printer, "Print, bind or handwrite your work, picked up or delivered"], [Briefcase, "Internships and SIWES near you"]], skin: "robot", bg: "from-[#E2553F] to-[#3a1410]" },
  { kicker: "Your study buddy", title: "It studies with you. Mostly.", points: [[BookOpen, "Reads a book with you when you focus. Naps if you poked it too much"], [Heart, "Covers its eyes while you type. Sometimes peeks"], [Backpack, "Holds files, videos and chats for you. Tap the backpack"], [Users, "Meets your friends' buddies when you chat"]], skin: "spider", reading: true, bg: "from-[#4a3a66] to-[#1a1024]" },
  { kicker: "Free to start", title: "Plus when you want more", points: [[Sparkles, "Free: Spark AI, courses, chats, downloads, dark mode"], [Crown, "Birdie Plus: post videos, ChatGPT and Claude, unlimited lessons, no ads, extra buddies"], [Coins, "₦1,500 a month, or an ₦800 Exam Pass for 14 days"], [Heart, "A parent can top up your balance with a link, no account needed"]], skin: "bird", mood: "love", bg: "from-[#8A2FA3] to-[#2A1640]" },
];

/** First-run tour (also in Settings > How Birdie works, and before sign-in). Swipe or tap through. */
export function Tour() {
  const { tourOpen, setTourOpen, setTab, setOverlay, auth, profile } = useApp();
  const [i, setI] = useState(0);
  const last = SLIDES.length;            // the final "let's go" screen
  const close = () => { setTourOpen(false); setI(0); try { localStorage.setItem("birdie-tour-seen", "1"); } catch { /* ignore */ } };
  const go = (n: number) => setI(Math.max(0, Math.min(last, n)));
  const swipe = (_: unknown, info: PanInfo) => { if (info.offset.x < -50) go(i + 1); else if (info.offset.x > 50) go(i - 1); };
  const s = SLIDES[i];
  const signedIn = auth.status === "in" || auth.status === "guest";

  return (
    <AnimatePresence>
      {tourOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[130] flex flex-col bg-[#120B1C] text-white">
          <div className="flex shrink-0 gap-1 px-4 pt-4">{[...SLIDES, null].map((_, k) => (<button key={k} onClick={() => go(k)} aria-label={`Step ${k + 1}`} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"><span className={`block h-full rounded-full bg-white transition-all ${k <= i ? "w-full" : "w-0"}`} /></button>))}</div>
          <div className="flex shrink-0 items-center justify-between px-4 pt-3">
            <span className="text-[12px] font-semibold text-white/60">{i < last ? `${i + 1} of ${last}` : "Ready"}</span>
            <button onClick={close} aria-label="Close" className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold">{i < last ? "Skip" : <X size={15} />}</button>
          </div>

          <motion.div key={i} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25} onDragEnd={swipe} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", damping: 26, stiffness: 260 }} className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
            {i < last ? (<>
              <div className={`relative mx-4 mt-4 flex h-[200px] shrink-0 items-center justify-center overflow-hidden rounded-[28px] bg-gradient-to-br ${s.bg}`}>
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #fff3 0, transparent 40%), radial-gradient(circle at 80% 70%, #fff2 0, transparent 35%)" }} />
                {s.points.slice(0, 3).map(([Icon], k) => (
                  <motion.span key={k} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }} transition={{ delay: 0.2 + k * 0.15, y: { duration: 3, repeat: Infinity, delay: k * 0.4 } }}
                    className="absolute flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur" style={{ left: ["12%", "72%", "16%"][k], top: ["18%", "22%", "62%"][k] }}><Icon size={20} /></motion.span>
                ))}
                <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}><Buddy skin={s.skin} size={108} mood={s.mood ?? "idle"} reading={s.reading} initials={(profile.name || "Me").slice(0, 2).toUpperCase()} /></motion.div>
              </div>
              <div className="px-6 pt-6">
                <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#E6B3F2]">{s.kicker}</div>
                <h2 className="disp mt-1.5 text-[26px] font-bold leading-[1.15]">{s.title}</h2>
                {s.body && <p className="mt-2 text-[14.5px] leading-relaxed text-white/75">{s.body}</p>}
                <div className="mt-4 space-y-2.5">{s.points.map(([Icon, text], k) => (
                  <motion.div key={text} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + k * 0.08 }} className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#E6B3F2]"><Icon size={16} /></span><span className="pt-1 text-[14px] leading-snug">{text}</span>
                  </motion.div>
                ))}</div>
              </div>
            </>) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <Buddy skin="robot" size={120} mood="love" />
                <h2 className="disp mt-5 text-[28px] font-bold leading-tight">Your first three minutes</h2>
                <p className="mt-2 text-[14.5px] leading-relaxed text-white/75">Make one course, ask Birdie one question, and watch one video. You&apos;ll see why students stay.</p>
                <div className="mt-6 w-full space-y-2.5">
                  {signedIn ? (<>
                    <button onClick={() => { close(); setOverlay(null); setTab("study"); }} className="w-full rounded-2xl bg-white py-3.5 text-[15px] font-bold text-[#1a1024]">Create my first course</button>
                    <button onClick={() => { close(); setOverlay(null); setTab("birdie"); }} className="w-full rounded-2xl bg-white/12 py-3.5 text-[15px] font-semibold ring-1 ring-white/20">Ask Birdie something</button>
                    <button onClick={() => { close(); setOverlay(null); setTab("explore"); }} className="w-full rounded-2xl bg-white/12 py-3.5 text-[15px] font-semibold ring-1 ring-white/20">See what&apos;s on Explore</button>
                  </>) : (
                    <button onClick={close} className="w-full rounded-2xl bg-white py-3.5 text-[15px] font-bold text-[#1a1024]">Create my free account</button>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {i < last && (
            <div className="flex shrink-0 items-center gap-3 px-6 pb-6 pt-3">
              {i > 0 && <button onClick={() => go(i - 1)} className="rounded-2xl bg-white/10 px-5 py-3.5 text-[15px] font-semibold">Back</button>}
              <button onClick={() => go(i + 1)} className="flex-1 rounded-2xl bg-gradient-to-r from-[#C05BD6] to-[#8A2FA3] py-3.5 text-[15px] font-bold">{i === 0 ? "Show me how" : "Next"}</button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
