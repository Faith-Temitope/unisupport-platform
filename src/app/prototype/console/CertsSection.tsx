"use client";

// Sponsor certificate courses: lessons + exam the sponsor provides; students who pass get a
// certificate (free or paid). Questions are stored with the right answer; students never see it.
import { useEffect, useState } from "react";
import { adminDeleteCert, adminListCerts, adminSaveCert, type AdminCert, type Lesson } from "../live/certData";
import { cleanUrl } from "../live/socialData";
import { Btn2, Card, Pill, Switch } from "../staff/kit";

type Q = { prompt: string; options: string; correct: number };
type Draft = { id?: string; sponsor_name: string; sponsor_logo: string; title: string; description: string; price: string; pass: string; countries: string; regions: string; schools: string; active: boolean; lessons: Lesson[]; questions: Q[] };
const blank: Draft = { sponsor_name: "", sponsor_logo: "", title: "", description: "", price: "0", pass: "70", countries: "", regions: "", schools: "", active: true, lessons: [{ title: "", body: "", video_url: "" }], questions: [{ prompt: "", options: "", correct: 0 }] };
const field = "w-full rounded-xl border-2 border-[#E6DCF0] bg-white px-3 py-2 text-[13.5px] outline-none focus:border-[#8b3fa6]";
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const opts = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function CertsSection({ show }: { show: (m: string) => void }) {
  const [rows, setRows] = useState<AdminCert[]>([]);
  const [d, setD] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void adminListCerts().then(setRows); }, []);
  const reload = async () => setRows(await adminListCerts());

  function edit(c: AdminCert) {
    setD({ id: c.id, sponsor_name: c.sponsor_name, sponsor_logo: c.sponsor_logo ?? "", title: c.title, description: c.description, price: String(c.price_ngn), pass: String(c.pass_pct),
      countries: c.countries.join(", "), regions: c.regions.join(", "), schools: c.schools.join(", "), active: c.active,
      lessons: c.lessons.length ? c.lessons.map((l) => ({ ...l, video_url: l.video_url ?? "" })) : blank.lessons,
      questions: c.questions.map((q) => ({ prompt: q.prompt, options: q.options.join("\n"), correct: q.correct })) });
  }
  async function save() {
    if (!d) return;
    if (!d.sponsor_name.trim() || !d.title.trim()) return show("Sponsor and title are required");
    if (d.sponsor_logo.trim() && !/^https:\/\//i.test(d.sponsor_logo.trim())) return show("The logo link must start with https://");
    const lessons = d.lessons.filter((l) => l.title.trim()).map((l) => ({ title: l.title.trim(), body: l.body.trim(), ...(l.video_url?.trim() ? { video_url: cleanUrl(l.video_url) ?? "" } : {}) }));
    const questions = d.questions.filter((q) => q.prompt.trim());
    for (const [i, q] of questions.entries()) {
      const o = opts(q.options);
      if (o.length < 2 || o.length > 6) return show(`Question ${i + 1} needs 2 to 6 options, one per line`);
      if (q.correct >= o.length) return show(`Question ${i + 1}: pick which option is correct`);
    }
    setBusy(true);
    const err = await adminSaveCert({
      id: d.id, sponsor_name: d.sponsor_name.trim(), sponsor_logo: d.sponsor_logo.trim() || null, title: d.title.trim(), description: d.description.trim(),
      price_ngn: Math.max(0, Math.round(Number(d.price) || 0)), pass_pct: Math.min(100, Math.max(1, Math.round(Number(d.pass) || 70))),
      countries: list(d.countries), regions: list(d.regions), schools: list(d.schools), active: d.active, lessons,
      questions: questions.map((q) => ({ prompt: q.prompt.trim(), options: opts(q.options), correct: q.correct })),
    } as Partial<AdminCert>);
    setBusy(false);
    if (err) return show(err);
    show(d.id ? "Saved" : "Course published"); setD(null); void reload();
  }
  async function remove(c: AdminCert) {
    if (!confirm(`Delete "${c.title}"?`)) return;
    const err = await adminDeleteCert(c.id);
    if (err) return show(err === "has_certificates" ? "Certificates were already issued for this course. Switch it off instead of deleting it." : err);
    void reload();
  }
  const setLesson = (i: number, k: keyof Lesson, v: string) => setD((x) => x && { ...x, lessons: x.lessons.map((l, j) => (j === i ? { ...l, [k]: v } : l)) });
  const setQ = (i: number, patch: Partial<Q>) => setD((x) => x && { ...x, questions: x.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });

  return (
    <Card title="Sponsor certificate courses" sub="Shown at the top of Explore > Courses. Students study the lessons, sit the exam, and get a certificate with a public verification link.">
      {d ? (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input className={field} value={d.sponsor_name} onChange={(e) => setD({ ...d, sponsor_name: e.target.value })} placeholder="Sponsor, e.g. Flutterwave" />
            <input className={field} value={d.sponsor_logo} onChange={(e) => setD({ ...d, sponsor_logo: e.target.value })} placeholder="Logo link (https://..., optional)" />
            <input className={field} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="Course title, e.g. Payments 101" />
            <div className="grid grid-cols-2 gap-3"><input className={field} value={d.price} onChange={(e) => setD({ ...d, price: e.target.value.replace(/[^\d]/g, "") })} placeholder="Certificate price ₦ (0 = free)" /><input className={field} value={d.pass} onChange={(e) => setD({ ...d, pass: e.target.value.replace(/[^\d]/g, "") })} placeholder="Pass mark %" /></div>
          </div>
          <textarea className={`${field} min-h-[60px]`} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} placeholder="What students will learn" />
          <div className="grid gap-3 md:grid-cols-3">
            <input className={field} value={d.countries} onChange={(e) => setD({ ...d, countries: e.target.value })} placeholder="Countries (blank = all)" />
            <input className={field} value={d.regions} onChange={(e) => setD({ ...d, regions: e.target.value })} placeholder="Regions (blank = all)" />
            <input className={field} value={d.schools} onChange={(e) => setD({ ...d, schools: e.target.value })} placeholder="Schools (blank = all)" />
          </div>

          <div className="rounded-xl bg-[#F8F4FB] p-3">
            <div className="mb-2 text-[12.5px] font-bold">Lessons</div>
            <div className="space-y-2">{d.lessons.map((l, i) => (
              <div key={i} className="space-y-1.5 rounded-xl bg-white p-2.5">
                <div className="flex gap-2"><input className={field} value={l.title} onChange={(e) => setLesson(i, "title", e.target.value)} placeholder={`Lesson ${i + 1} title`} /><button onClick={() => setD({ ...d, lessons: d.lessons.filter((_, j) => j !== i) })} className="px-2 text-[12px] font-semibold text-[#C2412D]">Remove</button></div>
                <textarea className={`${field} min-h-[70px]`} value={l.body} onChange={(e) => setLesson(i, "body", e.target.value)} placeholder="Lesson text" />
                <input className={field} value={l.video_url ?? ""} onChange={(e) => setLesson(i, "video_url", e.target.value)} placeholder="Video link, e.g. YouTube (optional)" />
              </div>
            ))}</div>
            <button onClick={() => setD({ ...d, lessons: [...d.lessons, { title: "", body: "", video_url: "" }] })} className="mt-2 text-[12.5px] font-bold text-[#8b3fa6]">+ Add lesson</button>
          </div>

          <div className="rounded-xl bg-[#F8F4FB] p-3">
            <div className="mb-2 text-[12.5px] font-bold">Exam questions <span className="font-normal text-[var(--dim)]">(one option per line; tick the correct one)</span></div>
            <div className="space-y-2">{d.questions.map((q, i) => (
              <div key={i} className="space-y-1.5 rounded-xl bg-white p-2.5">
                <div className="flex gap-2"><input className={field} value={q.prompt} onChange={(e) => setQ(i, { prompt: e.target.value })} placeholder={`Question ${i + 1}`} /><button onClick={() => setD({ ...d, questions: d.questions.filter((_, j) => j !== i) })} className="px-2 text-[12px] font-semibold text-[#C2412D]">Remove</button></div>
                <textarea className={`${field} min-h-[70px]`} value={q.options} onChange={(e) => setQ(i, { options: e.target.value })} placeholder={"Option A\nOption B\nOption C"} />
                <div className="flex flex-wrap gap-2">{opts(q.options).map((o, j) => (<label key={j} className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] ${q.correct === j ? "bg-[#DDF5EC] font-bold text-[#0a7a56]" : "bg-[#F4EFF8]"}`}><input type="radio" checked={q.correct === j} onChange={() => setQ(i, { correct: j })} />{o}</label>))}</div>
              </div>
            ))}</div>
            <button onClick={() => setD({ ...d, questions: [...d.questions, { prompt: "", options: "", correct: 0 }] })} className="mt-2 text-[12.5px] font-bold text-[#8b3fa6]">+ Add question</button>
          </div>

          <label className="flex items-center gap-2 text-[13px] font-semibold"><Switch on={d.active} onChange={(v) => setD({ ...d, active: v })} /> Live</label>
          <div className="flex gap-2"><Btn2 disabled={busy} onClick={() => void save()}>{busy ? "Saving..." : d.id ? "Save changes" : "Publish course"}</Btn2><button onClick={() => setD(null)} className="rounded-xl bg-white px-3.5 py-2 text-[13px] font-semibold ring-2 ring-[#E6DCF0]">Cancel</button></div>
        </div>
      ) : <Btn2 onClick={() => setD(blank)}>+ New certificate course</Btn2>}

      {rows.length > 0 && (
        <div className="mt-4 divide-y divide-[#F0EAF7] rounded-xl border-2 border-[#F0EAF7]">{rows.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="text-[14px] font-semibold">{c.title}</span><Pill tone={c.active ? "green" : "gray"}>{c.active ? "live" : "off"}</Pill></div>
              <div className="text-[12px] text-[var(--dim)]">{c.sponsor_name} · {c.lessons.length} lessons · {c.questions.length} questions · pass {c.pass_pct}% · {c.price_ngn ? `₦${Number(c.price_ngn).toLocaleString("en-NG")}` : "free"}</div>
              <div className="text-[12.5px]"><b>{c.takers}</b> took the exam · <b>{c.passers}</b> passed · <b>{c.issued}</b> certificates{Number(c.revenue) ? ` · ₦${Math.round(Number(c.revenue)).toLocaleString("en-NG")} earned` : ""}</div>
            </div>
            <button onClick={() => edit(c)} className="rounded-xl bg-white px-3 py-1.5 text-[12.5px] font-semibold ring-2 ring-[#E6DCF0]">Edit</button>
            <button onClick={() => void remove(c)} className="rounded-xl bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#C2412D] ring-2 ring-[#E6DCF0]">Delete</button>
          </div>
        ))}</div>
      )}
    </Card>
  );
}
