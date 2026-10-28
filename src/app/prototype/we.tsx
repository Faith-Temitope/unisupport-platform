"use client";

// WeChat's look, rebuilt for Birdie: square avatars, the 3x3 group avatar, centred headers, settings
// rows with chevrons, switches, red badges, and WeChat-style icons. Birdie purple stands in for
// WeChat green; everything else follows WeChat.
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";

export const initialsOf = (n: string) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

export function SqAvatar({ name, color, size = 44, src, onClick }: { name: string; color?: string; size?: number; src?: string | null; onClick?: () => void }) {
  const body = src
    ? <img src={src} alt="" className="block h-full w-full object-cover" />
    : <span className="flex h-full w-full items-center justify-center font-semibold text-white" style={{ background: color ?? "#7C4DDB", fontSize: size * 0.38 }}>{initialsOf(name)}</span>;
  const cls = "block shrink-0 overflow-hidden rounded-[6px]";
  return onClick
    ? <button onClick={onClick} className={cls} style={{ width: size, height: size }} aria-label={name}>{body}</button>
    : <span className={cls} style={{ width: size, height: size }}>{body}</span>;
}

/** WeChat's group avatar: members' pictures in a grid (2x2 up to four, 3x3 up to nine). */
export function GridAvatar({ avatars, size = 48 }: { avatars: { name: string; color: string }[]; size?: number }) {
  const list = avatars.slice(0, 9);
  if (list.length <= 1) return <SqAvatar name={list[0]?.name ?? "G"} color={list[0]?.color} size={size} />;
  const cols = list.length <= 4 ? 2 : 3;
  const gap = 1.5, pad = 2;
  const cell = (size - pad * 2 - gap * (cols - 1)) / cols;
  const rows = Math.ceil(list.length / cols);
  const firstRow = list.length - (rows - 1) * cols; // the top row holds the leftovers, centred, like WeChat
  return (
    <span className="relative block shrink-0 overflow-hidden rounded-[6px] bg-[var(--we-sep)]" style={{ width: size, height: size }}>
      {list.map((a, i) => {
        const r = i < firstRow ? 0 : 1 + Math.floor((i - firstRow) / cols);
        const c = i < firstRow ? i + (cols - firstRow) / 2 : (i - firstRow) % cols;
        const top = pad + (size - pad * 2 - (rows * cell + (rows - 1) * gap)) / 2 + r * (cell + gap);
        return <span key={i} className="absolute flex items-center justify-center overflow-hidden rounded-[2px] font-semibold text-white"
          style={{ width: cell, height: cell, left: pad + c * (cell + gap), top, background: a.color, fontSize: cell * 0.42 }}>{initialsOf(a.name).slice(0, 1)}</span>;
      })}
    </span>
  );
}

export function WeHeader({ title, onBack, right, transparent }: { title?: ReactNode; onBack?: () => void; right?: ReactNode; transparent?: boolean }) {
  // A transparent header takes its colour from what it sits on (white over a photo, the camera, Money's green).
  const ink = transparent ? "" : "text-[var(--we-text)]";
  return (
    <div className={`relative flex h-12 shrink-0 items-center justify-between px-2 ${transparent ? "" : "bg-[var(--we-bg)]"}`}>
      <div className="z-10 flex w-24 items-center">{onBack && <button onClick={onBack} aria-label="Back" className={`flex h-10 w-10 items-center justify-center ${ink}`}><ChevronLeft size={26} strokeWidth={2} /></button>}</div>
      <div className={`pointer-events-none absolute inset-x-24 text-center text-[16.5px] font-semibold ${ink}`}><div className="truncate">{title}</div></div>
      <div className={`z-10 flex w-24 items-center justify-end gap-1 ${ink}`}>{right}</div>
    </div>
  );
}
export const MoreBtn = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} aria-label="Chat info" className="flex h-10 w-10 items-center justify-center"><MoreHorizontal size={22} /></button>;

/** A white block of rows, with WeChat's grey gap above it. */
export function CellGroup({ children, gap = true }: { children: ReactNode; gap?: boolean }) {
  return <div className={`bg-[var(--we-cell)] ${gap ? "mt-2" : ""} [&>*:last-child>.cell-inner]:border-0`}>{children}</div>;
}

export function Cell({ label, value, icon, onClick, right, chevron = true, danger, center, sub }: {
  label: ReactNode; value?: ReactNode; icon?: ReactNode; onClick?: () => void; right?: ReactNode; chevron?: boolean; danger?: boolean; center?: boolean; sub?: ReactNode;
}) {
  const inner = (
    <>
      {icon && <span className="mr-4 flex w-6 shrink-0 items-center justify-center">{icon}</span>}
      <span className="cell-inner flex min-h-[54px] min-w-0 flex-1 items-center gap-2 border-b border-[var(--we-sep)] py-2 pr-4">
        <span className={`min-w-0 flex-1 text-[16px] ${danger ? "text-[var(--we-red)]" : "text-[var(--we-text)]"} ${center ? "text-center" : ""}`}>{label}{sub && <span className="mt-0.5 block text-[12.5px] text-[var(--we-sub)]">{sub}</span>}</span>
        {value !== undefined && <span className="max-w-[55%] truncate text-right text-[15px] text-[var(--we-sub)]">{value}</span>}
        {right}
        {chevron && onClick && !center && <ChevronRight size={18} className="shrink-0 text-[var(--we-hint)]" />}
      </span>
    </>
  );
  const cls = "flex w-full items-center pl-4 text-left active:bg-black/5";
  return onClick ? <button onClick={onClick} className={cls}>{inner}</button> : <div className={cls}>{inner}</div>;
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${on ? "bg-[var(--we-accent)]" : "bg-[var(--we-sep)]"}`}>
      <span className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-[2px]"}`} />
    </button>
  );
}

