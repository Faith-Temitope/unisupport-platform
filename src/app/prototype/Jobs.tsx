"use client";

// Internships, SIWES and graduate roles from verified companies, matched to your school, course, level
// and state. Apply with your Birdie CV (and your verified school tick); every move the company makes
// comes back to you as a notification, and interviews go on your schedule.
import { BadgeCheck, Briefcase, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Area, BizAvatar, Box, Empty, Head, Pill, Primary, Row, Secondary, when } from "./bizkit";
import { APP_LABEL, appWithdraw, errText, myApplications, OPP_LABEL, oppApply, oppGet, oppsForMe, type Application, type Opportunity } from "./live/bizData";
import { MyCvPage } from "./MyCv";
import { useApp } from "./store";
import { Page } from "./ui";

export const openJob = (id: string) => window.dispatchEvent(new CustomEvent("birdie-open-job", { detail: { id } }));
export const openApplications = () => window.dispatchEvent(new Event("birdie-open-applications"));

export function JobsHost() {
  const [job, setJob] = useState<string | null>(null);
  const [apps, setApps] = useState(false);
  useEffect(() => {
    const j = (e: Event) => setJob((e as CustomEvent).detail?.id ?? null), a = () => setApps(true);
    window.addEventListener("birdie-open-job", j); window.addEventListener("birdie-open-applications", a);
    return () => { window.removeEventListener("birdie-open-job", j); window.removeEventListener("birdie-open-applications", a); };
  }, []);
  return (<>
    {job && <JobPage key={job} id={job} onClose={() => setJob(null)} />}
    <MyApplications open={apps} onClose={() => setApps(false)} />
  </>);
}

/** Mini Programs > Internships & SIWES. */
export function Jobs({ onBack }: { onBack: () => void }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Opportunity[] | null>(null);
  useEffect(() => { const t = setTimeout(() => void oppsForMe(q).then(setList), q ? 300 : 0); return () => clearTimeout(t); }, [q]);
  return (
    <Page open onClose={onBack} title="Internships & SIWES" right={<button onClick={openApplications} className="px-2 text-[14px] text-[var(--we-link)]">Applied</button>}>
      <div className="px-3 pb-2 pt-1"><div className="flex items-center gap-2 rounded-[6px] bg-[var(--we-cell)] px-3 py-2"><Search size={17} className="text-[var(--we-hint)]" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search roles and companies" className="min-w-0 flex-1 bg-transparent text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" /></div></div>
      {list === null ? <p className="py-10 text-center text-[14px] text-[var(--we-sub)]">Loading...</p> : list.length === 0 ? <Empty icon={<Briefcase size={36} />} title={q ? "Nothing found" : "No roles for you right now"} sub="Roles matched to your school, course and level show here. Keep your profile and CV up to date." /> : (
        <Box>{list.map((o) => (
          <button key={o.id} onClick={() => openJob(o.id)} className="flex w-full items-start gap-3 border-b border-[var(--we-sep)] px-4 py-3 text-left last:border-0 active:bg-[var(--we-bg)]">
            <BizAvatar b={o.business} />
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] text-[var(--we-text)]">{o.title}</span>
              <span className="flex items-center gap-1 text-[13px] text-[var(--we-sub)]">{o.business.name}{o.business.verified && <BadgeCheck size={13} className="text-[#2F6FEB]" />}{o.location ? ` · ${o.location}` : ""}</span>
              <span className="mt-1 flex flex-wrap gap-1.5"><Pill tone="accent">{OPP_LABEL[o.kind]}</Pill>{o.paid && <Pill tone="green">{o.stipend || "Paid"}</Pill>}{o.mode !== "onsite" && <Pill>{o.mode}</Pill>}{o.my_application && <Pill tone="blue">{APP_LABEL[o.my_application.status]}</Pill>}</span>
            </span>
            {o.deadline && <span className="shrink-0 text-[12px] text-[var(--we-hint)]">by {new Date(o.deadline).toLocaleDateString([], { day: "numeric", month: "short" })}</span>}
          </button>
        ))}</Box>
      )}
    </Page>
  );
}

