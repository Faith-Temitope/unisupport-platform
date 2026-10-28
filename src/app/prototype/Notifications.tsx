"use client";

// Notifications (like Facebook's or WhatsApp's): messages, mentions, comments, friend requests, new videos
// from people you follow, campus updates, class reminders, and Birdie's own nudges (recommendations,
// badges, your streak). And Me > Achievements: your streak, this week, and badges with progress.
import { Bell, BellOff, BookOpen, Brain, CalendarDays, Flame, Handshake, Heart, Library, Megaphone, MessageCircle, Mic, PenLine, PlayCircle, Sparkles, Target, Trophy, UserPlus, Zap, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BADGES, dayKey, type Badge } from "./badges";
import { clearNotifications, markNotificationsRead, myNotifications, unreadNotifications, type ServerNotice } from "./live/notifyData";
import { whileVisible } from "./perf";
import { useApp } from "./store";
import { Page } from "./ui";

export const openNotifications = () => window.dispatchEvent(new Event("birdie-open-notifications"));
export const openAchievements = () => window.dispatchEvent(new Event("birdie-open-achievements"));
const changed = () => window.dispatchEvent(new Event("birdie-notices-changed"));

/** Unread count: the server's notifications plus Birdie's in-app ones. */
export function useUnreadCount() {
  const { auth, notices } = useApp();
  const [server, setServer] = useState(0);
  const load = useCallback(async () => { if (auth.status === "in") setServer(await unreadNotifications()); }, [auth.status]);
  useEffect(() => {
    void Promise.resolve().then(load);
    const i = setInterval(whileVisible(() => void load()), 60000);
    window.addEventListener("birdie-notices-changed", load);
    return () => { clearInterval(i); window.removeEventListener("birdie-notices-changed", load); };
  }, [load]);
  return (auth.status === "in" ? server : 0) + notices.filter((n) => !n.read).length;
}

export function BellButton({ className = "" }: { className?: string }) {
  const n = useUnreadCount();
  return (
    <button onClick={openNotifications} aria-label={n ? `Notifications, ${n} unread` : "Notifications"} className={`relative flex h-10 w-10 items-center justify-center ${className}`}>
      <Bell size={22} />
      {n > 0 && <span className="absolute right-0.5 top-1 min-w-[17px] rounded-full bg-[var(--we-red)] px-1 text-center text-[10.5px] font-semibold leading-[17px] text-white">{n > 99 ? "99+" : n}</span>}
    </button>
  );
}

/** Both pages, mounted once; anything can open them (a header bell, Me, a push link). */
export function NoticesHost() {
  const [page, setPage] = useState<null | "notifications" | "achievements">(null);
  useEffect(() => {
    const n = () => setPage("notifications"), a = () => setPage("achievements");
    window.addEventListener("birdie-open-notifications", n); window.addEventListener("birdie-open-achievements", a);
    return () => { window.removeEventListener("birdie-open-notifications", n); window.removeEventListener("birdie-open-achievements", a); };
  }, []);
  return (<>
    <NotificationsPage open={page === "notifications"} onClose={() => setPage(null)} />
    <AchievementsPage open={page === "achievements"} onClose={() => setPage(null)} />
  </>);
}

type Row = { id: string; title: string; body?: string | null; link?: string | null; at: number; unread: boolean };

// What a notification is about, from where it leads.
function kindOf(r: Row): { Icon: LucideIcon; color: string } {
  const l = r.link ?? "", t = r.title.toLowerCase();
  if (l.includes("achievements") || t.startsWith("badge")) return { Icon: Trophy, color: "#F5A623" };
  if (t.includes("streak") || t.includes("study buddy")) return { Icon: Flame, color: "#FF7A3D" };
  if (l.includes("quiz=") || l.includes("course=") || t.startsWith("birdie recommends")) return { Icon: Sparkles, color: "#8A2FA3" };
  if (l.includes("watch=")) return { Icon: PlayCircle, color: "#E2553F" };
  if (l.includes("schedule")) return { Icon: CalendarDays, color: "#3D83F7" };
  if (l.includes("campus") || l.includes("oa=") || l.includes("oa_post")) return { Icon: Megaphone, color: "#1B8A85" };
  if (l.includes("friends")) return { Icon: UserPlus, color: "#2AAE67" };
  if (l.includes("moments")) return { Icon: Heart, color: "#D9467E" };
  if (l.includes("dm=") || l.includes("group=") || l.includes("chat")) return { Icon: MessageCircle, color: "#2AAE67" };
  return { Icon: Bell, color: "#576B95" };
}

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "Just now"; if (m < 60) return `${m}m`; if (m < 24 * 60) return `${Math.round(m / 60)}h`;
  const d = new Date(t); const y = new Date(); y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString() ? "Yesterday" : d.toLocaleDateString([], { day: "numeric", month: "short" });
};

function NotificationsPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { auth, notices, markNoticesRead, clearNotices } = useApp();
  const [server, setServer] = useState<ServerNotice[] | null>(null);
  const [openedAt, setOpenedAt] = useState(0);
  useEffect(() => {
    if (!open) return;
    let on = true;
    void (async () => {
      const list = auth.status === "in" ? await myNotifications() : [];
      if (!on) return;
      setServer(list); setOpenedAt(Date.now());
      // The badge clears once you've seen the list; what's new stays highlighted until you leave.
      if (list.some((n) => !n.read)) { await markNotificationsRead(); changed(); }
      markNoticesRead();
    })();
    return () => { on = false; };
  }, [open, auth.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows: Row[] = useMemo(() => [
    ...(server ?? []).map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, at: new Date(n.created_at).getTime(), unread: !n.read })),
    ...notices.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, at: n.at ?? 0, unread: !n.read })),
  ].sort((a, b) => b.at - a.at), [server, notices]);
  const today = rows.filter((r) => openedAt - r.at < 86400e3), earlier = rows.filter((r) => openedAt - r.at >= 86400e3);

  function go(r: Row) {
    if (!r.link) return;
    onClose();
    setTimeout(() => window.dispatchEvent(new CustomEvent("birdie-open-link", { detail: r.link })), 60);
  }
  async function clearAll() {
    if (!confirm("Clear all notifications?")) return;
    clearNotices(); setServer([]);
    if (auth.status === "in") { await clearNotifications(); changed(); }
  }
  const section = (label: string, list: Row[]) => list.length > 0 && (
    <div>
      <div className="px-4 pb-1.5 pt-4 text-[13px] text-[var(--we-sub)]">{label}</div>
      <div className="bg-[var(--we-cell)]">{list.map((r) => {
        const { Icon, color } = kindOf(r);
        return (
          <button key={r.id} onClick={() => go(r)} className={`flex w-full items-start gap-3 px-4 py-3 text-left active:bg-[var(--we-bg)] ${r.unread ? "bg-[color-mix(in_srgb,var(--we-accent)_7%,transparent)]" : ""}`}>
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: color }}><Icon size={19} /></span>
            <span className="min-w-0 flex-1 border-b border-[var(--we-sep)] pb-3">
              <span className="block text-[15px] leading-snug text-[var(--we-text)]">{r.title}</span>
              {r.body && <span className="mt-0.5 line-clamp-2 block text-[13.5px] leading-snug text-[var(--we-sub)]">{r.body}</span>}
              <span className={`mt-1 block text-[12px] ${r.unread ? "font-medium text-[var(--we-accent)]" : "text-[var(--we-hint)]"}`}>{ago(r.at)}</span>
            </span>
            {r.unread && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--we-accent)]" />}
          </button>
        );
      })}</div>
    </div>
  );
  return (
    <Page open={open} onClose={onClose} title="Notifications" right={rows.length > 0 && <button onClick={() => void clearAll()} className="px-2 text-[15px] text-[var(--we-link)]">Clear</button>}>
      {server === null && auth.status === "in" ? <p className="py-16 text-center text-[14px] text-[var(--we-sub)]">Loading...</p>
        : rows.length === 0 ? (
          <div className="flex flex-col items-center px-10 py-20 text-center"><BellOff size={40} className="text-[var(--we-hint)]" /><p className="mt-4 text-[16px] text-[var(--we-text)]">You&apos;re all caught up</p><p className="mt-1 text-[13.5px] text-[var(--we-sub)]">Messages, comments, friend requests and new videos from people you follow show up here.</p></div>
        ) : <div className="pb-10">{section("Today", today)}{section("Earlier", earlier)}</div>}
    </Page>
  );
}

// ---------- Achievements
const MEDAL: Record<string, { Icon: LucideIcon; color: string }> = {
  "first-course": { Icon: BookOpen, color: "#3D83F7" }, "first-note": { Icon: PenLine, color: "#1B8A85" }, "ten-notes": { Icon: Library, color: "#576B95" },
  "first-quiz": { Icon: Target, color: "#E2553F" }, "five-quizzes": { Icon: Brain, color: "#7C4DDB" }, "first-record": { Icon: Mic, color: "#D9467E" },
  "ask-birdie": { Icon: MessageCircle, color: "#8A2FA3" }, "streak-3": { Icon: Flame, color: "#FF7A3D" }, "streak-7": { Icon: Zap, color: "#F5A623" },
  "first-post": { Icon: Megaphone, color: "#2AAE67" }, friend: { Icon: Handshake, color: "#1B8A85" },
};
const plural = (n: number, unit: string) => `${n} ${unit === "quiz" ? (n === 1 ? "quiz" : "quizzes") : unit + (n === 1 ? "" : "s")}`;

function longestStreak(activity: Record<string, number>) {
  const days = Object.keys(activity).filter((k) => activity[k]).sort();
  let best = 0, run = 0, prev = 0;
  for (const k of days) { const t = new Date(k + "T12:00:00").getTime(); run = prev && Math.round((t - prev) / 86400e3) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = t; }
  return best;
}

