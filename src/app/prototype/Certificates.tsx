"use client";

/* eslint-disable @next/next/no-img-element -- sponsor logos are arbitrary https URLs */
import { Award, BookOpen, ChevronDown, ExternalLink, PlayCircle, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getCertCourse, listCertCourses, myCertificates, submitExam, unlockCertificate, type CertCourse, type CertListItem, type ExamResult } from "./live/certData";
import { cleanUrl } from "./live/socialData";
import { naira, useApp } from "./store";
import { Btn, Sheet } from "./ui";

const certUrl = (code: string) => `${window.location.origin}/cert/${code}`;
const EXAM_ERRORS: Record<string, string> = { too_many_attempts: "You've used today's 3 attempts. Try again tomorrow.", not_found: "This course isn't available anymore." };

function Logo({ src, size = 40 }: { src: string | null; size?: number }) {
  return src ? <img src={src} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-xl object-cover" />
    : <div style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-xl bg-[var(--study-soft)] text-[var(--study)]"><Award size={size / 2} /></div>;
}

/** Top of Explore > Courses: sponsor courses that end in a certificate. */
export function CertStrip({ active }: { active: boolean }) {
  const { auth } = useApp();
  const [items, setItems] = useState<CertListItem[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [mine, setMine] = useState(false);
  useEffect(() => { if (active && auth.status === "in") void listCertCourses().then(setItems); }, [active, auth.status, open]);
  if (auth.status !== "in" || items.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Earn a certificate</span>{items.some((i) => i.my_code) && <button onClick={() => setMine(true)} className="text-[12px] font-bold text-[var(--study)]">My certificates</button>}</div>
      <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">{items.map((c) => (
        <button key={c.id} onClick={() => setOpen(c.id)} className="w-60 shrink-0 rounded-2xl border border-[var(--line)] bg-white p-3 text-left active:scale-[0.98]">
          <div className="flex items-center gap-2.5"><Logo src={c.sponsor_logo} /><div className="min-w-0"><div className="line-clamp-2 text-[13.5px] font-bold leading-snug">{c.title}</div><div className="truncate text-[11.5px] text-[var(--dim)]">by {c.sponsor_name}</div></div></div>
          <div className="mt-2 flex items-center justify-between text-[11.5px]">
            <span className="text-[var(--dim)]">{c.lesson_count} lesson{c.lesson_count === 1 ? "" : "s"} · {c.question_count}-question exam</span>
            {c.my_code ? <span className="font-bold text-[var(--uni-deep)]">Earned</span> : <span className="font-bold text-[var(--study)]">{c.price_ngn ? naira(c.price_ngn) : "Free"}</span>}
          </div>
        </button>
      ))}</div>
      <CertCourseSheet id={open} onClose={() => setOpen(null)} />
      <MyCertificates open={mine} onClose={() => setMine(false)} />
    </div>
  );
}