export function Badge({ n, dot }: { n?: number; dot?: boolean }) {
  if (dot) return <span className="absolute -right-1 -top-1 h-[10px] w-[10px] rounded-full bg-[var(--we-red)]" />;
  if (!n) return null;
  return <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--we-red)] px-1 text-[11px] font-medium leading-none text-white">{n > 99 ? "99+" : n}</span>;
}

// ------------------------------------------------------------------ icons

type IP = { size?: number; className?: string };

/** Discover > Moments: the rainbow aperture. */
export const MomentsIcon = ({ size = 24 }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    {["#F25022", "#FFB900", "#7FBA00", "#00A4EF", "#3F51B5", "#E040FB"].map((c, i) => (
      <path key={c} d="M12 12 L12 2.6 A9.4 9.4 0 0 1 20.14 7.3 Z" fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" transform={`rotate(${i * 60} 12 12)`} />
    ))}
  </svg>
);
/** Discover > Channels: the orange double loop. */
export const ChannelsIcon = ({ size = 24 }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FA9D3B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 12c-2-4.5-5-7.5-7.5-7.5C2.8 4.5 2.5 6 2.5 8c0 6 6.5 11.5 9.5 11.5s9.5-5.5 9.5-11.5c0-2-.3-3.5-2-3.5C17 4.5 14 7.5 12 12z" />
  </svg>
);
export const ScanIcon = ({ size = 24 }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#3D83F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" /><path d="M3 12h18" />
  </svg>
);
export const ShakeIcon = ({ size = 24 }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#3D83F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="7.5" y="3" width="9" height="18" rx="2" transform="rotate(-15 12 12)" /><path d="M3 9.5c-.8 1.6-.8 3.4 0 5M21 9.5c.8 1.6.8 3.4 0 5" />
  </svg>
);
export const TopStoriesIcon = ({ size = 24 }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#F5B400" strokeWidth="1.9" strokeLinejoin="round" aria-hidden>
    <path d="M12 2.5l3 5.2h6l-3 5.3 3 5.3h-6l-3 5.2-3-5.2H3l3-5.3-3-5.3h6z" /><circle cx="12" cy="13" r="2.4" />
  </svg>
);
export const SearchSparkIcon = ({ size = 24 }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FA5151" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
    <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3" />
  </svg>
);
export const PeopleNearbyIcon = ({ size = 24 }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#3D83F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="8" cy="5.5" r="2.5" /><circle cx="16" cy="5.5" r="2.5" /><path d="M6 21v-6.5H4.5V11a3 3 0 0 1 3-3h1a3 3 0 0 1 3 3v3.5H10V21M18 21v-6.5h1.5V11a3 3 0 0 0-3-3h-1a3 3 0 0 0-3 3" />
  </svg>
);
export const MiniProgramsIcon = ({ size = 24 }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#7D63E3" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <circle cx="12" cy="12" r="9.5" /><path d="M8 14.5a2.2 2.2 0 1 0 4 0V9.5a2.2 2.2 0 1 1 4 0" />
  </svg>
);
/** Chats > Courses: like WeChat's Subscriptions folder icon. */
export const CoursesFolderIcon = ({ size = 48 }: IP) => (
  <span className="flex shrink-0 items-center justify-center rounded-[6px] bg-[#3D83F7]" style={{ width: size, height: size }}>
    <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="2.5" width="16" height="19" rx="2" fill="#fff" /><path d="M8 8h8M8 12h8M8 16h5" stroke="#3D83F7" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  </span>
);

// tab bar
export const TabChats = ({ on, size = 26 }: { on?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden>
    <path d="M12 3.5c5 0 9 3.4 9 7.6s-4 7.6-9 7.6c-1 0-2-.1-2.9-.4L5 20.5l1.1-3.6C4.2 15.5 3 13.4 3 11.1 3 6.9 7 3.5 12 3.5z" />
  </svg>
);
export const TabCourses = ({ on, size = 26 }: { on?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden>
    <path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z" /><path d="M12 6v13.5" stroke={on ? "var(--we-bg)" : "currentColor"} />
  </svg>
);
export const TabDiscover = ({ on, size = 26 }: { on?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="9" fill={on ? "currentColor" : "none"} /><path d="M15.5 8.5l-2 5-5 2 2-5z" fill={on ? "var(--we-bg)" : "none"} stroke={on ? "var(--we-bg)" : "currentColor"} />
  </svg>
);
export const TabMe = ({ on, size = 26 }: { on?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="8" r="4.2" /><path d="M4 20.5c.8-4 4-6.2 8-6.2s7.2 2.2 8 6.2z" />
  </svg>
);

// composer circles
const Circle = ({ children, size = 30 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="15" cy="15" r="13.2" />{children}</svg>
);
export const VoiceCircle = () => <Circle><path d="M11 15a2 2 0 0 0 0 0" strokeWidth="2.6" /><path d="M14.5 11.2a5.5 5.5 0 0 1 0 7.6M17.6 8.5a9.5 9.5 0 0 1 0 13" /></Circle>;
export const EmojiCircle = () => <Circle><circle cx="11" cy="12.5" r=".6" fill="currentColor" /><circle cx="19" cy="12.5" r=".6" fill="currentColor" /><path d="M10 17.5c2.8 2.8 7.2 2.8 10 0" /></Circle>;
export const PlusCircle = () => <Circle><path d="M15 9.5v11M9.5 15h11" /></Circle>;
export const KeyboardCircle = () => <Circle><rect x="7.5" y="10" width="15" height="10" rx="1.5" /><path d="M10.5 13h.01M13.5 13h.01M16.5 13h.01M19.5 13h.01M11.5 17h7" /></Circle>;
