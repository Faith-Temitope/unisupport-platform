"use client";

import { Check } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { CategoryPill } from "./Categories";
import { naira, useApp, type Course, type Picked } from "./store";
import { Btn, TextField } from "./ui";

const PRICES = [0, 200, 500, 1000];
const OWNER_SHARE = 0.9;

function Row({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: ReactNode; sub?: string }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left ring-1 ring-[var(--line)] active:scale-[0.99]">
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${on ? "border-[var(--study)] bg-[var(--study)] text-white" : "border-[var(--line)]"}`}>{on && <Check size={13} strokeWidth={3} />}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-[var(--text)]">{title}</span>{sub && <span className="block text-[11px] text-[var(--dim)]">{sub}</span>}</span>
    </button>
  );
}
function Group({ label, children, n }: { label: string; children: ReactNode; n: number }) {
  if (n === 0) return null;
  return <div><div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">{label}</div><div className="space-y-1.5">{children}</div></div>;
}

/** Publish a course to Explore (mode "new") or change what an already-shared one includes and
 * what it costs (mode "manage"). The owner ticks each item -- nothing is shared by default. */
export function ShareCourseForm({ course, mode, onDone }: { course: Course; mode: "new" | "manage"; onDone: () => void }) {
  const { profile, auth, shareCourse, getSharing, updateSharing, flash } = useApp();
  const [name, setName] = useState(profile.name); const [school, setSchool] = useState(profile.institution);
  const [field, setField] = useState(profile.program); const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("0");
  const [picked, setPicked] = useState<Picked>({ notes: [], files: [], recs: [] });
  const [loading, setLoading] = useState(mode === "manage");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== "manage") return;
    void getSharing(course.id).then((s) => { if (s) { setPrice(String(s.priceNgn)); setPicked(s.picked); } setLoading(false); });
  }, [mode, course.id, getSharing]);

  if (auth.status !== "in") return <p className="text-[13.5px] text-[var(--dim)]">Sign in to share a course. Shared courses live on your account so classmates can open them.</p>;
  if (loading) return <p className="py-6 text-center text-[13px] text-[var(--dim)]">Loading what&apos;s shared...</p>;

  const priceNum = Math.max(0, Math.round(Number(price) || 0));
  const files = course.files.filter((f) => f.storagePath);
  const recs = course.recs.filter((r) => r.storagePath);
  const total = picked.notes.length + picked.files.length + picked.recs.length;
  const allCount = course.notes.length + files.length + recs.length;
  const toggle = (k: keyof Picked, id: string) => setPicked((p) => ({ ...p, [k]: p[k].includes(id) ? p[k].filter((x) => x !== id) : [...p[k], id] }));
  const selectAll = () => setPicked(total === allCount ? { notes: [], files: [], recs: [] } : { notes: course.notes.map((n) => n.id), files: files.map((f) => f.id), recs: recs.map((r) => r.id) });
  const ready = total > 0 && (mode === "manage" || (name.trim() && field.trim() && desc.trim()));

  async function submit() {
    setBusy(true);
    const err = mode === "new"
      ? await shareCourse(course.id, { description: desc.trim(), field: field.trim(), ownerName: name.trim(), school: school.trim(), priceNgn: priceNum }, picked)
      : await updateSharing(course.id, priceNum, picked);
    setBusy(false);
    if (err) return flash(err);
    flash(mode === "new" ? "Shared to Explore" : "Sharing updated");
    onDone();
  }

  return (
    <div className="space-y-4">
      {mode === "new" && (
        <div className="space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Shown on the course</div>
          <TextField value={name} onChange={setName} placeholder="Your name" /><TextField value={school} onChange={setSchool} placeholder="Your school (optional)" />
          <TextField value={field} onChange={setField} placeholder="Field, e.g. Computer Science" /><TextField multiline value={desc} onChange={setDesc} placeholder="What's in it? Who is it for?" />
        </div>
      )}

      <div>
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Price</div>
        <div className="mb-2 flex gap-2">{PRICES.map((p) => (<button key={p} type="button" onClick={() => setPrice(String(p))} className={`flex-1 rounded-xl border-2 py-2 text-[12.5px] font-bold transition active:scale-95 ${priceNum === p ? "border-[var(--study)] bg-[var(--study-soft)] text-[var(--study)]" : "border-[var(--line)] text-[var(--dim)]"}`}>{p === 0 ? "Free" : naira(p)}</button>))}</div>
        <TextField value={price} onChange={(v) => setPrice(v.replace(/[^\d]/g, ""))} placeholder="Or type a price in Naira" />
        <p className="mt-1.5 text-[11.5px] leading-snug text-[var(--dim)]">{priceNum === 0 ? "Free: anyone can add it to their Study." : `Classmates pay ${naira(priceNum)} once. You get ${naira(Math.round(priceNum * OWNER_SHARE))} per sale, straight into your Birdie balance.`}</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[13px] font-bold text-[var(--text)]">What&apos;s included <span className="font-semibold text-[var(--dim)]">({total} of {allCount})</span></div>
          {allCount > 0 && <button type="button" onClick={selectAll} className="text-[12px] font-bold text-[var(--study)]">{total === allCount ? "Clear" : "Select all"}</button>}
        </div>
        {allCount === 0 ? <p className="text-[12.5px] text-[var(--dim)]">This course has nothing to share yet. Add notes, materials or recordings first.</p> : (
          <div className="space-y-3">
            <Group label="Notes" n={course.notes.length}>{course.notes.map((n) => (<Row key={n.id} on={picked.notes.includes(n.id)} onClick={() => toggle("notes", n.id)} title={<>{n.title} <CategoryPill category={n.category} /></>} />))}</Group>
            <Group label="Materials" n={files.length}>{files.map((f) => (<Row key={f.id} on={picked.files.includes(f.id)} onClick={() => toggle("files", f.id)} title={<>{f.name} <CategoryPill category={f.category} /></>} />))}</Group>
            <Group label="Recordings" n={recs.length}>{recs.map((r) => (<Row key={r.id} on={picked.recs.includes(r.id)} onClick={() => toggle("recs", r.id)} title={r.name} sub={`${Math.round(r.dur / 60)} min`} />))}</Group>
            {course.files.length + course.recs.length > files.length + recs.length && <p className="text-[11.5px] text-[var(--dim)]">Some materials or recordings aren&apos;t listed because they never finished uploading. Re-add them to share them.</p>}
          </div>
        )}
        {mode === "manage" && <p className="mt-2 text-[11.5px] text-[var(--dim)]">Things you add to this course later stay private until you tick them here.</p>}
      </div>

      <Btn variant="study" disabled={!ready || busy} onClick={() => void submit()}>{busy ? "Saving..." : mode === "new" ? "Publish to Explore" : "Save changes"}</Btn>
    </div>
  );
}
