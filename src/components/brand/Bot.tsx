"use client";

import { useId } from "react";

export type Mood = "idle" | "happy" | "angry" | "cry" | "love" | "sleepy";

/** Birdie's face and body. Pure SVG so it can be the mascot, logo, splash and favicon source. */
export default function Bot({ size = 64, mood = "idle", talking = false, feet = 0, flip = false, showFeet = false }: { size?: number; mood?: Mood; talking?: boolean; feet?: 0 | 1; flip?: boolean; showFeet?: boolean }) {
  const id = useId().replace(/:/g, "");
  const eye = mood === "angry" ? "#FF7A59" : mood === "love" ? "#FF6FB5" : "#46F0FF";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ transform: flip ? "scaleX(-1)" : undefined, overflow: "visible" }}>
      <defs>
        <radialGradient id={`h${id}`} cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#E4D6F2" /></radialGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C05BD6" /><stop offset="1" stopColor="#8A2FA3" /></linearGradient>
        <filter id={`g${id}`}><feGaussianBlur stdDeviation="1.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <ellipse cx="32" cy="61.5" rx="15" ry="2.3" fill="#000" opacity=".16" />
      <line x1="32" y1="8" x2="32" y2="13" stroke="#E4D6F2" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="6" r="3.2" fill={mood === "angry" ? "#FF7A59" : "#F7C8FF"} filter={`url(#g${id})`} />
      {showFeet && (<>
        <ellipse cx={feet ? 25 : 27} cy="59" rx="5" ry="2.6" fill="#7B2A91" /><ellipse cx={feet ? 39 : 37} cy="59" rx="5" ry="2.6" fill="#7B2A91" />
      </>)}
      <rect x="18" y="41" width="28" height="17" rx="8.5" fill={`url(#s${id})`} />
      <circle cx="16.5" cy={mood === "angry" ? 46 : 49} r="5" fill={`url(#h${id})`} /><circle cx="47.5" cy={mood === "angry" ? 46 : 49} r="5" fill={`url(#h${id})`} />
      <circle cx="32" cy="50" r="2.2" fill="#fff" opacity=".85" />
      <circle cx="32" cy="27" r="20" fill={`url(#h${id})`} />
      <ellipse cx="32" cy="28" rx="15" ry="12" fill="#1a0f2e" />

      {/* eyes */}
      {mood === "happy" && (<>
        <path d="M22.5 28 Q26 23 29.5 28" stroke={eye} strokeWidth="2.4" fill="none" strokeLinecap="round" filter={`url(#g${id})`} />
        <path d="M34.5 28 Q38 23 41.5 28" stroke={eye} strokeWidth="2.4" fill="none" strokeLinecap="round" filter={`url(#g${id})`} />
      </>)}
      {mood === "love" && (<>
        <path d="M26 30 C21 26 22 22.5 24.6 22.5 C25.6 22.5 26 23.2 26 23.6 C26 23.2 26.4 22.5 27.4 22.5 C30 22.5 31 26 26 30Z" fill={eye} filter={`url(#g${id})`} />
        <path d="M38 30 C33 26 34 22.5 36.6 22.5 C37.6 22.5 38 23.2 38 23.6 C38 23.2 38.4 22.5 39.4 22.5 C42 22.5 43 26 38 30Z" fill={eye} filter={`url(#g${id})`} />
      </>)}
      {mood === "sleepy" && (<>
        <path d="M22.5 27.5 Q26 30.5 29.5 27.5" stroke={eye} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M34.5 27.5 Q38 30.5 41.5 27.5" stroke={eye} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </>)}
      {(mood === "idle" || mood === "cry" || mood === "angry") && (<>
        <ellipse cx="26" cy={mood === "cry" ? 28 : 27} rx="3.2" ry={mood === "cry" ? 3.8 : 3.2} fill={eye} filter={`url(#g${id})`} />
        <ellipse cx="38" cy={mood === "cry" ? 28 : 27} rx="3.2" ry={mood === "cry" ? 3.8 : 3.2} fill={eye} filter={`url(#g${id})`} />
        {mood === "cry" && (<><circle cx="24.8" cy="26.4" r="1" fill="#fff" opacity=".9" /><circle cx="36.8" cy="26.4" r="1" fill="#fff" opacity=".9" /></>)}
      </>)}
      {mood === "angry" && (<>
        <path d="M21 21.5 L29.5 24.5" stroke="#FF7A59" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M43 21.5 L34.5 24.5" stroke="#FF7A59" strokeWidth="2.2" strokeLinecap="round" />
      </>)}

      {/* mouth */}
      {talking ? (
        <ellipse cx="32" cy="34" rx="3.6" ry="2.8" fill={eye} opacity=".95" />
      ) : mood === "angry" ? (
        <path d="M27.5 36 Q32 32 36.5 36" stroke={eye} strokeWidth="1.9" fill="none" strokeLinecap="round" filter={`url(#g${id})`} />
      ) : mood === "cry" ? (
        <path d="M27.5 36 Q32 31.8 36.5 36" stroke={eye} strokeWidth="1.9" fill="none" strokeLinecap="round" filter={`url(#g${id})`} />
      ) : mood === "happy" || mood === "love" ? (
        <path d="M26.5 32.5 Q32 39 37.5 32.5 Z" fill={eye} filter={`url(#g${id})`} />
      ) : mood === "sleepy" ? (
        <ellipse cx="32" cy="34.5" rx="1.8" ry="1.4" fill={eye} opacity=".7" />
      ) : (
        <path d="M27.5 33 Q32 36.5 36.5 33" stroke={eye} strokeWidth="1.8" fill="none" strokeLinecap="round" filter={`url(#g${id})`} />
      )}
      {(mood === "happy" || mood === "love") && (<><ellipse cx="20.5" cy="33" rx="2.4" ry="1.4" fill="#FF8FC7" opacity=".55" /><ellipse cx="43.5" cy="33" rx="2.4" ry="1.4" fill="#FF8FC7" opacity=".55" /></>)}
    </svg>
  );
}

/** The app icon: the bot's face on a purple tile. Used for the favicon and as the logo mark. */
export function BirdieMark({ size = 56, radius }: { size?: number; radius?: number }) {
  return (
    <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#C05BD6] to-[#7B2A91]" style={{ width: size, height: size, borderRadius: radius ?? size * 0.26 }}>
      <div style={{ marginTop: size * 0.06 }}><Bot size={size * 0.92} /></div>
    </div>
  );
}
