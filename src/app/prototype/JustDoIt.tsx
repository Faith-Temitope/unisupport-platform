"use client";

/* eslint-disable @next/next/no-img-element -- the student's own photo, shown from a local data URL */
import { ArrowLeft, Camera, FileText, X } from "lucide-react";
import { useRef, useState } from "react";
import { BRAINS } from "@/lib/ai/registry";
import { askAI, contextFor, stripMarkdown, type AiImage } from "./aiClient";
import { docsOf } from "./engine";
import { naira, useApp } from "./store";
import { Btn, Sheet, TextField, TopBar } from "./ui";

/** Shrinks a photo to at most 1600px on its longest side as JPEG, so it uploads fast on mobile data. */
async function photoToJpeg(f: File): Promise<{ img: AiImage; preview: string }> {
  const url = URL.createObjectURL(f);
  try {
    const el = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, 1600 / Math.max(el.naturalWidth, el.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(el.naturalWidth * k); c.height = Math.round(el.naturalHeight * k);
    c.getContext("2d")!.drawImage(el, 0, 0, c.width, c.height);
    const preview = c.toDataURL("image/jpeg", 0.85);
    return { img: { mime: "image/jpeg", data: preview.split(",")[1] }, preview };
  } finally { URL.revokeObjectURL(url); }
}

const SYSTEM = (material: string) => [
  "You are Birdie, a study assistant. Solve the student's question or assignment.",
  "Work it out step by step, showing the working a lecturer would expect, then state the final answer clearly on its own line starting with 'Answer:'.",
  "If a photo is attached, first read the question from it exactly. If parts are unreadable, say which.",
  "If course material is given below, use it and name where it came from in square brackets, e.g. [Note: Kinematics]. If it doesn't cover the question, solve it from general knowledge and say so.",
  "Write in plain text with no markdown symbols (no #, *, _ or backticks). Use simple line breaks between steps.",
  material ? `\n--- COURSE MATERIAL ---\n${material}` : "",
].join("\n");

/**
 * Snap a question (like Gauth), paste it, or pick a file from one of your courses, and Birdie
 * answers it. Free on Spark (Gemini, daily allowance); Nova and Sage charge your wallet per answer.
 */
export function JustDoIt({ onBack }: { onBack: () => void }) {
  const { courses, settings, setSetting, setWalletOpen, refreshWallet, addNote, goBirdie, flash } = useApp();
  const [courseId, setCourseId] = useState<string | null>(null);
  const [docIdx, setDocIdx] = useState<number | null>(null);
  const [task, setTask] = useState("");
  const [photo, setPhoto] = useState<{ img: AiImage; preview: string } | null>(null);
  const [warn, setWarn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const cam = useRef<HTMLInputElement>(null);
  const course = courses.find((c) => c.id === courseId) ?? null;
  const docs = course ? docsOf(course) : [];
  const files = course ? Array.from(new Map(docs.map((d, i) => [d.source, i])).entries()) : [];
  const brain = BRAINS.find((b) => b.id === settings.aiBrain) ?? BRAINS[0];
  const ready = task.trim().length >= 4 || !!photo || docIdx !== null;

  async function pickPhoto(f: File | undefined) {
    if (!f) return;
    try { setPhoto(await photoToJpeg(f)); } catch { flash("Couldn't read that photo"); }
  }

  async function go() {
    setWarn(false); setBusy(true); setResult(null);
    const picked = docIdx !== null ? docs.filter((d) => d.source === docs[docIdx].source) : [];
    const question = [task.trim(), picked.length ? `The assignment is in the file "${picked[0].source}":\n${picked.map((d) => d.text).join("\n\n").slice(0, 12000)}` : ""].filter(Boolean).join("\n\n") || "Solve the question in the photo.";
    const material = course && !picked.length ? contextFor(docs, question).text : "";
    const r = await askAI({ brain: brain.id, tier: "balanced", system: SYSTEM(material), messages: [{ role: "user", content: question }], feature: "just_do_it", images: photo ? [photo.img] : undefined });
    setBusy(false);
    if (r.ok) { setResult(stripMarkdown(r.text)); if (r.charged_ngn) { flash(`${naira(r.charged_ngn)} used`); void refreshWallet(); } return; }
    if (r.code === "insufficient_funds") { flash(`Top up to use ${brain.brand}, or switch to Spark (free)`); setWalletOpen(true); return; }
    if (r.code === "free_allowance_used") { flash(r.message); return; }
    if (r.code === "not_configured") { flash(`${brain.brand} isn't switched on yet. Use Spark.`); setSetting("aiBrain", "spark"); return; }
    flash(r.code === "guest" ? "Sign in to use Birdie" : "Birdie couldn't answer. Try again.");
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar left={<button onClick={onBack} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--paper-dim)]"><ArrowLeft size={17} /></button>} title={<div className="disp text-[17px] font-bold">Just Do It</div>} />
      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 pb-28">
        {result ? (
          <div className="space-y-3">
            {photo && <img src={photo.preview} alt="Your question" className="max-h-40 rounded-xl border border-[var(--line)] object-contain" />}
            <div className="rounded-2xl border border-[var(--line)] bg-white p-4 text-[14px] leading-relaxed"><div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--birdie)]">Birdie&apos;s answer · {brain.brand}</div><div className="whitespace-pre-line">{result}</div></div>
            {course && <Btn variant="ghost" onClick={() => { addNote(course.id, "Answer: " + (task.trim() || "photo question").slice(0, 40), result); flash(`Saved to ${course.code}`); }}>Save as a note in {course.code}</Btn>}
            <Btn onClick={() => goBirdie({ courseId: course?.id ?? "general", prompt: `Explain this answer step by step so I can do it myself next time:\n\n${result.slice(0, 3000)}` })}>Teach me how to do it</Btn>
            <button onClick={() => { setResult(null); setTask(""); setPhoto(null); setDocIdx(null); }} className="w-full py-2 text-[13px] font-semibold text-[var(--dim)]">Ask another</button>
          </div>
        ) : (<>
          <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
          {photo ? (
            <div className="relative w-fit"><img src={photo.preview} alt="Your question" className="max-h-56 rounded-2xl border border-[var(--line)] object-contain" /><button onClick={() => setPhoto(null)} aria-label="Remove photo" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"><X size={14} /></button></div>
          ) : (
            <button onClick={() => cam.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[var(--line)] bg-white py-7 active:scale-[0.99]">
              <Camera size={26} className="text-[var(--birdie)]" /><div className="text-[14px] font-bold">Snap the question</div><div className="text-[12px] text-[var(--dim)]">Or pick a photo from your gallery</div>
            </button>
          )}
          <TextField multiline value={task} onChange={setTask} placeholder="...or type / paste the question" />

          {courses.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">From a course (optional)</div>
              <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">{[{ id: null as string | null, code: "None" }, ...courses].map((c) => (<button key={c.id ?? "none"} onClick={() => { setCourseId(c.id); setDocIdx(null); }} className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold ${courseId === c.id ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{c.code}</button>))}</div>
              {course && (files.length === 0 ? <p className="mt-2 text-[12px] text-[var(--dim)]">No readable files or notes in {course.code} yet. Birdie will still answer.</p> : (
                <div className="mt-2 space-y-1.5">{files.map(([src, i]) => (
                  <button key={src} onClick={() => setDocIdx(docIdx === i ? null : i)} className={`flex w-full items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-left text-[13px] ${docIdx === i ? "border-[var(--birdie)] bg-[var(--birdie-soft)]" : "border-[var(--line)] bg-white"}`}><FileText size={15} className="shrink-0 text-[var(--dim)]" /><span className="truncate">{src.replace(/^Note: /, "")}</span>{docIdx === i && <span className="ml-auto shrink-0 text-[11px] font-bold text-[var(--birdie-text)]">The assignment</span>}</button>
                ))}<p className="text-[11.5px] text-[var(--dim)]">Tap the file that has the assignment, or leave it and Birdie uses the course as reference.</p></div>
              ))}
            </div>
          )}

          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Brain</div>
            <div className="flex gap-2">{BRAINS.map((b) => (<button key={b.id} onClick={() => setSetting("aiBrain", b.id)} className={`flex-1 rounded-xl px-2 py-2 text-[12.5px] font-semibold ${brain.id === b.id ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{b.brand}<div className="text-[10.5px] font-medium opacity-75">{b.free ? "Free" : "Uses credit"}</div></button>))}</div>
          </div>
          <Btn disabled={!ready || busy} onClick={() => setWarn(true)}>{busy ? "Birdie is working..." : "Answer it"}</Btn>
        </>)}
      </div>
      <Sheet open={warn} onClose={() => setWarn(false)} title="Quick heads up">
        <p className="mb-4 text-[14px] leading-relaxed text-[var(--dim)]">Having AI do this for you won&apos;t help you learn it yourself. We won&apos;t stop you, we just want you to know before you go ahead.</p>
        <Btn onClick={() => void go()}>Continue anyway</Btn><button onClick={() => setWarn(false)} className="mt-2 w-full py-2.5 text-[13.5px] font-semibold text-[var(--dim)]">Let me reconsider</button>
      </Sheet>
    </div>
  );
}
