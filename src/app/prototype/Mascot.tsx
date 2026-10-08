"use client";

import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import { Backpack, MessageCircle, Mic, PlusSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Mood } from "@/components/brand/Bot";
import Buddy, { Bed, type Cover } from "@/components/brand/Buddy";
import { initials } from "./PostCard";
import { firstName, useApp } from "./store";

const TIPS: Record<string, string[]> = {
  study: ["Add a note and I'll quiz you on it.", "Streaks are fun. Keep yours alive!", "Tap New to make a course or folder."],
  explore: ["Ooh, that video looks good.", "Follow someone whose videos help you.", "Share your course with your class!"],
  birdie: ["Ask me anything from your notes.", "Try Teach me step by step.", "Quiz yourself. I dare you."],
  help: ["Unisupport can help when I can't.", "Stuck? Message the help desk.", "Share a course in the chat so they see your notes."],
  any: ["Time for some water?", "Stretch your shoulders for a sec.", "You're doing great, {name}."],
};
const BACK = ["I'm back! Did you miss me?", "Just went to get snacks.", "*sneaks back in*", "Okay, where were we?"];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
const S = 64, RIGHT = 10, BOTTOM = 232;

/**
 * The study buddy. It wanders (sometimes right off the screen), chats, reacts to what you do,
 * holds a grudge if you keep poking it, reads a book with you during a focus session (or drags
 * out a bed and naps if it's sulking), and covers its eyes while you type, though it might peek.
 */