function JobPage({ id, onClose }: { id: string; onClose: () => void }) {
  const { flash, profile } = useApp();
  const [o, setO] = useState<Opportunity | null | undefined>(undefined);
  const [apply, setApply] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [cv, setCv] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { void oppGet(id).then(setO); }, [id]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  if (o === undefined) return <Page open onClose={onClose} title=""><p className="py-20 text-center text-[var(--we-sub)]">Loading...</p></Page>;
  if (!o) return <Page open onClose={onClose} title=""><Empty title="This role isn't available" /></Page>;
  const hasCv = !!(profile.cv && (profile.cv.summary || profile.cv.projects?.length || profile.cv.skills?.length));
  async function send() {
    setBusy(true); const r = await oppApply(o!.id, answers); setBusy(false);
    if (r.error) return flash(errText(r.error));
    flash(`Sent to ${o!.business.name}`); setApply(false); load();
  }
  return (
    <Page open onClose={onClose} title={o.business.name}>
      <div className="bg-[var(--we-cell)] px-4 py-4">
        <div className="flex items-center gap-3"><BizAvatar b={o.business} size={52} /><div className="min-w-0"><div className="text-[19px] font-semibold leading-tight text-[var(--we-text)]">{o.title}</div><div className="flex items-center gap-1 text-[13.5px] text-[var(--we-sub)]">{o.business.name}{o.business.verified && <BadgeCheck size={14} className="text-[#2F6FEB]" />}</div></div></div>
        <div className="mt-3 flex flex-wrap gap-1.5"><Pill tone="accent">{OPP_LABEL[o.kind]}</Pill><Pill>{o.mode === "onsite" ? "On site" : o.mode}</Pill>{o.location && <Pill>{o.location}</Pill>}<Pill tone={o.paid ? "green" : "grey"}>{o.paid ? o.stipend || "Paid" : "Unpaid"}</Pill>{o.deadline && <Pill tone="amber">Apply by {new Date(o.deadline).toLocaleDateString()}</Pill>}</div>
      </div>
      <Head>About the role</Head>
      <Box className="px-4 py-3"><p className="whitespace-pre-line text-[15px] leading-relaxed text-[var(--we-text)]">{o.description}</p></Box>
      {o.my_application ? (
        <div className="px-4 pt-4">
          <Box className="rounded-[6px]"><Row label={`You applied: ${APP_LABEL[o.my_application.status]}`} sub={o.my_application.interview_at ? `Interview ${when(o.my_application.interview_at)}` : "You'll get a notification when it moves"} onClick={openApplications} /></Box>
        </div>
      ) : (
        <div className="px-4 pb-10 pt-4"><Primary onClick={() => { setAnswers(o.questions.map(() => "")); setApply(true); }}>Apply</Primary><p className="mt-2 text-center text-[12.5px] text-[var(--we-hint)]">{o.applicants} applied so far</p></div>
      )}
      <Page open={apply} onClose={() => setApply(false)} title="Apply">
        <Head>What they get</Head>
        <Box>
          <Row label="Your Birdie CV" sub={hasCv ? "Summary, projects, experience and skills" : "Empty. Add a summary and a project so you stand out."} value={hasCv ? "Ready" : undefined} onClick={() => setCv(true)} />
          <Row label="Your school, course and level" sub={[profile.institution, profile.program, profile.level].filter(Boolean).join(" · ") || "Add them in Settings > My Profile"} />
        </Box>
        {o.questions.length > 0 && (<><Head>Their questions</Head><Box>{o.questions.map((q, i) => <Area key={q} label={q} value={answers[i] ?? ""} onChange={(v) => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))} rows={3} />)}</Box></>)}
        <div className="space-y-2 px-4 pb-10 pt-4">
          <Primary disabled={busy || answers.some((a) => !a.trim())} onClick={() => void send()}>{busy ? "Sending..." : "Send Application"}</Primary>
          {!hasCv && <Secondary onClick={() => setCv(true)}>Fill My CV First</Secondary>}
        </div>
      </Page>
      <MyCvPage open={cv} onClose={() => setCv(false)} />
    </Page>
  );
}

function MyApplications({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { flash } = useApp();
  const [list, setList] = useState<Application[] | null>(null);
  const load = useCallback(() => { void myApplications().then(setList); }, []);
  useEffect(() => { if (open) void Promise.resolve().then(load); }, [open, load]);
  return (
    <Page open={open} onClose={onClose} title="My Applications">
      {list === null ? <p className="py-10 text-center text-[var(--we-sub)]">Loading...</p> : list.length === 0 ? <Empty icon={<Briefcase size={36} />} title="No applications yet" sub="Find roles in Discover > Mini Programs > Internships & SIWES." /> : (
        <Box>{list.map((a) => (
          <Row key={a.id} label={a.opportunity?.title ?? "Role"} sub={`${a.opportunity?.business.name ?? ""}${a.interview_at && a.status === "interview" ? ` · Interview ${when(a.interview_at)}` : ""}${a.interview_note && a.status === "interview" ? ` · ${a.interview_note}` : ""}`}
            value={<span className="flex items-center gap-2"><Pill tone={a.status === "hired" || a.status === "offer" ? "green" : a.status === "rejected" ? "red" : a.status === "interview" ? "amber" : "grey"}>{APP_LABEL[a.status]}</Pill>
              {!["hired", "rejected", "withdrawn"].includes(a.status) && <span role="button" onClick={async (e) => { e.stopPropagation(); if (!confirm("Withdraw this application?")) return; const r = await appWithdraw(a.id); if (r.error) flash(errText(r.error)); load(); }} className="text-[13px] text-[var(--we-red)]">Withdraw</span>}</span>}
            onClick={() => a.opportunity && openJob(a.opportunity.id)} />
        ))}</Box>
      )}
    </Page>
  );
}
