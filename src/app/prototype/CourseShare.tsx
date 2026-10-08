"use client";

import { BookOpen, Eye, PenLine } from "lucide-react";
import { useEffect, useState } from "react";
import { myCourseShares, unshareCourse, type GrantRole } from "./live/sharedData";
import { useApp } from "./store";
import { Btn, Sheet } from "./ui";

/**
 * Share one of your courses into a chat, like sharing a playlist: they can view it, or collaborate
 * (add notes). Works in Unisupport chats and with anyone you message.
 */
export function CourseShareSheet({ open, onClose, to, who, onShared }: { open: boolean; onClose: () => void; to: { grantee?: string; session?: string }; who: string; onShared?: (c: { id: string; code: string; name: string }, role: GrantRole) => void }) {
  const { courses, grantCourseAccess, flash } = useApp();
  const [pick, setPick] = useState<string | null>(null);
  const [role, setRole] = useState<GrantRole>("view");
  const [busy, setBusy] = useState(false);

  async function share() {
    if (!pick || busy) return;
    setBusy(true);
    const err = await grantCourseAccess(pick, role, to);
    setBusy(false);
    if (err) return flash(err === "not_your_course" ? "You can only share your own courses" : "Couldn't share that course");
    flash(role === "edit" ? `${who} can now view and add notes` : `${who} can now view it`);
    const c = courses.find((x) => x.id === pick); if (c) onShared?.(c, role);
    setPick(null); onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Share a course">
      {courses.length === 0 ? <p className="text-[13.5px] text-[var(--dim)]">Create a course in Study first.</p> : (
        <div className="space-y-3">
          <div className="max-h-[34vh] space-y-2 overflow-y-auto">{courses.map((c) => (
            <button key={c.id} onClick={() => setPick(c.id)} className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left ${pick === c.id ? "border-[var(--uni)] bg-[var(--uni-soft)]" : "border-[var(--line)] bg-white"}`}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: c.color }}><BookOpen size={16} /></div>
              <div className="min-w-0"><div className="truncate text-[14px] font-semibold">{c.code} · {c.name}</div><div className="text-[11.5px] text-[var(--dim)]">{c.files.length} files · {c.notes.length} notes</div></div>
            </button>
          ))}</div>
          <div className="grid grid-cols-2 gap-2">
            {([["view", "View only", "They can read and open files", Eye], ["edit", "Collaborate", "They can also add notes", PenLine]] as const).map(([id, label, sub, Icon]) => (
              <button key={id} onClick={() => setRole(id)} className={`rounded-2xl border-2 p-3 text-left ${role === id ? "border-[var(--uni)] bg-[var(--uni-soft)]" : "border-[var(--line)] bg-white"}`}>
                <Icon size={16} className="text-[var(--uni)]" /><div className="mt-1 text-[13.5px] font-bold">{label}</div><div className="text-[11.5px] leading-snug text-[var(--dim)]">{sub}</div>
              </button>
            ))}
          </div>
          <Btn disabled={!pick || busy} onClick={() => void share()}>{busy ? "Sharing..." : `Share with ${who}`}</Btn>
          <p className="text-center text-[11.5px] text-[var(--dim)]">You can stop sharing any time from the course&apos;s Share menu.</p>
        </div>
      )}
    </Sheet>
  );
}

/** People and chats this course was shared with, so the owner can stop sharing any time. */
export function CourseShares({ courseId }: { courseId: string }) {
  const { auth, flash } = useApp();
  const [list, setList] = useState<{ grant_id: string; role: GrantRole; name: string }[] | null>(null);
  useEffect(() => { if (auth.status === "in") void myCourseShares(courseId).then(setList); }, [courseId, auth.status]);
  if (!list?.length) return null;
  return (
    <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white p-3">
      <div className="mb-1 text-[12px] font-bold uppercase tracking-wider text-[var(--dim)]">Shared in chats</div>
      {list.map((g) => (
        <div key={g.grant_id} className="flex items-center justify-between gap-3 py-1.5 text-[13.5px]">
          <span className="min-w-0 truncate">{g.name} <span className="text-[11.5px] text-[var(--dim)]">· {g.role === "edit" ? "can add notes" : "view only"}</span></span>
          <button onClick={async () => { await unshareCourse(g.grant_id); setList((l) => l?.filter((x) => x.grant_id !== g.grant_id) ?? null); flash("Stopped sharing"); }} className="shrink-0 text-[12.5px] font-semibold text-[var(--help)]">Stop</button>
        </div>
      ))}
    </div>
  );
}
