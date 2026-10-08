"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import Bot from "./Bot";

const N = 5, W = 50, STEP = 26, BOT = 64;

/** Birdie hops up a staircase, then celebrates. `loop` keeps repeating (used as the site loading screen). */
export function ClimbSplash({ onDone, loop = false, scale = 1 }: { onDone?: () => void; loop?: boolean; scale?: number }) {
  const [happy, setHappy] = useState(false);

  const { xs, ys, sy, times } = useMemo(() => {
    const P = [{ x: -34, y: 0 }, ...Array.from({ length: N }, (_, i) => ({ x: W / 2 + i * W - BOT / 2, y: -(i + 1) * STEP }))];
    const xs: number[] = [P[0].x, P[0].x], ys: number[] = [0, 0], sy: number[] = [1, 0.84];
    const dur: number[] = [0.05, 0.05];
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      xs.push((a.x + b.x) / 2, b.x, b.x); ys.push(Math.min(a.y, b.y) - 34, b.y, b.y); sy.push(1.1, 0.82, 1);
      dur.push(0.1, 0.07, 0.05);
    }
    const total = dur.reduce((s, d) => s + d, 0);
    let acc = 0;
    const times = dur.map((d) => (acc += d) / total).map((t, i, arr) => (i === arr.length - 1 ? 1 : t));
    times[0] = 0.0001;
    return { xs, ys, sy, times: [0, ...times.slice(1)] };
  }, []);

  return (
    <div className="relative" style={{ width: (N * W + 40) * scale, height: (N * STEP + BOT + 40) * scale }}>
      <div className="absolute bottom-0 left-0 origin-bottom-left" style={{ transform: `scale(${scale})`, width: N * W + 40, height: N * STEP + BOT + 40 }}>
        {Array.from({ length: N }, (_, i) => (
          <motion.div key={i} initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={{ delay: 0.1 + i * 0.09, type: "spring", damping: 16 }}
            className="absolute bottom-0 origin-bottom rounded-t-lg border-t-4 border-[#E4A8F2] bg-gradient-to-b from-[#9A3DB5] to-[#4B1A63]"
            style={{ left: i * W, width: W, height: (i + 1) * STEP, boxShadow: i === N - 1 ? "0 0 30px 6px rgba(214,139,232,0.45)" : undefined }} />
        ))}
        <motion.div
          className="absolute bottom-0 left-0" style={{ width: BOT, height: BOT }}
          initial={{ x: xs[0], y: 0 }}
          animate={{ x: xs, y: ys, scaleY: sy }}
          transition={{ duration: 2.2, times, ease: "easeInOut", delay: 0.3, repeat: loop ? Infinity : 0, repeatDelay: 0.9 }}
          onAnimationComplete={() => { if (loop) return; setHappy(true); setTimeout(() => onDone?.(), 450); }}
        >
          <div style={{ transformOrigin: "50% 100%" }}><Bot size={BOT} mood={happy ? "happy" : "idle"} showFeet /></div>
        </motion.div>
        {happy && !loop && [0, 1, 2].map((i) => (
          <motion.span key={i} initial={{ opacity: 0, y: 0, scale: 0.5 }} animate={{ opacity: [0, 1, 0], y: -34 - i * 8, scale: 1 }} transition={{ duration: 1.1, delay: i * 0.15 }} className="absolute text-[16px]" style={{ left: N * W - 30 + i * 16, bottom: N * STEP + BOT }}>✨</motion.span>
        ))}
      </div>
    </div>
  );
}

/** BIRDIE fades in letter by letter, left to right. */
export function Wordmark({ onDone, size = 46 }: { onDone?: () => void; size?: number }) {
  const letters = "BIRDIE".split("");
  return (
    <div className="flex flex-col items-center">
      <div className="flex" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
        {letters.map((l, i) => (
          <motion.span key={i} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07, duration: 0.35, ease: "easeOut" }}
            onAnimationComplete={i === letters.length - 1 ? () => setTimeout(() => onDone?.(), 350) : undefined}
            className="bg-gradient-to-b from-white to-[#E2B3F0] bg-clip-text font-bold text-transparent" style={{ fontSize: size, letterSpacing: "0.12em", marginRight: "-0.04em" }}>{l}</motion.span>
        ))}
      </div>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.15, duration: 0.7, ease: "easeOut" }} className="mt-2 h-[3px] w-full origin-left rounded-full bg-gradient-to-r from-[#C05BD6] via-[#E9B6F5] to-transparent" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.4 }} className="mt-3 text-[13px] font-medium tracking-wide text-white/60">Study smarter, together.</motion.div>
    </div>
  );
}

export const SPLASH_BG = "radial-gradient(120% 90% at 50% 20%, #2A1240 0%, #120B1C 60%)";