function Medal({ b, on, have }: { b: Badge; on: boolean; have: number }) {
  const m = MEDAL[b.id] ?? { Icon: Trophy, color: "#F5A623" };
  const pct = Math.min(100, Math.round((have / b.goal) * 100));
  return (
    <div className="flex flex-col items-center px-1 py-3 text-center">
      <span className={`relative flex h-[58px] w-[58px] items-center justify-center rounded-full ${on ? "text-white shadow-[0_3px_10px_rgba(0,0,0,0.18)]" : "bg-[var(--we-bg)] text-[var(--we-hint)]"}`} style={on ? { background: `radial-gradient(circle at 35% 30%, ${m.color}CC, ${m.color})` } : undefined}>
        <m.Icon size={26} />
        {on && <span className="absolute inset-[3px] rounded-full border border-white/40" />}
      </span>
      <span className={`mt-2 text-[13px] font-medium ${on ? "text-[var(--we-text)]" : "text-[var(--we-sub)]"}`}>{b.label}</span>
      {on ? <span className="text-[11.5px] text-[var(--we-hint)]">{b.desc}</span> : (
        <span className="mt-1 w-full px-2"><span className="block h-1 overflow-hidden rounded-full bg-[var(--we-bg)]"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: m.color }} /></span><span className="mt-0.5 block text-[11px] text-[var(--we-hint)]">{Math.min(have, b.goal)}/{b.goal}</span></span>
      )}
    </div>
  );
}

function AchievementsPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { streak, activity, stats, unlocked, todayCount } = useApp();
  const [now] = useState(() => Date.now());
  const best = Math.max(streak, longestStreak(activity));
  const week = Array.from({ length: 7 }, (_, i) => { const t = now - (6 - i) * 86400e3; return { k: dayKey(t), d: new Date(t).toLocaleDateString([], { weekday: "narrow" }), today: i === 6 }; });
  const earned = BADGES.filter((b) => unlocked.includes(b.id));
  // The closest badge you don't have yet.
  const next = BADGES.filter((b) => !unlocked.includes(b.id)).map((b) => ({ b, left: b.goal - Number(stats[b.key] ?? 0) })).filter((x) => x.left > 0).sort((a, b) => a.left - b.left)[0];
  return (
    <Page open={open} onClose={onClose} title="Achievements">
      <div className="bg-[var(--we-cell)] px-4 pb-5 pt-6">
        <div className="flex items-center gap-4">
          <span className={`flex h-16 w-16 items-center justify-center rounded-full ${streak ? "bg-[#FFF1E8] text-[#FF7A3D]" : "bg-[var(--we-bg)] text-[var(--we-hint)]"}`}><Flame size={34} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[28px] font-semibold leading-none text-[var(--we-text)]">{streak} <span className="text-[16px] font-normal text-[var(--we-sub)]">day streak</span></span>
            <span className="mt-1.5 block text-[13.5px] text-[var(--we-sub)]">{todayCount ? "Done for today" : streak ? "Study today to keep it" : "Study today to start one"} · Best {best}</span>
          </span>
        </div>
        <div className="mt-5 flex justify-between">
          {week.map((w) => { const on = !!activity[w.k]; return (
            <span key={w.k} className="flex flex-col items-center gap-1.5">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${on ? "bg-[#FF7A3D] text-white" : w.today ? "border-2 border-dashed border-[#FF7A3D]/60 text-[var(--we-hint)]" : "bg-[var(--we-bg)] text-[var(--we-hint)]"}`}>{on ? <Flame size={15} /> : null}</span>
              <span className={`text-[11.5px] ${w.today ? "font-semibold text-[var(--we-text)]" : "text-[var(--we-hint)]"}`}>{w.d}</span>
            </span>); })}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 bg-[var(--we-cell)] py-4 text-center">
        {([["Notes", stats.notes], ["Quizzes", stats.quizzes], ["Recordings", stats.recs], ["Badges", earned.length]] as const).map(([l, v]) => (
          <span key={l}><span className="block text-[20px] font-semibold text-[var(--we-text)]">{v}</span><span className="text-[12px] text-[var(--we-sub)]">{l}</span></span>
        ))}
      </div>

      {next && (
        <div className="mt-2 flex items-center gap-3 bg-[var(--we-cell)] px-4 py-3.5">
          <Trophy size={20} className="shrink-0 text-[#F5A623]" />
          <span className="flex-1 text-[14.5px] text-[var(--we-text)]">{plural(next.left, next.b.unit)} more for <b className="font-medium">{next.b.label}</b></span>
        </div>
      )}

      <div className="px-4 pb-1.5 pt-4 text-[13px] text-[var(--we-sub)]">Badges · {earned.length} of {BADGES.length}</div>
      <div className="grid grid-cols-3 bg-[var(--we-cell)] px-2 pb-3">
        {[...earned, ...BADGES.filter((b) => !unlocked.includes(b.id))].map((b) => <Medal key={b.id} b={b} on={unlocked.includes(b.id)} have={Number(stats[b.key] ?? 0)} />)}
      </div>
      <p className="px-6 py-5 text-center text-[12.5px] text-[var(--we-hint)]">Birdie reminds you once a day when your streak needs you.</p>
    </Page>
  );
}
