"use client";

// A company's jobs: internships, SIWES, graduate roles. Students apply with their Birdie CV and a verified
// school tick; the company moves each one along (shortlist, interview, offer, hired, not this time) and
// the student is told at every step. Interviews land on the student's schedule with reminders.
import { BadgeCheck, Briefcase, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Area, Box, Empty, Field, Head, Pick, Pill, Primary, Row, SaveBtn, Secondary, when } from "./bizkit";
import { APP_LABEL, appSet, bizOpportunities, errText, OPP_LABEL, oppApplicants, oppClose, oppSave, type Application, type AppStatus, type BizHome, type OppKind, type Opportunity } from "./live/bizData";
import { useApp } from "./store";
import { Page } from "./ui";

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function BizJobs({ b }: { b: BizHome }) {
  const { flash } = useApp();
  const [opps, setOpps] = useState<Opportunity[] | null>(null);
  const [edit, setEdit] = useState<Record<string, string | boolean> | null>(null);
  const [open, setOpen] = useState<Opportunity | null>(null);
  const load = useCallback(() => { void bizOpportunities(b.id).then(setOpps); }, [b.id]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const blank = { kind: "internship", title: "", description: "", location: "", mode: "onsite", paid: false, stipend: "", schools: "", courses: "", levels: "", states: "", deadline: "", questions: "" };
  async function save() {
    const e = edit!;
    const r = await oppSave(b.id, { ...e, schools: list(String(e.schools)), courses: list(String(e.courses)), levels: list(String(e.levels)), states: list(String(e.states)), questions: String(e.questions).split("\n").map((x) => x.trim()).filter(Boolean) });
    if (r.error) return flash(errText(r.error)); setEdit(null); load(); flash("Live. Matching students can see it now.");
  }
  if (!b.verified) return <Empty icon={<BadgeCheck size={36} />} title="Get verified to post jobs" sub="Students only see jobs from businesses checked against CAC. It's ₦5,000 once, in More > Verification." />;
  return (
    <div>
      <div className="px-4 pt-3"><Primary onClick={() => setEdit(blank)}>Post a Job</Primary></div>
      <Head>Your jobs</Head>
      {opps === null ? <p className="py-6 text-center text-[var(--we-sub)]">Loading...</p> : opps.length === 0 ? <Box><Empty icon={<Briefcase size={32} />} title="No jobs yet" sub="Students who match your school, course, level and state see it in Internships & SIWES." /></Box> : (
        <Box>{opps.map((o) => (
          <Row key={o.id} label={<span className="flex items-center gap-1.5">{o.title}{o.status !== "live" && <Pill>Closed</Pill>}</span>} sub={`${OPP_LABEL[o.kind]} · ${o.applicants} applicant${o.applicants === 1 ? "" : "s"}${o.deadline ? ` · closes ${new Date(o.deadline).toLocaleDateString()}` : ""}`}
            value={o.new ? <Pill tone="red">{o.new} new</Pill> : undefined} onClick={() => setOpen(o)} />
        ))}</Box>
      )}

      <Page open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit Job" : "New Job"} right={<SaveBtn label={edit?.id ? "Save" : "Post"} onClick={() => void save()} disabled={String(edit?.title ?? "").trim().length < 4 || String(edit?.description ?? "").trim().length < 30} />}>
        {edit && (<>
          <Head>The role</Head>
          <Box>
            <Pick label="Type" value={String(edit.kind) as OppKind} onChange={(v) => setEdit((x) => ({ ...x!, kind: v }))} options={Object.entries(OPP_LABEL) as [OppKind, string][]} />
            <Field label="Title" value={String(edit.title)} onChange={(v) => setEdit((x) => ({ ...x!, title: v }))} placeholder="e.g. SIWES Software Developer" />
            <Area label="Description" value={String(edit.description)} onChange={(v) => setEdit((x) => ({ ...x!, description: v }))} rows={6} max={5000} placeholder="What they'll do, what they'll learn, how long, who you want" />
            <Field label="Location" value={String(edit.location)} onChange={(v) => setEdit((x) => ({ ...x!, location: v }))} placeholder="e.g. Lokoja, Kogi" />
            <Pick label="Where" value={String(edit.mode) as "onsite"} onChange={(v) => setEdit((x) => ({ ...x!, mode: v }))} options={[["onsite", "On site"], ["hybrid", "Hybrid"], ["remote", "Remote"]]} />
            <Field label="Stipend" value={String(edit.stipend)} onChange={(v) => setEdit((x) => ({ ...x!, stipend: v, paid: v.trim() !== "" }))} placeholder="e.g. ₦40,000 a month (empty if unpaid)" />
            <Field label="Deadline" type="date" value={String(edit.deadline ?? "")} onChange={(v) => setEdit((x) => ({ ...x!, deadline: v }))} />
          </Box>
          <Head>Who it&apos;s for (empty = anyone)</Head>
          <Box>
            <Field label="Courses" value={String(edit.courses)} onChange={(v) => setEdit((x) => ({ ...x!, courses: v }))} placeholder="e.g. Computer Science, Software" />
            <Field label="Levels" value={String(edit.levels)} onChange={(v) => setEdit((x) => ({ ...x!, levels: v }))} placeholder="e.g. 300, 400" />
            <Field label="Schools" value={String(edit.schools)} onChange={(v) => setEdit((x) => ({ ...x!, schools: v }))} placeholder="Comma between schools" />
            <Field label="States" value={String(edit.states)} onChange={(v) => setEdit((x) => ({ ...x!, states: v }))} placeholder="e.g. Kogi, Abuja" />
          </Box>
          <Head>Questions (up to 5, one per line)</Head>
          <Box><Area label="Ask applicants" value={String(edit.questions)} onChange={(v) => setEdit((x) => ({ ...x!, questions: v }))} rows={4} placeholder={"Why do you want this?\nShow us something you've built"} /></Box>
          <p className="px-4 pb-10 pt-2 text-[12.5px] text-[var(--we-hint)]">Applicants send their Birdie CV and answers. A tick means Birdie checked their student ID.</p>
        </>)}
      </Page>
      {open && <Applicants opp={open} onClose={() => { setOpen(null); load(); }} onEdit={() => { setEdit({ ...blank, ...open, schools: open.schools.join(", "), courses: open.courses.join(", "), levels: open.levels.join(", "), states: open.states.join(", "), questions: open.questions.join("\n"), stipend: open.stipend ?? "", location: open.location ?? "", deadline: open.deadline ?? "" } as never); setOpen(null); }} />}
    </div>
  );
}

const STAGES: AppStatus[] = ["new", "shortlisted", "interview", "offer", "hired", "rejected"];
function Applicants({ opp, onClose, onEdit }: { opp: Opportunity; onClose: () => void; onEdit: () => void }) {
  const { flash, openDm } = useApp();
  const [list, setList] = useState<Application[] | null>(null);
  const [stage, setStage] = useState<AppStatus>("new");
  const [one, setOne] = useState<Application | null>(null);
  const [iv, setIv] = useState({ at: "", note: "" });
  const load = useCallback(() => { void oppApplicants(opp.id).then(setList); }, [opp.id]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function move(a: Application, s: AppStatus) {
    if (s === "interview" && !iv.at) return flash("Pick the interview time");
    const r = await appSet(a.id, s, s === "interview" ? new Date(`${iv.at}:00+01:00`) : null, s === "interview" ? iv.note : undefined);
    if (r.error) return flash(errText(r.error));
    setOne(r.data); load(); flash(`Moved to ${APP_LABEL[s]}. They were told.`);
  }
  const shown = (list ?? []).filter((a) => a.status === stage);
  return (
    <Page open onClose={onClose} title={opp.title} right={<button onClick={onEdit} className="px-2 text-[14px] text-[var(--we-link)]">Edit</button>}>
      <div className="no-scrollbar flex gap-5 overflow-x-auto bg-[var(--we-bg)] px-4 pb-2 pt-3 text-[15px]">
        {STAGES.map((s) => { const n = (list ?? []).filter((a) => a.status === s).length; return <button key={s} onClick={() => setStage(s)} className={`shrink-0 pb-1 ${stage === s ? "border-b-2 border-[var(--we-accent)] font-medium text-[var(--we-text)]" : "text-[var(--we-sub)]"}`}>{APP_LABEL[s]}{n ? ` ${n}` : ""}</button>; })}
      </div>
      {list === null ? <p className="py-10 text-center text-[var(--we-sub)]">Loading...</p> : shown.length === 0 ? <Empty icon={<Users size={32} />} title="Nobody here" /> : (
        <Box>{shown.map((a) => (
          <Row key={a.id} label={<span className="flex items-center gap-1">{a.who?.name}{a.who?.verified && <BadgeCheck size={15} className="text-[#2AAE67]" />}</span>} sub={[a.who?.school, a.who?.course, a.who?.level && `${a.who.level} level`].filter(Boolean).join(" · ")} value={a.interview_at && a.status === "interview" ? when(a.interview_at) : undefined} onClick={() => { setOne(a); setIv({ at: "", note: "" }); }} />
        ))}</Box>
      )}
      {opp.status === "live" && <div className="px-4 pb-10 pt-6"><Secondary onClick={async () => { if (!confirm("Close this job? Nobody else can apply.")) return; await oppClose(opp.id); onClose(); }}>Close Applications</Secondary></div>}

      <Page open={!!one} onClose={() => setOne(null)} title={one?.who?.name ?? "Applicant"}>
        {one && (<>
          <div className="bg-[var(--we-cell)] px-4 py-4">
            <div className="flex items-center gap-1.5 text-[18px] font-semibold text-[var(--we-text)]">{one.who?.name}{one.who?.verified && <BadgeCheck size={17} className="text-[#2AAE67]" />}</div>
            <div className="text-[13.5px] text-[var(--we-sub)]">{[one.who?.school, one.who?.course, one.who?.level && `${one.who.level} level`].filter(Boolean).join(" · ")}</div>
            <div className="mt-2 flex gap-2"><Pill tone="accent">{APP_LABEL[one.status]}</Pill>{one.who?.verified && <Pill tone="green">School verified</Pill>}</div>
          </div>
          {opp.questions.length > 0 && (<><Head>Answers</Head><Box>{opp.questions.map((q, i) => <div key={q} className="border-b border-[var(--we-sep)] px-4 py-3 last:border-0"><div className="text-[13px] text-[var(--we-sub)]">{q}</div><div className="mt-0.5 whitespace-pre-line text-[15px] text-[var(--we-text)]">{one.answers[i] ?? ""}</div></div>)}</Box></>)}
          <Head>CV</Head>
          <Box className="px-4 py-3">
            {one.cv?.summary && <p className="whitespace-pre-line text-[15px] text-[var(--we-text)]">{one.cv.summary}</p>}
            {(one.cv?.projects ?? []).map((p) => <div key={p.title} className="mt-3"><div className="text-[15px] font-medium text-[var(--we-text)]">{p.title}{p.finalYear ? " · Final-year project" : ""}</div>{p.detail && <div className="text-[14px] text-[var(--we-sub)]">{p.detail}</div>}</div>)}
            {(one.cv?.experience ?? []).map((p) => <div key={p.title} className="mt-3"><div className="text-[15px] font-medium text-[var(--we-text)]">{p.title}</div>{p.detail && <div className="text-[14px] text-[var(--we-sub)]">{p.detail}</div>}</div>)}
            {(one.cv?.skills ?? []).length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{one.cv!.skills!.map((s) => <Pill key={s}>{s}</Pill>)}</div>}
            {!one.cv && <p className="text-[14px] text-[var(--we-sub)]">No CV on Birdie yet.</p>}
          </Box>
          <Head>Move to</Head>
          <Box>
            <div className="flex flex-wrap gap-2 px-4 py-3">{STAGES.filter((s) => s !== one.status && s !== "new" && s !== "interview").map((s) => (
              <button key={s} onClick={() => void move(one, s)} className={`rounded-full px-3 py-1.5 text-[14px] ${s === "rejected" ? "bg-[#FDECEA] text-[var(--we-red)]" : "bg-[var(--we-bg)] text-[var(--we-text)]"}`}>{APP_LABEL[s]}</button>
            ))}</div>
            <Field label="Interview" type="datetime-local" value={iv.at} onChange={(v) => setIv((x) => ({ ...x, at: v }))} />
            <Field label="Where / link" value={iv.note} onChange={(v) => setIv((x) => ({ ...x, note: v }))} placeholder="e.g. Google Meet link, or our office" />
          </Box>
          <div className="space-y-2 px-4 pb-10 pt-3">
            <Primary disabled={!iv.at} onClick={() => void move(one, "interview")}>Invite to Interview</Primary>
            <Secondary onClick={() => void openDm(one.user_id)}>Message</Secondary>
          </div>
        </>)}
      </Page>
    </Page>
  );
}
