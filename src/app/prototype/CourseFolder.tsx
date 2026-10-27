"use client";

// Chats > Courses, laid out like WeChat's Subscriptions folder: "Frequently Read" across the top, a
// notifications pill, then a card per course with its latest message. Tapping a course opens that
// course's group chat (a normal chat, with Chat Info and all).
import { Search, UserRound } from "lucide-react";
import { useState } from "react";
import { listTime, type CourseChat } from "./live/chatData";
import { WeHeader, initialsOf } from "./we";

const PALETTE = ["#3D83F7", "#7C4DDB", "#1B8A85", "#D9467E", "#E2553F", "#A63FBD", "#F5A623", "#2F9E5B"];
const colorOf = (s: string) => PALETTE[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

function Round({ c, size = 52 }: { c: CourseChat; size?: number }) {
  return <span className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white" style={{ width: size, height: size, background: colorOf(c.code), fontSize: size * 0.3 }}>{(c.code.replace(/\s+/g, "") || initialsOf(c.name)).slice(0, 4)}</span>;
}

export default function CourseFolder({ rows, onBack, onOpen }: { rows: CourseChat[]; onBack: () => void; onOpen: (groupId: string) => void }) {
  const [searching, setSearching] = useState(false);
  const [all, setAll] = useState(false);
  const [q, setQ] = useState("");
  const shown = rows.filter((r) => !q.trim() || `${r.code} ${r.name}`.toLowerCase().includes(q.trim().toLowerCase()));
  const unread = rows.filter((r) => r.unread > 0);
  const frequent = [...rows].sort((a, b) => b.unread - a.unread || b.last_at.localeCompare(a.last_at)).slice(0, 4);

  if (all) return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={() => setAll(false)} title="Course Chats" />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[var(--we-cell)]">{rows.map((r) => (
        <button key={r.group_id} onClick={() => onOpen(r.group_id)} className="flex w-full items-center gap-3 pl-4 text-left active:bg-black/5">
          <Round c={r} size={44} />
          <span className="flex h-[64px] min-w-0 flex-1 flex-col justify-center border-b border-[var(--we-sep)] pr-4"><span className="truncate text-[16px] text-[var(--we-text)]">{r.code} · {r.name}</span><span className="truncate text-[13px] text-[var(--we-sub)]">{r.mine ? "Your course" : `By ${r.owner.name}`} · {r.members} member{r.members === 1 ? "" : "s"}</span></span>
        </button>
      ))}</div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="Courses" right={<>
        <button onClick={() => setSearching((s) => !s)} aria-label="Search courses" className="flex h-10 w-10 items-center justify-center"><Search size={21} /></button>
        <button onClick={() => setAll(true)} aria-label="All course chats" className="flex h-10 w-10 items-center justify-center"><UserRound size={21} /></button>
      </>} />
      {searching && <div className="px-3 pb-2"><div className="flex items-center gap-2 rounded-[6px] bg-[var(--we-cell)] px-3 py-2"><Search size={16} className="text-[var(--we-sub)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" /></div></div>}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-10">
        {rows.length === 0 ? (
          <p className="px-8 py-20 text-center text-[14px] leading-relaxed text-[var(--we-sub)]">When you share a course or join one, its chat shows up here. Everyone in the course is in the chat.</p>
        ) : (
          <>
            {!q && (
              <div className="px-4 pt-2">
                <div className="mb-3 text-[13px] text-[var(--we-sub)]">Frequently Read</div>
                <div className="grid grid-cols-4 gap-2">{frequent.map((r) => (
                  <button key={r.group_id} onClick={() => onOpen(r.group_id)} className="flex min-w-0 flex-col items-center gap-1.5">
                    <Round c={r} />
                    <span className="flex max-w-full items-center gap-1 text-[12px] text-[var(--we-sub)]">{r.unread > 0 && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2DC100]" />}<span className="truncate">{r.code || r.name}</span></span>
                  </button>
                ))}</div>
                {unread.length > 0 && (
                  <button onClick={() => onOpen(unread[0].group_id)} className="mx-auto mt-4 flex items-center gap-2 rounded-full bg-[var(--we-cell)] py-1 pl-1 pr-3 text-[13px] text-[var(--we-text)] shadow-sm">
                    <Round c={unread[0]} size={24} />{unread.reduce((a, r) => a + r.unread, 0)} notification(s) &gt;
                  </button>
                )}
              </div>
            )}
            <div className="space-y-3 px-3 pt-4">{shown.map((r) => (
              <button key={r.group_id} onClick={() => onOpen(r.group_id)} className="block w-full overflow-hidden rounded-[8px] bg-[var(--we-cell)] text-left active:opacity-90">
                <div className="flex items-center gap-2.5 px-4 py-3">
                  <Round c={r} size={26} />
                  <span className="min-w-0 flex-1 truncate text-[15px] text-[var(--we-link)]">{r.code} · {r.name}</span>
                  <span className="shrink-0 text-[12px] text-[var(--we-hint)]">{listTime(r.last_at)}</span>
                </div>
                <div className="relative flex h-36 items-end overflow-hidden px-4 pb-3" style={{ background: `linear-gradient(135deg, ${colorOf(r.code)}, ${colorOf(r.code + "x")})` }}>
                  <span className="absolute right-4 top-3 text-[44px] font-black leading-none text-white/20">{r.code.replace(/\s+/g, "")}</span>
                  <span className="relative text-[13px] text-white/90">{r.members} member{r.members === 1 ? "" : "s"}{r.unread > 0 ? ` · ${r.unread} new` : ""}</span>
                </div>
                <div className="px-4 py-3">
                  <div className="line-clamp-2 text-[16px] font-semibold leading-snug text-[var(--we-text)]">{r.last ?? "Say hi to everyone in this course"}</div>
                  {r.notice && <div className="mt-1.5 line-clamp-1 text-[13px] text-[var(--we-sub)]">{r.notice.pinned ? "📌 " : ""}Notice: {r.notice.body}</div>}
                </div>
              </button>
            ))}</div>
          </>
        )}
      </div>
    </div>
  );
}
