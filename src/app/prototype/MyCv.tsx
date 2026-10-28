"use client";

// Me > My CV: a CV built from what you've actually done in Birdie (your school and course of study,
// courses, shared courses, certificates you earned) plus what you add: a summary, projects (mark your
// final-year project), experience (SIWES, internships) and skills. Download it as a PDF.
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { askAI } from "./aiClient";
import { myCertificates } from "./live/certData";
import { useApp, type CvEntry } from "./store";
import { Page } from "./ui";

const CvHead = ({ t, add }: { t: string; add?: () => void }) => (
  <div className="flex items-center justify-between px-4 pb-1.5 pt-4"><span className="text-[13px] text-[var(--we-sub)]">{t}</span>{add && <button onClick={add} className="flex items-center gap-1 text-[13px] text-[var(--we-link)]"><Plus size={14} />Add</button>}</div>
);
/** "300" or "300 Level" -> "300 Level". */
const levelOf = (l: string) => (/level/i.test(l) ? l : `${l} Level`);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function MyCvPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, setProfile, courses, shared, auth, flash, settings } = useApp();
  const cv = profile.cv ?? { summary: "", projects: [], experience: [], skills: [] };
  const save = (next: Partial<typeof cv>) => setProfile({ cv: { ...cv, ...next } });
  const [certs, setCerts] = useState<Awaited<ReturnType<typeof myCertificates>>>([]);
  const [skill, setSkill] = useState("");
  const [editing, setEditing] = useState<null | { list: "projects" | "experience"; i: number | null; e: CvEntry }>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open && auth.status === "in") void myCertificates().then(setCerts); }, [open, auth.status]);
  const mine = shared.filter((s) => s.ownerId === "me");
  const own = courses;

  async function writeSummary() {
    setBusy(true);
    const facts = [`Name: ${profile.name}`, profile.program && `Course of study: ${profile.program}`, profile.level && `Level: ${profile.level}`, profile.institution && `School: ${profile.institution}`,
      own.length && `Courses: ${own.slice(0, 12).map((c) => c.name).join(", ")}`, cv.projects.length && `Projects: ${cv.projects.map((p) => p.title).join("; ")}`,
      cv.experience.length && `Experience: ${cv.experience.map((p) => `${p.title} at ${p.org}`).join("; ")}`, cv.skills.length && `Skills: ${cv.skills.join(", ")}`,
      certs.length && `Certificates: ${certs.map((c) => c.title).join(", ")}`].filter(Boolean).join("\n");
    const r = await askAI({ brain: "spark", tier: settings.aiTier, feature: "chat", system: "Write a 3-sentence professional CV summary in the first person for a Nigerian university student, from the facts given. Plain, confident, no clichés, no made-up facts. Reply with only the summary.", messages: [{ role: "user", content: facts }] });
    setBusy(false);
    if (r.ok) save({ summary: r.text.trim() }); else flash("Birdie couldn't write it right now");
  }

  function download() {
    const sec = (t: string, body: string) => body ? `<h2>${t}</h2>${body}` : "";
    const entries = (xs: CvEntry[]) => xs.map((e) => `<div class="e"><b>${esc(e.title)}</b>${e.org ? ` · ${esc(e.org)}` : ""}${e.when ? `<span>${esc(e.when)}</span>` : ""}${e.final ? " <i>(Final-year project)</i>" : ""}<p>${esc(e.desc)}</p>${e.link ? `<a href="${esc(e.link)}">${esc(e.link)}</a>` : ""}</div>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(profile.name)} - CV</title><style>
      body{font:14px/1.5 Georgia,serif;color:#191919;max-width:720px;margin:40px auto;padding:0 24px}h1{margin:0;font-size:28px}.sub{color:#555}
      h2{font:600 13px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8A2FA3;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:26px}
      .e{margin:10px 0}.e span{float:right;color:#777;font-size:12px}.e p{margin:2px 0}ul{padding-left:18px;margin:6px 0}a{color:#576B95}</style></head><body>
      <h1>${esc(profile.name || "")}</h1><div class="sub">${esc([profile.program, profile.level && levelOf(profile.level), profile.institution].filter(Boolean).join(" · "))}${auth.email ? `<br>${esc(auth.email)}` : ""}</div>
      ${sec("Profile", cv.summary ? `<p>${esc(cv.summary)}</p>` : "")}
      ${sec("Education", `<div class="e"><b>${esc(profile.program || "Undergraduate")}</b>${profile.institution ? ` · ${esc(profile.institution)}` : ""}${profile.level ? `<span>${esc(levelOf(profile.level))}</span>` : ""}${own.length ? `<p>Courses: ${esc(own.map((c) => `${c.code} ${c.name}`).join(", "))}</p>` : ""}</div>`)}
      ${sec("Projects", entries(cv.projects))}${sec("Experience", entries(cv.experience))}
      ${sec("Certificates", certs.length ? `<ul>${certs.map((c) => `<li>${esc(c.title)} · ${esc(c.sponsor)} (${c.score_pct}%, ${new Date(c.issued_at).toLocaleDateString()}) · code ${esc(c.code)}</li>`).join("")}</ul>` : "")}
      ${sec("Teaching and sharing", mine.length ? `<ul>${mine.map((s) => `<li>Shared ${esc(s.code)} ${esc(s.name)} course notes with ${s.members.length} student${s.members.length === 1 ? "" : "s"} on Birdie</li>`).join("")}</ul>` : "")}
      ${sec("Skills", cv.skills.length ? `<p>${esc(cv.skills.join(" · "))}</p>` : "")}
      <script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return flash("Allow pop-ups to download your CV");
    w.document.write(html); w.document.close();
  }

  const blank: CvEntry = { title: "", org: "", when: "", desc: "", link: "", final: false };
  return (
    <Page open={open} onClose={onClose} title="My CV" right={<button onClick={download} className="mr-2 text-[15px] text-[var(--we-link)]">PDF</button>}>
      <div className="bg-[var(--we-cell)] px-4 py-4">
        <div className="text-[20px] font-semibold text-[var(--we-text)]">{profile.name || "Your name"}</div>
        <div className="text-[13.5px] text-[var(--we-sub)]">{[profile.program, profile.level && levelOf(profile.level), profile.institution].filter(Boolean).join(" · ") || "Add your school and course in Settings"}</div>
      </div>
      <CvHead t="Profile" />
      <div className="bg-[var(--we-cell)] px-4 py-3">
        <textarea value={cv.summary} onChange={(e) => save({ summary: e.target.value.slice(0, 800) })} rows={4} placeholder="A few lines about you: what you study, what you're good at, what you want next." className="w-full resize-none bg-transparent text-[15px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
        <button disabled={busy} onClick={() => void writeSummary()} className="mt-1 flex items-center gap-1.5 text-[13.5px] text-[var(--we-link)] disabled:opacity-50"><Sparkles size={14} />{busy ? "Writing..." : "Write it with Birdie"}</button>
      </div>
      <CvHead t="Education (from Birdie)" />
      <div className="bg-[var(--we-cell)] px-4 py-3 text-[14.5px] text-[var(--we-text)]">
        <div>{profile.program || "Course of study"}{profile.institution ? ` · ${profile.institution}` : ""}</div>
        {own.length > 0 && <div className="mt-1 text-[13px] text-[var(--we-sub)]">Courses: {own.map((c) => c.code).join(", ")}</div>}
      </div>
      {(["projects", "experience"] as const).map((list) => (
        <div key={list}>
          <CvHead t={list === "projects" ? "Projects" : "Experience (SIWES, internships, jobs)"} add={() => setEditing({ list, i: null, e: { ...blank } })} />
          <div className="bg-[var(--we-cell)]">
            {cv[list].length === 0 ? <p className="px-4 py-3 text-[13.5px] text-[var(--we-hint)]">{list === "projects" ? "Add your final-year project and anything you've built." : "Add SIWES and internships."}</p>
              : cv[list].map((e, i) => (
                <button key={i} onClick={() => setEditing({ list, i, e: { ...e } })} className="block w-full border-b border-[var(--we-sep)] px-4 py-3 text-left last:border-0">
                  <span className="block text-[15px] text-[var(--we-text)]">{e.title}{e.org ? ` · ${e.org}` : ""}{e.final ? " · Final-year project" : ""}</span>
                  {e.when && <span className="block text-[12.5px] text-[var(--we-sub)]">{e.when}</span>}
                  {e.desc && <span className="line-clamp-2 block text-[13px] text-[var(--we-sub)]">{e.desc}</span>}
                </button>
              ))}
          </div>
        </div>
      ))}
      <CvHead t="Skills" />
      <div className="bg-[var(--we-cell)] px-4 py-3">
        <div className="flex flex-wrap gap-2">{cv.skills.map((k) => <button key={k} onClick={() => save({ skills: cv.skills.filter((x) => x !== k) })} className="rounded-full bg-[var(--we-bg)] px-3 py-1 text-[13.5px] text-[var(--we-text)]">{k} ×</button>)}</div>
        <div className="mt-2 flex gap-2"><input value={skill} onChange={(e) => setSkill(e.target.value.slice(0, 40))} onKeyDown={(e) => { if (e.key === "Enter" && skill.trim()) { save({ skills: [...new Set([...cv.skills, skill.trim()])].slice(0, 30) }); setSkill(""); } }} placeholder="Add a skill, e.g. Python, Excel, public speaking" className="min-w-0 flex-1 rounded-[6px] bg-[var(--we-bg)] px-3 py-2 text-[14.5px] text-[var(--we-text)] outline-none" />
          <button disabled={!skill.trim()} onClick={() => { save({ skills: [...new Set([...cv.skills, skill.trim()])].slice(0, 30) }); setSkill(""); }} className="rounded-[6px] bg-[var(--we-accent)] px-3 text-[14px] text-white disabled:opacity-40">Add</button></div>
      </div>
      {(certs.length > 0 || mine.length > 0) && <>
        <CvHead t="From Birdie" />
        <div className="bg-[var(--we-cell)] px-4 py-2 text-[14px] text-[var(--we-text)]">
          {certs.map((c) => <div key={c.code} className="border-b border-[var(--we-sep)] py-2 last:border-0">🏅 {c.title} · {c.sponsor} ({c.score_pct}%)</div>)}
          {mine.map((s) => <div key={s.id} className="border-b border-[var(--we-sep)] py-2 last:border-0">📚 Shared {s.code} with {s.members.length} student{s.members.length === 1 ? "" : "s"}</div>)}
        </div>
      </>}
      <div className="px-4 py-6"><button onClick={download} className="w-full rounded-[6px] bg-[var(--we-accent)] py-3 text-[16px] font-medium text-white">Download as PDF</button></div>

      {editing && (
        <Page open onClose={() => setEditing(null)} title={editing.list === "projects" ? "Project" : "Experience"} tone="cell"
          right={<button onClick={() => { const e = editing.e; if (!e.title.trim()) return flash("Add a title"); const xs = [...cv[editing.list]]; if (editing.i === null) xs.unshift(e); else xs[editing.i] = e; save({ [editing.list]: xs.slice(0, 20) }); setEditing(null); }} className="mr-1 rounded-[4px] bg-[var(--we-accent)] px-3 py-1.5 text-[14px] text-white">Save</button>}>
          <div className="space-y-1 px-4 pt-2">
            {([["title", editing.list === "projects" ? "Title, e.g. Smart attendance system" : "Role, e.g. SIWES intern"], ["org", editing.list === "projects" ? "Supervisor or course (optional)" : "Company or organisation"], ["when", "When, e.g. Jun – Nov 2026"], ["link", "Link (optional)"]] as const).map(([k, ph]) => (
              <input key={k} value={editing.e[k]} onChange={(ev) => setEditing({ ...editing, e: { ...editing.e, [k]: ev.target.value.slice(0, k === "link" ? 300 : 120) } })} placeholder={ph} className="w-full border-b border-[var(--we-sep)] bg-transparent py-3 text-[15.5px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
            ))}
            <textarea value={editing.e.desc} onChange={(ev) => setEditing({ ...editing, e: { ...editing.e, desc: ev.target.value.slice(0, 600) } })} rows={4} placeholder="What you did and what came of it" className="w-full resize-none border-b border-[var(--we-sep)] bg-transparent py-3 text-[15.5px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
            {editing.list === "projects" && <label className="flex items-center gap-2 py-3 text-[15px] text-[var(--we-text)]"><input type="checkbox" checked={!!editing.e.final} onChange={(ev) => setEditing({ ...editing, e: { ...editing.e, final: ev.target.checked } })} className="h-4 w-4 accent-[var(--we-accent)]" />My final-year project</label>}
            {editing.i !== null && <button onClick={() => { save({ [editing.list]: cv[editing.list].filter((_, j) => j !== editing.i) }); setEditing(null); }} className="flex items-center gap-1.5 py-3 text-[15px] text-[var(--we-red)]"><Trash2 size={16} />Delete</button>}
          </div>
        </Page>
      )}
    </Page>
  );
}