function MyCertificates({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [list, setList] = useState<Awaited<ReturnType<typeof myCertificates>>>([]);
  useEffect(() => { if (open) void myCertificates().then(setList); }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="My certificates">
      <div className="space-y-2">{list.map((c) => (
        <a key={c.code} href={`/cert/${c.code}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-[var(--line)]">
          <Award size={20} className="shrink-0 text-[var(--study)]" /><div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-bold">{c.title}</div><div className="text-[11.5px] text-[var(--dim)]">{c.sponsor} · {new Date(c.issued_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })} · {c.score_pct}%</div></div><ExternalLink size={14} className="text-[var(--dim)]" />
        </a>
      ))}</div>
    </Sheet>
  );
}

function CertCourseSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { flash, refreshWallet, setWalletOpen } = useApp();
  const [c, setC] = useState<CertCourse | null>(null);
  const [lesson, setLesson] = useState<number | null>(0);
  const [exam, setExam] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ExamResult | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id) return;
    void getCertCourse(id).then((x) => { setC(x); setLesson(0); setExam(false); setAnswers({}); setResult(null); });
  }, [id]);

  async function submit() {
    if (!c) return;
    setBusy(true); const r = await submitExam(c.id, answers); setBusy(false);
    if (r.error) return flash(EXAM_ERRORS[r.error] ?? "Couldn't submit. Try again.");
    setResult(r.result!); setExam(false);
    setC(await getCertCourse(c.id));
  }
  async function unlock() {
    if (!c) return;
    setBusy(true); const r = await unlockCertificate(c.id); setBusy(false);
    if (r.error) {
      if (/insufficient_funds/.test(r.error)) { flash(`Top up first. The certificate is ${naira(c.price_ngn)}`); onClose(); setWalletOpen(true); return; }
      return flash("Couldn't issue the certificate. Try again.");
    }
    void refreshWallet(); flash("Certificate issued"); setC(await getCertCourse(c.id));
  }
  async function share(code: string) {
    const text = `I just earned the "${c?.title}" certificate from ${c?.sponsor_name} on Birdie. Verify it here: ${certUrl(code)}`;
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); flash("Link copied"); } } catch { /* cancelled */ }
  }

  const all = c ? c.questions.every((q) => answers[q.id] !== undefined) : false;
  return (
    <Sheet open={!!id} onClose={onClose} title={c?.title}>
      {!c ? <p className="py-6 text-center text-[13px] text-[var(--dim)]">Loading...</p> : exam ? (
        <div className="space-y-4">
          <p className="text-[12.5px] text-[var(--dim)]">Pass mark {c.pass_pct}%. {3 - c.attempts_today} attempt{3 - c.attempts_today === 1 ? "" : "s"} left today.</p>
          {c.questions.map((q, i) => (
            <div key={q.id}>
              <div className="mb-1.5 text-[13.5px] font-semibold">{i + 1}. {q.prompt}</div>
              <div className="space-y-1.5">{q.options.map((o, j) => (
                <button key={j} onClick={() => setAnswers((a) => ({ ...a, [q.id]: j }))} className={`w-full rounded-xl border-2 px-3 py-2 text-left text-[13px] ${answers[q.id] === j ? "border-[var(--study)] bg-[var(--study-soft)]" : "border-[var(--line)] bg-white"}`}>{o}</button>
              ))}</div>
            </div>
          ))}
          <Btn variant="study" disabled={busy || !all} onClick={() => void submit()}>{busy ? "Marking..." : all ? "Submit answers" : `Answer all ${c.questions.length} questions`}</Btn>
          <button onClick={() => setExam(false)} className="w-full text-center text-[12.5px] font-semibold text-[var(--dim)]">Back to the lessons</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3"><Logo src={c.sponsor_logo} size={44} /><div className="text-[12.5px] text-[var(--dim)]">Offered by <b className="text-[var(--text)]">{c.sponsor_name}</b> · certificate {c.price_ngn ? naira(c.price_ngn) : "free"}</div></div>
          {c.description && <p className="whitespace-pre-line text-[13.5px] leading-snug">{c.description}</p>}

          {result && (
            <div className={`rounded-2xl p-3.5 text-[13.5px] ${result.passed ? "bg-[var(--uni-soft)] text-[var(--uni-deep)]" : "bg-[var(--paper-dim)]"}`}>
              <b>{result.score_pct}%</b> ({result.right}/{result.total}). {result.passed ? "You passed." : `You need ${result.pass_pct}% to pass. Review the lessons and try again.`}
            </div>
          )}

          {c.my_code ? (
            <div className="rounded-[20px] bg-[var(--ink)] p-4 text-[var(--paper)]">
              <div className="flex items-center gap-2 text-[13px] font-bold"><Award size={16} /> Certificate earned</div>
              <div className="mt-1 font-mono text-[18px] font-bold tracking-wider">{c.my_code}</div>
              <div className="mt-2 flex gap-2">
                <a href={`/cert/${c.my_code}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-[12.5px] font-semibold"><ExternalLink size={14} /> View</a>
                <button onClick={() => void share(c.my_code!)} className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-[12.5px] font-semibold"><Share2 size={14} /> Share</button>
              </div>
            </div>
          ) : c.passed && c.price_ngn > 0 ? (
            <Btn variant="study" disabled={busy} onClick={() => void unlock()}><span className="inline-flex items-center gap-2"><Award size={16} /> {busy ? "Issuing..." : `Get my certificate for ${naira(c.price_ngn)}`}</span></Btn>
          ) : null}

          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Lessons</div>
            <div className="space-y-1.5">{c.lessons.map((l, i) => {
              const v = l.video_url ? cleanUrl(l.video_url) : null;
              return (
                <div key={i} className="rounded-xl bg-white ring-1 ring-[var(--line)]">
                  <button onClick={() => setLesson(lesson === i ? null : i)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left"><BookOpen size={15} className="shrink-0 text-[var(--study)]" /><span className="flex-1 text-[13.5px] font-semibold">{i + 1}. {l.title}</span><ChevronDown size={15} className={`transition ${lesson === i ? "rotate-180" : ""}`} /></button>
                  {lesson === i && <div className="space-y-2 px-3 pb-3">
                    {l.body && <p className="whitespace-pre-line text-[13px] leading-relaxed">{l.body}</p>}
                    {v && <a href={v} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--study)]"><PlayCircle size={15} /> Watch the video</a>}
                  </div>}
                </div>
              );
            })}</div>
          </div>

          {!c.my_code && !(c.passed && c.price_ngn > 0) && (
            c.questions.length === 0 ? <p className="text-[12.5px] text-[var(--dim)]">The exam isn&apos;t ready yet.</p>
              : c.attempts_today >= 3 ? <p className="text-[12.5px] text-[var(--dim)]">You&apos;ve used today&apos;s 3 attempts. Come back tomorrow.</p>
              : <Btn variant="study" onClick={() => { setAnswers({}); setResult(null); setExam(true); }}>{c.best !== null ? `Retake the exam (best so far ${c.best}%)` : `Take the exam (${c.questions.length} questions)`}</Btn>
          )}
        </div>
      )}
    </Sheet>
  );
}
