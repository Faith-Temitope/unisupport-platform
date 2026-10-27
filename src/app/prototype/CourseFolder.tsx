"use client";

// Chats > Courses: like WeChat's Subscriptions folder. Every shared course you own or joined, with its
// latest notice-board post and course-chat message, newest first. Private courses are listed below.
import { ArrowLeft, BookOpen, MessageCircle, Pin, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { courseFeedRead, listTime, myCourseFeed, type CourseFeedRow } from "./live/chatData";
import { whileVisible } from "./perf";
import { useApp, type Course } from "./store";
import { Empty } from "./ui";

export default function CourseFolder({ onBack }: { onBack: () => void }) {
  const { courses, goStudy, goBirdie, flash } = useApp();
  const [rows, setRows] = useState<CourseFeedRow[] | null>(null);
  const load = useCallback(() => myCourseFeed().then(setRows), []);
  useEffect(() => { void Promise.resolve().then(load); const t = setInterval(whileVisible(() => void load()), 20000); return () => clearInterval(t); }, [load]);
  const local = (r: CourseFeedRow): Course | undefined => courses.find((c) => c.sharedId === r.shared_id || (r.course_id && (c.sourceCourseId === r.course_id || c.id === r.course_id)));
  function open(r: CourseFeedRow) {
    void courseFeedRead(r.shared_id);
    const c = local(r);
    if (!c) { flash("Open this course from Courses"); return; }
    goStudy({ courseId: c.id, tab: "board" });
  }
  const sharedLocal = new Set((rows ?? []).map((r) => local(r)?.id).filter(Boolean));
  const privateCourses = courses.filter((c) => !sharedLocal.has(c.id) && !c.sharedId && !c.sourceCourseId);
  const frequent = (rows ?? []).slice(0, 6);
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--paper)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line)] px-3 pb-2.5 pt-2">
        <button onClick={onBack} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-xl active:bg-[var(--paper-dim)]"><ArrowLeft size={19} /></button>
        <div className="flex-1 text-center text-[15.5px] font-bold">Courses</div><span className="w-9" />
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#EFE8F4] pb-8">
        {frequent.length > 0 && (
          <div className="bg-[var(--paper)] px-4 pb-3 pt-3">
            <div className="mb-2 text-[12px] font-semibold text-[var(--dim)]">Frequently read</div>
            <div className="no-scrollbar flex gap-4 overflow-x-auto">{frequent.map((r) => (
              <button key={r.shared_id} onClick={() => open(r)} className="flex w-16 shrink-0 flex-col items-center gap-1">
                <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--study)] text-[12px] font-bold text-white">{r.code.replace(/\s+/g, "").slice(0, 6)}{r.unread > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[var(--paper)] bg-[#3FB56B]" />}</span>
                <span className="w-full truncate text-center text-[11px] text-[var(--dim)]">{r.code}</span>
              </button>
            ))}</div>
          </div>
        )}
        <div className="space-y-3 px-3 pt-3">
          {rows === null ? <p className="py-6 text-center text-[13px] text-[var(--dim)]">Loading...</p>
            : rows.length === 0 && privateCourses.length === 0 ? <Empty icon={<BookOpen size={20} />} title="No courses yet" text="Courses you create, share or join show up here with their latest notices and chat." /> : null}
          {(rows ?? []).map((r) => (
            <button key={r.shared_id} onClick={() => open(r)} className="block w-full overflow-hidden rounded-2xl bg-[var(--paper)] text-left shadow-sm active:scale-[0.99]">
              <div className="flex items-center gap-2.5 px-3.5 pt-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--study)] text-[10.5px] font-bold text-white">{r.code.replace(/\s+/g, "").slice(0, 6)}</span>
                <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-bold">{r.code} · {r.name}</div><div className="text-[11.5px] text-[var(--dim)]">{r.mine ? "Your course" : `By ${r.owner.name}`} · {r.members} member{r.members === 1 ? "" : "s"}</div></div>
                <span className="shrink-0 text-[11px] text-[var(--dim)]">{listTime(r.last_at)}</span>
              </div>
              {r.post ? (
                <div className="mx-3.5 mt-2.5 rounded-xl bg-[var(--paper-dim)] p-3">
                  <div className="mb-0.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[var(--study)]">{r.post.pinned && <Pin size={11} />}Notice board</div>
                  <div className="line-clamp-3 text-[14px] leading-snug">{r.post.body}</div>
                </div>
              ) : <div className="mx-3.5 mt-2.5 text-[12.5px] text-[var(--dim)]">No notices yet.</div>}
              {r.chat && <div className="mx-3.5 mt-2 flex items-center gap-1.5 truncate text-[12.5px] text-[var(--dim)]"><MessageCircle size={13} className="shrink-0" /><span className="truncate">{r.chat.author.name.split(" ")[0]}: {r.chat.body}</span></div>}
              <div className="mt-2.5 flex items-center justify-between border-t border-[var(--line)] px-3.5 py-2 text-[12px]">
                <span className={r.unread > 0 ? "font-bold text-[#E5484D]" : "text-[var(--dim)]"}>{r.unread > 0 ? `${r.unread} new` : "Up to date"}</span>
                <span className="font-semibold text-[var(--study)]">Open course</span>
              </div>
            </button>
          ))}
          {privateCourses.length > 0 && (
            <div className="pt-2">
              <div className="mb-1.5 px-1 text-[12px] font-semibold text-[var(--dim)]">Only you</div>
              <div className="overflow-hidden rounded-2xl bg-[var(--paper)]">{privateCourses.map((c) => (
                <div key={c.id} className="flex items-center gap-3 border-b border-[var(--line)] px-3.5 py-2.5 last:border-0">
                  <button onClick={() => goStudy({ courseId: c.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl text-[10.5px] font-bold text-white" style={{ background: c.color }}>{c.code.replace(/\s+/g, "").slice(0, 6)}</span>
                    <span className="min-w-0"><span className="block truncate text-[14px] font-semibold">{c.code} · {c.name}</span><span className="block text-[11.5px] text-[var(--dim)]">{c.notes.length} notes · {c.files.length} files</span></span>
                  </button>
                  <button onClick={() => goBirdie({ courseId: c.id })} className="flex items-center gap-1 rounded-lg bg-[var(--birdie-soft)] px-2.5 py-1.5 text-[12px] font-bold text-[var(--birdie-text)]"><Sparkles size={13} /> Ask</button>
                </div>
              ))}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
