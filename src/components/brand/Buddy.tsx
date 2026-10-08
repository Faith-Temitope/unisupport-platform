"use client";

import { useId } from "react";
import Bot, { type Mood } from "./Bot";

export type Skin = "robot" | "bird" | "spider" | "me";
export type Cover = "none" | "both" | "peek";
export const SKINS: { id: Skin; label: string }[] = [
  { id: "robot", label: "Birdie bot" }, { id: "bird", label: "Bird" }, { id: "spider", label: "Spider" }, { id: "me", label: "Me" },
];

/**
 * The study buddy in any of its looks. Every look keeps the same face layout (eyes at 26,27 and
 * 38,27 in a 64-unit box) so props like covering its eyes or reading a book line up on all of them.
 */
export default function Buddy({ skin = "robot", size = 64, mood = "idle", talking = false, feet = 0, showFeet = false, cover = "none", reading = false, color = "#A63FBD", initials = "" }: {
  skin?: Skin; size?: number; mood?: Mood; talking?: boolean; feet?: 0 | 1; showFeet?: boolean; cover?: Cover; reading?: boolean; color?: string; initials?: string;
}) {
  const id = useId().replace(/:/g, "");
  const eyeColor = mood === "angry" ? "#FF7A59" : mood === "love" ? "#FF6FB5" : skin === "bird" || skin === "me" ? "#1a0f2e" : "#46F0FF";
  // Reading: eyes look down at the book.
  const eyes = (cy = 27) => reading ? (<>
    <path d="M22.5 29 Q26 31 29.5 29" stroke={eyeColor} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M34.5 29 Q38 31 41.5 29" stroke={eyeColor} strokeWidth="2.2" fill="none" strokeLinecap="round" />
  </>) : mood === "sleepy" ? (<>
    <path d={`M22.5 ${cy} Q26 ${cy + 3} 29.5 ${cy}`} stroke={eyeColor} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d={`M34.5 ${cy} Q38 ${cy + 3} 41.5 ${cy}`} stroke={eyeColor} strokeWidth="2.2" fill="none" strokeLinecap="round" />
  </>) : mood === "happy" || mood === "love" ? (<>
    <path d={`M22.5 ${cy + 1} Q26 ${cy - 4} 29.5 ${cy + 1}`} stroke={eyeColor} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d={`M34.5 ${cy + 1} Q38 ${cy - 4} 41.5 ${cy + 1}`} stroke={eyeColor} strokeWidth="2.4" fill="none" strokeLinecap="round" />
  </>) : (<>
    <circle cx="26" cy={cy} r="3.4" fill={eyeColor} /><circle cx="38" cy={cy} r="3.4" fill={eyeColor} />
    <circle cx="27" cy={cy - 1} r="1.1" fill="#fff" opacity=".9" /><circle cx="39" cy={cy - 1} r="1.1" fill="#fff" opacity=".9" />
    {mood === "angry" && (<><path d="M21 20.5 L29.5 23.5" stroke="#FF7A59" strokeWidth="2.2" strokeLinecap="round" /><path d="M43 20.5 L34.5 23.5" stroke="#FF7A59" strokeWidth="2.2" strokeLinecap="round" /></>)}
  </>);
  const mouth = talking ? <ellipse cx="32" cy="35" rx="3.2" ry="2.4" fill={skin === "spider" ? "#46F0FF" : "#7a2a3a"} /> : mood === "angry" || mood === "cry" ? <path d="M28 37 Q32 33.5 36 37" stroke={skin === "spider" ? "#46F0FF" : "#7a2a3a"} strokeWidth="1.8" fill="none" strokeLinecap="round" /> : <path d="M28 34 Q32 37.5 36 34" stroke={skin === "spider" ? "#46F0FF" : "#7a2a3a"} strokeWidth="1.8" fill="none" strokeLinecap="round" />;

  let body: React.ReactNode;
  if (skin === "robot") body = <Bot size={size} mood={reading ? "sleepy" : mood} talking={talking} feet={feet} showFeet={showFeet} />;
  else body = (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ overflow: "visible" }}>
      <defs><radialGradient id={`b${id}`} cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient></defs>
      <ellipse cx="32" cy="61.5" rx="15" ry="2.3" fill="#000" opacity=".16" />
      {skin === "bird" && (<>
        <path d="M30 6 Q33 0 36 7 Q40 2 39 10" fill="#FFB84D" />
        {showFeet ? (<><path d={`M${feet ? 25 : 27} 55 v5 m-3 0 h6`} stroke="#F08A24" strokeWidth="2" strokeLinecap="round" /><path d={`M${feet ? 39 : 37} 55 v5 m-3 0 h6`} stroke="#F08A24" strokeWidth="2" strokeLinecap="round" /></>) : (<><path d="M27 55 v5 m-3 0 h6" stroke="#F08A24" strokeWidth="2" strokeLinecap="round" /><path d="M37 55 v5 m-3 0 h6" stroke="#F08A24" strokeWidth="2" strokeLinecap="round" /></>)}
        <ellipse cx="32" cy="33" rx="22" ry="23" fill="#5BB8F0" /><ellipse cx="32" cy="33" rx="22" ry="23" fill={`url(#b${id})`} />
        <ellipse cx="32" cy="42" rx="13" ry="12" fill="#E8F6FF" />
        <path d="M10 34 Q4 40 11 46 Q15 40 14 34Z" fill="#3D97D3" /><path d="M54 34 Q60 40 53 46 Q49 40 50 34Z" fill="#3D97D3" />
        <circle cx="26" cy="27" r="5.5" fill="#fff" /><circle cx="38" cy="27" r="5.5" fill="#fff" />
        {eyes()}
        <path d={talking ? "M28 32 L36 32 L32 39Z" : "M28 32 L36 32 L32 37Z"} fill="#FFA62B" />
      </>)}
      {skin === "spider" && (<>
        {[0, 1, 2, 3].map((i) => (<g key={i}>
          <path d={`M14 ${36 + i * 4} Q${4 - (showFeet && (i + feet) % 2 ? 3 : 0)} ${30 + i * 6} ${2} ${44 + i * 5}`} stroke="#2a1f3a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d={`M50 ${36 + i * 4} Q${60 + (showFeet && (i + feet) % 2 ? 3 : 0)} ${30 + i * 6} ${62} ${44 + i * 5}`} stroke="#2a1f3a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>))}
        <ellipse cx="32" cy="38" rx="19" ry="18" fill="#3b2d52" /><ellipse cx="32" cy="38" rx="19" ry="18" fill={`url(#b${id})`} />
        <circle cx="32" cy="24" r="14" fill="#4a3a66" />
        <circle cx="26" cy="27" r="4.6" fill="#1a0f2e" /><circle cx="38" cy="27" r="4.6" fill="#1a0f2e" />
        {eyes()}
        <circle cx="29" cy="18" r="1.3" fill="#46F0FF" opacity=".7" /><circle cx="35" cy="18" r="1.3" fill="#46F0FF" opacity=".7" />
        {mouth}
      </>)}
      {skin === "me" && (<>
        {showFeet && (<><ellipse cx={feet ? 25 : 27} cy="59" rx="5" ry="2.6" fill="#2a1f3a" /><ellipse cx={feet ? 39 : 37} cy="59" rx="5" ry="2.6" fill="#2a1f3a" /></>)}
        <rect x="17" y="40" width="30" height="18" rx="9" fill={color} />
        <text x="32" y="53" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff" fontFamily="system-ui">{initials.slice(0, 2)}</text>
        <circle cx="32" cy="26" r="17" fill="#C68A5E" />
        <path d="M15 24 Q16 8 32 8 Q48 8 49 24 Q44 15 32 15 Q20 15 15 24Z" fill="#2a1a12" />
        <circle cx="26" cy="27" r="4" fill="#fff" /><circle cx="38" cy="27" r="4" fill="#fff" />
        {eyes()}
        {mouth}
        {(mood === "happy" || mood === "love") && (<><ellipse cx="20.5" cy="32" rx="2.4" ry="1.4" fill="#FF8FC7" opacity=".5" /><ellipse cx="43.5" cy="32" rx="2.4" ry="1.4" fill="#FF8FC7" opacity=".5" /></>)}
      </>)}
    </svg>
  );

  const k = size / 64;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {body}
      {/* Hands over the eyes: both shut, or one lifted to peek. */}
      {cover !== "none" && (<>
        <span className="absolute rounded-full bg-[#F2E6FA] shadow" style={{ left: 19 * k, top: 21 * k, width: 13 * k, height: 12 * k, transform: cover === "peek" ? `translateY(${-7 * k}px) rotate(-25deg)` : undefined, transition: "transform .25s" }} />
        <span className="absolute rounded-full bg-[#F2E6FA] shadow" style={{ left: 32 * k, top: 21 * k, width: 13 * k, height: 12 * k }} />
      </>)}
      {/* A book held in front while it studies with you. */}
      {reading && (
        <svg className="absolute" style={{ left: 14 * k, top: 38 * k }} width={36 * k} height={22 * k} viewBox="0 0 36 22" aria-hidden>
          <path d="M18 3 Q10 0 1 2 V20 Q10 18 18 21Z" fill="#E9573F" /><path d="M18 3 Q26 0 35 2 V20 Q26 18 18 21Z" fill="#F26B52" />
          <path d="M18 3 V21" stroke="#9c2f1d" strokeWidth="1" /><path d="M4 6 H14 M4 9 H13 M22 6 H32 M22 9 H31" stroke="#fff" strokeOpacity=".7" strokeWidth=".9" />
        </svg>
      )}
    </div>
  );
}

/** A little bed it drags out when it refuses to study. */
export function Bed({ width = 96 }: { width?: number }) {
  return (
    <svg width={width} height={width * 0.45} viewBox="0 0 96 43" aria-hidden>
      <rect x="2" y="6" width="8" height="35" rx="3" fill="#8a5a3c" /><rect x="86" y="18" width="8" height="23" rx="3" fill="#8a5a3c" />
      <rect x="6" y="24" width="84" height="12" rx="4" fill="#B07A52" />
      <rect x="10" y="17" width="20" height="10" rx="5" fill="#fff" />
      <path d="M28 18 H88 Q91 18 91 22 V27 H28Z" fill="#7C4DDB" /><path d="M28 18 H88 Q91 18 91 22 V22 H28Z" fill="#9d77ec" />
    </svg>
  );
}
