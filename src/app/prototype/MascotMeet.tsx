"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import Buddy, { type Skin } from "@/components/brand/Buddy";
import { initials } from "./PostCard";
import { useApp } from "./store";

const GOSSIP: [string, string][] = [
  ["Psst... did you see that?", "Seen it. Wild."],
  ["Your human studies a lot.", "Mine too. Let's make them study together."],
  ["They're typing again...", "Shh. Act natural."],
  ["Exam season is coming.", "I've hidden all the snacks."],
  ["Mine poked me today.", "Mine too! Rude."],
  ["Do they know we talk?", "Never tell them."],
  ["Nice hat.", "It's my head."],
  ["Who's the smart one?", "Obviously us."],
];
const SPOKEN_KEY = "birdie-gossip";

/**
 * When two people chat, their study buddies walk in from each side, gossip a bit and wander off.
 * They show up when the chat opens and whenever a new message lands. Tap to shoo them away.
 */
export function MascotMeet({ them, themName, themColor, beat }: { them: Skin; themName: string; themColor: string; beat: number }) {
  const { settings, profile } = useApp();
  const [shown, setShown] = useState(false);
  const [line, setLine] = useState<{ who: 0 | 1; text: string } | null>(null);

  useEffect(() => {
    if (!settings.mascotOn) return;
    const pair = GOSSIP[(beat + (themName.length % GOSSIP.length)) % GOSSIP.length];
    const ts = [
      setTimeout(() => setShown(true), 400),
      setTimeout(() => setLine({ who: 0, text: pair[0] }), 1300),
      setTimeout(() => setLine({ who: 1, text: pair[1] }), 3600),
      setTimeout(() => setLine(null), 6000),
      setTimeout(() => setShown(false), 6600),
    ];
    try { sessionStorage.setItem(SPOKEN_KEY, String(beat)); } catch { /* fine */ }
    return () => ts.forEach(clearTimeout);
  }, [beat, settings.mascotOn, themName]);

  if (!settings.mascotOn) return null;
  return (
    <AnimatePresence>
      {shown && (
        <motion.button type="button" onClick={() => { setShown(false); setLine(null); }} aria-label="Shoo the buddies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="relative mx-auto mb-2 flex h-[92px] w-full max-w-[300px] items-end justify-between px-6">
          <motion.div initial={{ x: -120 }} animate={{ x: 0 }} exit={{ x: -140 }} transition={{ type: "spring", damping: 16 }} className="relative">
            {line?.who === 0 && <Bubble text={line.text} side="left" />}
            <motion.div animate={line?.who === 0 ? { y: [0, -4, 0] } : {}} transition={{ duration: 0.4, repeat: 2 }}>
              <Buddy skin={settings.mascotSkin} size={46} talking={line?.who === 0} mood={line ? "happy" : "idle"} initials={initials(profile.name || "Me")} />
            </motion.div>
          </motion.div>
          <motion.div initial={{ x: 120 }} animate={{ x: 0 }} exit={{ x: 140 }} transition={{ type: "spring", damping: 16 }} className="relative">
            {line?.who === 1 && <Bubble text={line.text} side="right" />}
            <motion.div style={{ scaleX: -1 }} animate={line?.who === 1 ? { y: [0, -4, 0] } : {}} transition={{ duration: 0.4, repeat: 2 }}>
              <Buddy skin={them} size={46} talking={line?.who === 1} mood={line ? "happy" : "idle"} color={themColor} initials={initials(themName)} />
            </motion.div>
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function Bubble({ text, side }: { text: string; side: "left" | "right" }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={`absolute bottom-[52px] w-max max-w-[150px] rounded-xl bg-white px-2.5 py-1.5 text-left text-[11.5px] font-semibold leading-snug text-[var(--text)] shadow ${side === "left" ? "left-0" : "right-0"}`}>{text}</motion.div>
  );
}
