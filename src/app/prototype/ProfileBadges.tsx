"use client";

import { Award, BadgeCheck, BookOpen, Crown, Feather, Flame, GraduationCap, Heart, Megaphone, MessagesSquare, ShieldCheck, Sparkles, Star, Users, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { BADGES } from "./badges";
import { useApp } from "./store";
import { Sheet } from "./ui";

/** Every badge Birdie can show on a channel, like Discord/Webnovel profile badges. */
export const BADGE_INFO: Record<string, { label: string; desc: string; Icon: LucideIcon; bg: string }> = {
  founding_creator: { label: "Founding Creator", desc: "One of the first creators on Birdie. This badge is never given again once the programme closes.", Icon: Crown, bg: "linear-gradient(135deg,#F7C948,#E8892B)" },
  team: { label: "Birdie team", desc: "Works on Birdie.", Icon: ShieldCheck, bg: "linear-gradient(135deg,#C05BD6,#7B2A91)" },
  unisupport: { label: "Unisupport", desc: "Unisupport help desk or writer.", Icon: BadgeCheck, bg: "linear-gradient(135deg,#7C4DDB,#4C2FA3)" },
  verified: { label: "Verified", desc: "Checked and verified by the Birdie team.", Icon: BadgeCheck, bg: "linear-gradient(135deg,#3A8DFF,#1F5FD1)" },
  course_rep: { label: "Course rep", desc: "An approved course rep for their class.", Icon: Megaphone, bg: "linear-gradient(135deg,#1FB57A,#0E7F55)" },
  early_bird: { label: "Early bird", desc: "Joined Birdie in its first year.", Icon: Feather, bg: "linear-gradient(135deg,#5BB8F0,#2E86C9)" },
  creator: { label: "Creator", desc: "Posts videos or notes for other students.", Icon: Sparkles, bg: "linear-gradient(135deg,#A88BF0,#7C4DDB)" },
  rising_creator: { label: "Rising creator", desc: "Their posts have 10+ likes.", Icon: Star, bg: "linear-gradient(135deg,#FFB35C,#F07B2F)" },
  popular_creator: { label: "Popular creator", desc: "Their posts have 100+ likes.", Icon: Star, bg: "linear-gradient(135deg,#FF7A9C,#D9467E)" },
  star_creator: { label: "Star creator", desc: "Their posts have 1,000+ likes.", Icon: Star, bg: "linear-gradient(135deg,#F7C948,#D9467E)" },
  course_sharer: { label: "Course sharer", desc: "10+ students learn from a course they shared.", Icon: BookOpen, bg: "linear-gradient(135deg,#7C4DDB,#4C6EF5)" },
  course_legend: { label: "Course legend", desc: "100+ students learn from courses they shared.", Icon: BookOpen, bg: "linear-gradient(135deg,#F7C948,#7C4DDB)" },
  tutor: { label: "Tutor", desc: "Has taught students in a Birdie tutorial.", Icon: GraduationCap, bg: "linear-gradient(135deg,#1B8A85,#0E5E5A)" },
  certified: { label: "Certified", desc: "Earned a Birdie certificate.", Icon: Award, bg: "linear-gradient(135deg,#E2553F,#A63FBD)" },
  chatterbox: { label: "Chatterbox", desc: "25+ helpful comments.", Icon: MessagesSquare, bg: "linear-gradient(135deg,#4C6EF5,#2F3FB0)" },
  followed: { label: "Followed", desc: "50+ followers.", Icon: Users, bg: "linear-gradient(135deg,#D9467E,#8A2FA3)" },
  top_helper: { label: "Top helper", desc: "Given by the Birdie team for helping other students.", Icon: Heart, bg: "linear-gradient(135deg,#FF6F59,#D9467E)" },
  ambassador: { label: "Ambassador", desc: "Represents Birdie on campus.", Icon: Flame, bg: "linear-gradient(135deg,#FF8A3D,#E2553F)" },
};
export const GRANTABLE = ["founding_creator", "verified", "top_helper", "ambassador"];

type Earned = { id: string; at: string | null; note: string | null };

/** Badges for a channel. Own channel also shows study achievements (streaks, quizzes...). */
export function ProfileBadges({ userId, isMe }: { userId?: string; isMe: boolean }) {
  const { unlocked } = useApp();
  const [earned, setEarned] = useState<Earned[]>([]);
  const [open, setOpen] = useState<{ label: string; desc: string; note?: string | null; at?: string | null; Icon?: LucideIcon; bg?: string; emoji?: string } | null>(null);
  useEffect(() => { if (userId) void createClient().rpc("user_badges", { p_user: userId }).then(({ data }) => setEarned(((data ?? []) as Earned[]).filter((b) => BADGE_INFO[b.id]))); }, [userId]);
  const local = isMe ? BADGES.filter((b) => unlocked.includes(b.id)) : [];
  if (!earned.length && !local.length) return null;
  // Rarest first: founding, team, then the rest.
  const order = Object.keys(BADGE_INFO);
  const sorted = [...earned].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {sorted.map((b) => { const i = BADGE_INFO[b.id]; return (
          <button key={b.id} onClick={() => setOpen({ ...i, note: b.note, at: b.at })} className="flex items-center gap-1.5 rounded-full bg-[var(--paper-dim)] py-1 pl-1 pr-2.5 text-[11.5px] font-bold active:scale-95">
            <span className="flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: i.bg }}><i.Icon size={11} strokeWidth={2.6} /></span>{i.label}
          </button>
        ); })}
        {local.map((b) => (
          <button key={b.id} onClick={() => setOpen({ label: b.label, desc: b.desc, emoji: b.emoji })} title={b.label} className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--paper-dim)] text-[14px] active:scale-95">{b.emoji}</button>
        ))}
      </div>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.label ?? ""}>
        {open && (
          <div className="flex items-start gap-3.5">
            {open.Icon ? <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow" style={{ background: open.bg }}><open.Icon size={26} /></span> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--paper-dim)] text-[28px]">{open.emoji}</span>}
            <div>
              <p className="text-[14px] leading-snug">{open.desc}</p>
              {open.note && <p className="mt-1 text-[12.5px] text-[var(--dim)]">{open.note}</p>}
              {open.at && <p className="mt-1 text-[12px] text-[var(--dim)]">Since {new Date(open.at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}</p>}
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
