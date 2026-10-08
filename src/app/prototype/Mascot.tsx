"use client";

import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import { MessageCircle, Mic, PlusSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Bot, { type Mood } from "@/components/brand/Bot";
import { firstName, useApp } from "./store";

const TIPS: Record<string, string[]> = {
  study: ["Add a note and I'll quiz you on it.", "Streaks are fun. Keep yours alive!", "Tap New to make a course or folder."],
  explore: ["Ooh, hover a video to preview it.", "Follow someone whose videos help you.", "Share your course with your class!"],
  birdie: ["Ask me anything from your notes.", "Try Test mode. I dare you.", "I only answer from what you've taught me."],
  help: ["Unisupport can help when I can't.", "Stuck? Message the help desk.", "Share a course in the chat so they see your notes."],
  any: ["Time for some water?", "Stretch your shoulders for a sec.", "You're doing great, {name}."],
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const S = 64, RIGHT = 10, BOTTOM = 232;

export default function Mascot() {
  const { tab, phone, overlay, setOverlay, setRecorderOpen, mascotEvent, settings, profile, focusEndsAt } = useApp();
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
  const W = phone?.clientWidth ?? 362, H = phone?.clientHeight ?? 816;
  const minX = -(W - S - RIGHT * 2), maxY = BOTTOM - 96, minY = -(H - S - BOTTOM - 70);

  const ctl = useRef<{ stop: () => void } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const taps = useRef<number[]>([]);
  const awayUntil = useRef(0);
  const dragging = useRef(false);
  const pressT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const petted = useRef(0);
  const greeted = useRef(false);
  const busy = useRef(false);
  const speaking = useRef(false);
  const st = useRef({ open: false, overlay: false, focus: false, tab: tab as string, chatty: true, name: "" });
  st.current = { open, overlay: !!overlay, focus: !!focusEndsAt, tab, chatty: settings.mascotChatty, name: firstName(profile) };

  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); }, []);
  useEffect(() => () => { timers.current.forEach(clearTimeout); ctl.current?.stop(); }, []);

  const place = useCallback(() => {
    const cx = W - S - RIGHT + x.get() + S / 2, cy = H - S - BOTTOM + y.get() + S / 2;
    setAbove(cy > 260); setAlignRight(cx > W / 2);
  }, [W, H, x, y]);

  const say = useCallback((text: string, ms = 4200) => {
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

  // little steps
  useEffect(() => { if (!walking) return; const i = setInterval(() => setFeet((f) => (f ? 0 : 1)), 170); return () => clearInterval(i); }, [walking]);

  // sleepy while you focus
  useEffect(() => { if (focusEndsAt) { setMood("sleepy"); } else setMood((m) => (m === "sleepy" ? "idle" : m)); }, [focusEndsAt]);

  // emotions pushed from the rest of the app
  useEffect(() => {
    if (!mascotEvent || !settings.mascotOn) return;
    const { kind, text } = mascotEvent;
    if (kind === "love") feel("love", 3200); else if (kind === "happy") feel("happy", 2600); else if (kind === "sad") feel("cry", 3800); else if (kind === "angry") feel("angry", 2600);
    if (text && (settings.mascotChatty || kind === "love")) say(text, 3800);
  }, [mascotEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  // greeting
  useEffect(() => {
    if (greeted.current || !settings.mascotOn || !profile.onboarded) return;
    greeted.current = true;
    later(() => { if (st.current.chatty) { setMood("happy"); say(`Hi ${st.current.name}! Tap me, drag me, or poke me... if you dare.`, 5000); later(() => setMood("idle"), 2200); } }, 1800);
  }, [profile.onboarded, settings.mascotOn, later, say]);

  // wandering + small talk
  useEffect(() => {
    if (!settings.mascotOn) return;
    let alive = true;
    const free = () => !busy.current && !speaking.current && !st.current.open && !st.current.overlay && !st.current.focus && !dragging.current && Date.now() > awayUntil.current;
    const wander = () => {
      if (!alive) return;
      if (free()) walkTo(minX * Math.random(), 50, () => { if (Math.random() < 0.35 && st.current.chatty && !speaking.current) say(pick(TIPS[st.current.tab] ?? TIPS.any).replace("{name}", st.current.name)); });
      later(wander, rand(11000, 20000));
    };
    const chat = () => {
      if (!alive) return;
      if (free() && st.current.chatty && !walking) say(pick(Math.random() < 0.6 ? TIPS[st.current.tab] : TIPS.any).replace("{name}", st.current.name), 4200);
      later(chat, rand(38000, 62000));
    };
    later(wander, rand(6000, 11000)); later(chat, rand(25000, 40000));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.mascotOn]);
  useEffect(() => { if (overlay) setOpen(false); }, [overlay]);

  const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];

  function poke() {
    const t = Date.now();
    taps.current = [...taps.current.filter((n) => t - n < 1100), t];
    const n = taps.current.length;
    if (Date.now() < awayUntil.current) { setOpen(false); feel("cry", 3000); say("Why are you like this? *sniff*", 3200); return; }
    if (n === 1) { place(); setOpen((o) => !o); return; }
    setOpen(false);
    if (n === 2 || n === 3) { feel("angry", 2400); say(n === 2 ? "Hey! Stop poking me!" : "I said STOP!", 2400); return; }
    // too many pokes: runs away
    busy.current = true; taps.current = [];
    feel("angry", 1600); say("That's it. I'm out!", 1800);
    const far = x.get() < minX / 2 ? 0 : minX;
    awayUntil.current = Date.now() + 9000;
    later(() => walkTo(far, 420, () => { busy.current = false; say("Catch me if you can!", 3000); feel("happy", 2000); }), 500);
  }

  const startPress = () => { if (pressT.current) clearTimeout(pressT.current); pressT.current = setTimeout(() => { petted.current = Date.now(); if (!dragging.current) { setOpen(false); feel("love", 3000); say("Hehe, that tickles!", 3000); } }, 650); };
  const endPress = () => { if (pressT.current) { clearTimeout(pressT.current); pressT.current = null; } };

  const items = tab === "explore"
    ? [{ label: "Chat", sub: "Talk to people you know", icon: MessageCircle, run: () => setOverlay({ t: "chats" }) }, { label: "Post", sub: "Upload or write for Explore", icon: PlusSquare, run: () => setOverlay({ t: "post" }) }]
    : [{ label: "Record", sub: "Capture a lecture", icon: Mic, run: () => setRecorderOpen(true) }, { label: "Chat", sub: "Talk to people you know", icon: MessageCircle, run: () => setOverlay({ t: "chats" }) }];

  if (overlay || !settings.mascotOn) return null;
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
      <motion.div
        animate={mood === "angry" ? { x: [0, -3, 3, -3, 3, 0], y: 0 } : mood === "cry" ? { y: [0, 1.5, 0], rotate: [0, -2, 2, 0] } : walking ? { y: [0, -3, 0], rotate: tilt } : mood === "happy" || mood === "love" ? { y: [0, -9, 0] } : { y: [0, -3, 0] }}
        transition={mood === "angry" ? { duration: 0.35, repeat: Infinity } : walking ? { duration: 0.34, repeat: Infinity } : mood === "happy" || mood === "love" ? { duration: 0.5, repeat: 3 } : mood === "cry" ? { duration: 0.6, repeat: Infinity } : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        className="drop-shadow-[0_10px_14px_rgba(80,20,110,0.35)]"
      >
        <Bot size={S} mood={mood} talking={talking} feet={feet} showFeet={walking} />
      </motion.div>

      {/* mood effects */}
      <AnimatePresence>
        {mood === "love" && [0, 1, 2].map((i) => (<motion.span key={`h${i}`} initial={{ opacity: 0, y: 10, scale: 0.6 }} animate={{ opacity: [0, 1, 0], y: -34 - i * 8, scale: 1 }} transition={{ duration: 1.4, delay: i * 0.25, repeat: 2 }} className="pointer-events-none absolute text-[15px]" style={{ left: 14 + i * 14, top: -6 }}>❤️</motion.span>))}
        {mood === "cry" && [0, 1].map((i) => (<motion.span key={`t${i}`} initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: 22 }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.3 }} className="pointer-events-none absolute h-2 w-1.5 rounded-full bg-[#5CC8FF]" style={{ left: i ? 39 : 23, top: 30 }} />))}
        {mood === "angry" && [0, 1].map((i) => (<motion.span key={`a${i}`} initial={{ opacity: 0, y: 0, scale: 0.5 }} animate={{ opacity: [0, 0.9, 0], y: -22, scale: 1.2 }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.25 }} className="pointer-events-none absolute text-[13px]" style={{ left: i ? 46 : 4, top: 0 }}>💢</motion.span>))}
        {mood === "sleepy" && [0, 1].map((i) => (<motion.span key={`z${i}`} initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: -26, x: 8 }} transition={{ duration: 2.2, repeat: Infinity, delay: i * 1 }} className="pointer-events-none absolute text-[12px] font-bold text-[#B98AD6]" style={{ left: 44, top: 4 }}>z</motion.span>))}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {bubble && !open && (
          <motion.div key={bubble.id} initial={{ opacity: 0, scale: 0.85, y: above ? 6 : -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
            onPointerDownCapture={(e) => e.stopPropagation()}
            className={`pointer-events-none absolute w-max max-w-[190px] rounded-2xl bg-white px-3 py-2 text-[12.5px] font-semibold leading-snug text-[var(--text)] shadow-[0_10px_28px_-8px_rgba(60,20,90,0.5)] ring-1 ring-[var(--line)] ${above ? "bottom-[76px]" : "top-[76px]"} ${alignRight ? "right-0" : "left-0"}`}>
            {bubble.text}
            <span className={`absolute h-2.5 w-2.5 rotate-45 bg-white ring-1 ring-[var(--line)] ${above ? "-bottom-1 border-b border-r" : "-top-1"} ${alignRight ? "right-6" : "left-6"}`} style={{ clipPath: above ? "polygon(100% 0, 100% 100%, 0 100%)" : "polygon(0 0, 100% 0, 0 100%)" }} />
          </motion.div>
        )}
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