export default function Mascot() {
  const { tab, phone, overlay, setOverlay, setRecorderOpen, mascotEvent, settings, profile, focusEndsAt, plus, pocket, setPocketOpen } = useApp();
  const x = useMotionValue(0), y = useMotionValue(0);
  const [mood, setMood] = useState<Mood>("idle");
  const [bubble, setBubble] = useState<{ text: string; id: number } | null>(null);
  const [talking, setTalking] = useState(false);
  const [walking, setWalking] = useState(false);
  const [feet, setFeet] = useState<0 | 1>(0);
  const [tilt, setTilt] = useState(0);
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(true);
  const [alignRight, setAlignRight] = useState(true);
  const [activity, setActivity] = useState<"none" | "read" | "bed">("none");
  const [cover, setCover] = useState<Cover>("none");
  const W = phone?.clientWidth ?? 362, H = phone?.clientHeight ?? 816;
  const minX = -(W - S - RIGHT * 2), maxY = BOTTOM - 96, minY = -(H - S - BOTTOM - 70);

  const ctl = useRef<{ stop: () => void } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const taps = useRef<number[]>([]);
  const awayUntil = useRef(0);
  const offscreen = useRef(false);
  const dragging = useRef(false);
  const pressT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const petted = useRef(0);
  const greeted = useRef(false);
  const busy = useRef(false);
  const speaking = useRef(false);
  const grudge = useRef(0);          // goes up when you poke it, fades over a few minutes
  const typing = useRef(false);
  const st = useRef({ open: false, overlay: false, focus: false, tab: tab as string, chatty: true, name: "" });
  st.current = { open, overlay: !!overlay, focus: !!focusEndsAt, tab, chatty: settings.mascotChatty, name: firstName(profile) };
  // Extra looks and the sign board are Birdie Plus.
  const skin = plus ? settings.mascotSkin ?? "robot" : "robot";
  const board = plus && !!settings.mascotBoard;

  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); }, []);
  useEffect(() => () => { timers.current.forEach(clearTimeout); ctl.current?.stop(); }, []);
  // Grudges fade: one point every 90 seconds.
  useEffect(() => { const i = setInterval(() => { grudge.current = Math.max(0, grudge.current - 1); }, 90000); return () => clearInterval(i); }, []);

  const place = useCallback(() => {
    const cx = W - S - RIGHT + x.get() + S / 2, cy = H - S - BOTTOM + y.get() + S / 2;
    setAbove(board || cy > 260); setAlignRight(cx > W / 2);
  }, [W, H, x, y, board]);

  const say = useCallback((text: string, ms = 4200) => {
    if (offscreen.current) return;
    place();
    const id = Date.now(); speaking.current = true; setBubble({ text, id }); setTalking(true);
    later(() => setTalking(false), Math.min(ms - 500, 2600));
    later(() => { setBubble((b) => (b?.id === id ? null : b)); speaking.current = false; }, ms);
  }, [later, place]);
  const feel = useCallback((m: Mood, ms: number) => { setMood(m); later(() => setMood((cur) => (cur === m ? "idle" : cur)), ms); }, [later]);

  const walkTo = useCallback((target: number, speed = 55, after?: () => void) => {
    const dist = Math.abs(target - x.get()); if (dist < 8) { after?.(); return; }
    ctl.current?.stop(); setWalking(true); setTilt(target < x.get() ? -5 : 5);
    ctl.current = animate(x, target, { duration: dist / speed, ease: "easeInOut", onComplete: () => { setWalking(false); setTilt(0); after?.(); } });
  }, [x]);

  useEffect(() => { if (!walking) return; const i = setInterval(() => setFeet((f) => (f ? 0 : 1)), 170); return () => clearInterval(i); }, [walking]);

  // Focus session: it studies with you (book), unless it's sulking, then it drags out a bed.
  useEffect(() => {
    if (!settings.mascotOn) return;
    if (!focusEndsAt) { later(() => { setActivity("none"); setMood((m) => (m === "sleepy" ? "idle" : m)); }, 0); return; }
    const sulking = grudge.current >= 2 || Math.random() < 0.15;
    later(() => {
      ctl.current?.stop(); setWalking(false);
      if (sulking) { setActivity("bed"); setMood("sleepy"); if (st.current.chatty) say(grudge.current >= 2 ? "Hmph. You poked me. I'm napping instead." : "Wake me when it's over...", 4200); }
      else { setActivity("read"); setMood("idle"); if (st.current.chatty) say("Let's study! I brought my book.", 3600); }
    }, 300);
    // Halfway through a nap it sometimes gives in and reads.
    const t = setInterval(() => { if (grudge.current < 2) setActivity((a) => (a === "bed" && Math.random() < 0.4 ? "read" : a)); }, 120000);
    return () => clearInterval(t);
  }, [focusEndsAt, settings.mascotOn]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (activity === "bed") setMood("sleepy"); }, [activity]);

  // Privacy: while you type anywhere in the app it covers its eyes... and sometimes peeks.
  useEffect(() => {
    if (!phone || !settings.mascotOn) return;
    let peekT: ReturnType<typeof setTimeout> | null = null;
    const isField = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA") && (t as HTMLInputElement).type !== "file";
    const schedulePeek = () => {
      peekT = setTimeout(() => {
        if (!typing.current) return;
        setCover("peek");
        setTimeout(() => { if (typing.current) setCover("both"); schedulePeek(); }, 1600);
      }, rand(5000, 11000));
    };
    const onIn = (e: FocusEvent) => { if (!isField(e.target)) return; typing.current = true; setCover("both"); if (peekT) clearTimeout(peekT); schedulePeek(); };
    const onOut = (e: FocusEvent) => { if (!isField(e.target)) return; typing.current = false; if (peekT) clearTimeout(peekT); setTimeout(() => { if (!typing.current) setCover("none"); }, 250); };
    phone.addEventListener("focusin", onIn); phone.addEventListener("focusout", onOut);
    return () => { phone.removeEventListener("focusin", onIn); phone.removeEventListener("focusout", onOut); if (peekT) clearTimeout(peekT); };
  }, [phone, settings.mascotOn]);

  useEffect(() => {
    if (!mascotEvent || !settings.mascotOn) return;
    const { kind, text } = mascotEvent;
    if (kind === "love") feel("love", 3200); else if (kind === "happy") feel("happy", 2600); else if (kind === "sad") feel("cry", 3800); else if (kind === "angry") feel("angry", 2600);
    if (text && (settings.mascotChatty || kind === "love")) say(text, 3800);
  }, [mascotEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (greeted.current || !settings.mascotOn || !profile.onboarded) return;
    greeted.current = true;
    later(() => { if (st.current.chatty) { setMood("happy"); say(`Hi ${st.current.name}! Tap me, drag me, or poke me... if you dare.`, 5000); later(() => setMood("idle"), 2200); } }, 1800);
  }, [profile.onboarded, settings.mascotOn, later, say]);

  // Wandering and small talk. Now and then it walks right off the screen and comes back later.
  useEffect(() => {
    if (!settings.mascotOn) return;
    let alive = true;
    const free = () => !busy.current && !speaking.current && !st.current.open && !st.current.overlay && !st.current.focus && !dragging.current && !typing.current && Date.now() > awayUntil.current;
    const wander = () => {
      if (!alive) return;
      if (free()) {
        if (Math.random() < 0.14) {
          const leftSide = Math.random() < 0.5, out = leftSide ? minX - S - 30 : S + RIGHT + 30;
          if (st.current.chatty && Math.random() < 0.5) say(pick(["Brb!", "Gotta go do bird things.", "Be right back..."]), 1600);
          busy.current = true;
          later(() => walkTo(out, 90, () => {
            offscreen.current = true;
            later(() => { y.set(rand(minY * 0.6, maxY * 0.5)); walkTo(leftSide ? minX * 0.8 : -20, 70, () => { offscreen.current = false; busy.current = false; if (st.current.chatty) say(pick(BACK), 3000); }); }, rand(9000, 22000));
          }), 900);
        } else walkTo(minX * Math.random(), 50, () => { if (Math.random() < 0.35 && st.current.chatty && !speaking.current) say(pick(TIPS[st.current.tab] ?? TIPS.any).replace("{name}", st.current.name)); });
      }
      later(wander, rand(11000, 20000));
    };
    const chat = () => {
      if (!alive) return;
      if (free() && st.current.chatty && !offscreen.current) say(pick(Math.random() < 0.6 ? TIPS[st.current.tab] : TIPS.any).replace("{name}", st.current.name), 4200);
      later(chat, rand(38000, 62000));
    };
    later(wander, rand(6000, 11000)); later(chat, rand(25000, 40000));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.mascotOn]);
  useEffect(() => { if (overlay) setOpen(false); }, [overlay]);

  function poke() {
    const t = Date.now();
    taps.current = [...taps.current.filter((n) => t - n < 1100), t];
    const n = taps.current.length;
    // Caught peeking while you type.
    if (cover === "peek") { setCover("both"); feel("happy", 1500); say("I wasn't looking! Promise.", 2400); return; }
    if (activity === "bed") { feel("angry", 1800); say(pick(["Five more minutes...", "Shhh. Sleeping.", "Go study. I'm resting."]), 2400); grudge.current += 1; return; }
    if (grudge.current >= 3 && n === 1) { feel("angry", 1800); say(pick(["Hmph. Not talking to you.", "Oh, NOW you want me?", "I remember what you did."]), 2600); grudge.current = Math.max(0, grudge.current - 1); return; }
    if (Date.now() < awayUntil.current) { setOpen(false); feel("cry", 3000); say("Why are you like this? *sniff*", 3200); grudge.current += 1; return; }
    if (n === 1) { place(); setOpen((o) => !o); return; }
    setOpen(false); grudge.current += 1;
    if (n === 2 || n === 3) { feel("angry", 2400); say(n === 2 ? "Hey! Stop poking me!" : "I said STOP!", 2400); return; }
    busy.current = true; taps.current = []; grudge.current += 2;
    feel("angry", 1600); say("That's it. I'm out!", 1800);
    const far = x.get() < minX / 2 ? 0 : minX;
    awayUntil.current = Date.now() + 9000;
    later(() => walkTo(far, 420, () => { busy.current = false; say("Catch me if you can!", 3000); feel("happy", 2000); }), 500);
  }

  const startPress = () => { if (pressT.current) clearTimeout(pressT.current); pressT.current = setTimeout(() => { petted.current = Date.now(); if (!dragging.current) { setOpen(false); grudge.current = Math.max(0, grudge.current - 2); feel("love", 3000); say(grudge.current ? "Okay... I forgive you a little." : "Hehe, that tickles!", 3000); } }, 650); };
  const endPress = () => { if (pressT.current) { clearTimeout(pressT.current); pressT.current = null; } };

  const pocketItem = { label: pocket.length ? `Holding (${pocket.length})` : "Hold this for me", sub: pocket.length ? "Open what I'm keeping for you" : "Tap the backpack on a file, video or chat", icon: Backpack, run: () => setPocketOpen(true) };
  const items = tab === "explore"
    ? [pocketItem, { label: "Chat", sub: "Talk to people you know", icon: MessageCircle, run: () => setOverlay({ t: "chats" }) }, { label: "Post", sub: "Upload or write for Explore", icon: PlusSquare, run: () => setOverlay({ t: "post" }) }]
    : [pocketItem, { label: "Record", sub: "Capture a lecture", icon: Mic, run: () => setRecorderOpen(true) }, { label: "Chat", sub: "Talk to people you know", icon: MessageCircle, run: () => setOverlay({ t: "chats" }) }];

  if (overlay || !settings.mascotOn) return null;
  const sleeping = activity === "bed";
  return (
    <motion.div
      drag dragMomentum={false} dragElastic={0.08}
      dragConstraints={{ left: minX, right: 0, top: minY, bottom: maxY }}
      onDragStart={() => { dragging.current = true; endPress(); ctl.current?.stop(); setWalking(false); setTilt(0); setOpen(false); }}
      onDragEnd={() => { dragging.current = false; place(); }}
      onPointerDown={startPress} onPointerUp={endPress}
      onTap={() => { if (Date.now() - petted.current < 400) return; poke(); }}
      className="absolute z-[55] cursor-grab touch-none active:cursor-grabbing"
      style={{ right: RIGHT, bottom: BOTTOM, width: S, height: S, x, y }}
    >
      {sleeping && <div className="pointer-events-none absolute" style={{ left: -26, top: 26 }}><Bed width={110} /></div>}
      <motion.div
        animate={sleeping ? { rotate: -78, x: -6, y: 14 } : mood === "angry" ? { x: [0, -3, 3, -3, 3, 0], y: 0, rotate: 0 } : mood === "cry" ? { y: [0, 1.5, 0], rotate: [0, -2, 2, 0] } : walking ? { y: [0, -3, 0], rotate: tilt } : mood === "happy" || mood === "love" ? { y: [0, -9, 0], rotate: 0 } : { y: [0, -3, 0], rotate: 0 }}
        transition={sleeping ? { duration: 0.6 } : mood === "angry" ? { duration: 0.35, repeat: Infinity } : walking ? { duration: 0.34, repeat: Infinity } : mood === "happy" || mood === "love" ? { duration: 0.5, repeat: 3 } : mood === "cry" ? { duration: 0.6, repeat: Infinity } : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        className="drop-shadow-[0_10px_14px_rgba(80,20,110,0.35)]"
      >
        <Buddy skin={skin} size={S} mood={mood} talking={talking} feet={feet} showFeet={walking} cover={sleeping ? "none" : cover} reading={activity === "read"} color="#A63FBD" initials={initials(profile.name || "Me")} />
      </motion.div>
      {sleeping && <div className="pointer-events-none absolute h-4 rounded-sm bg-[#7C4DDB]" style={{ left: 10, top: 44, width: 64 }} />}
      {/* Carrying things for you: a little backpack with a count. */}
      {pocket.length > 0 && !sleeping && <span className="pointer-events-none absolute -left-1 bottom-1 flex h-6 items-center gap-0.5 rounded-full bg-[#8a5a3c] px-1.5 text-[10px] font-bold text-white shadow"><Backpack size={11} />{pocket.length}</span>}

      <AnimatePresence>
        {mood === "love" && [0, 1, 2].map((i) => (<motion.span key={`h${i}`} initial={{ opacity: 0, y: 10, scale: 0.6 }} animate={{ opacity: [0, 1, 0], y: -34 - i * 8, scale: 1 }} transition={{ duration: 1.4, delay: i * 0.25, repeat: 2 }} className="pointer-events-none absolute text-[15px]" style={{ left: 14 + i * 14, top: -6 }}>❤️</motion.span>))}
        {mood === "cry" && [0, 1].map((i) => (<motion.span key={`t${i}`} initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: 22 }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.3 }} className="pointer-events-none absolute h-2 w-1.5 rounded-full bg-[#5CC8FF]" style={{ left: i ? 39 : 23, top: 30 }} />))}
        {mood === "angry" && [0, 1].map((i) => (<motion.span key={`a${i}`} initial={{ opacity: 0, y: 0, scale: 0.5 }} animate={{ opacity: [0, 0.9, 0], y: -22, scale: 1.2 }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.25 }} className="pointer-events-none absolute text-[13px]" style={{ left: i ? 46 : 4, top: 0 }}>💢</motion.span>))}
        {mood === "sleepy" && [0, 1].map((i) => (<motion.span key={`z${i}`} initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: -26, x: 8 }} transition={{ duration: 2.2, repeat: Infinity, delay: i * 1 }} className="pointer-events-none absolute text-[12px] font-bold text-[#B98AD6]" style={{ left: sleeping ? 4 : 44, top: sleeping ? 18 : 4 }}>z</motion.span>))}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {bubble && !open && (board ? (
          // Sign style: a little board hanging from strings above its head.
          <motion.div key={bubble.id} initial={{ opacity: 0, y: -10, rotate: -6 }} animate={{ opacity: 1, y: 0, rotate: [-4, 3, -2, 0] }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.6 }}
            className={`pointer-events-none absolute bottom-[70px] w-max max-w-[180px] ${alignRight ? "right-[-4px]" : "left-[-4px]"}`} style={{ transformOrigin: "50% 100%" }}>
            <div className="rounded-md border-2 border-[#6b4226] bg-[#E9C48A] px-3 py-2 text-center text-[12.5px] font-bold leading-snug text-[#3a2410] shadow-[0_8px_18px_-6px_rgba(60,30,10,0.5)]">{bubble.text}</div>
            <div className="mx-auto flex w-[60%] justify-between"><span className="h-4 w-px bg-[#6b4226]" /><span className="h-4 w-px bg-[#6b4226]" /></div>
          </motion.div>
        ) : (
          <motion.div key={bubble.id} initial={{ opacity: 0, scale: 0.85, y: above ? 6 : -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
            onPointerDownCapture={(e) => e.stopPropagation()}
            className={`pointer-events-none absolute w-max max-w-[190px] rounded-2xl bg-white px-3 py-2 text-[12.5px] font-semibold leading-snug text-[var(--text)] shadow-[0_10px_28px_-8px_rgba(60,20,90,0.5)] ring-1 ring-[var(--line)] ${above ? "bottom-[76px]" : "top-[76px]"} ${alignRight ? "right-0" : "left-0"}`}>
            {bubble.text}
            <span className={`absolute h-2.5 w-2.5 rotate-45 bg-white ring-1 ring-[var(--line)] ${above ? "-bottom-1 border-b border-r" : "-top-1"} ${alignRight ? "right-6" : "left-6"}`} style={{ clipPath: above ? "polygon(100% 0, 100% 100%, 0 100%)" : "polygon(0 0, 100% 0, 0 100%)" }} />
          </motion.div>
        ))}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            onPointerDownCapture={(e) => e.stopPropagation()}
            className={`absolute w-[200px] rounded-2xl bg-white p-1.5 shadow-[0_18px_40px_-10px_rgba(60,20,90,0.45)] ring-1 ring-[var(--line)] ${above ? "bottom-[72px]" : "top-[72px]"} ${alignRight ? "right-0" : "left-0"}`}>
            {items.map((it) => (
              <button key={it.label} onClick={() => { setOpen(false); it.run(); }} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left active:bg-[var(--paper-dim)]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--uni-soft)] text-[var(--uni-deep)]"><it.icon size={17} /></span>
                <span><span className="block text-[14px] font-bold text-[var(--text)]">{it.label}</span><span className="block text-[11.5px] leading-tight text-[var(--dim)]">{it.sub}</span></span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
