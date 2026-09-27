"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic, ShieldCheck, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./store";
import { Btn, Sheet, TextField, mmss, useTicker } from "./ui";

/** Consent -> real microphone recording (floating bar on any tab) -> choose a course afterwards. */
export default function Recorder() {
  const { recorderOpen, setRecorderOpen, courses, addCourse, addRec, flash, settings } = useApp();
  const [phase, setPhase] = useState<"idle" | "consent" | "recording" | "save">("idle");
  const [dest, setDest] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [len, setLen] = useState(0);
  const [url, setUrl] = useState<string | undefined>();
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const secs = useTicker(phase === "recording");

  useEffect(() => {
    if (recorderOpen && phase === "idle") setPhase(settings.recordReminder ? "consent" : "recording");
    if (!recorderOpen && phase === "consent") setPhase("idle");
  }, [recorderOpen, phase, settings.recordReminder]);

  useEffect(() => { if (phase === "recording") void begin(); }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (phase === "save" && !dest) setDest(courses[0]?.id ?? "new"); }, [phase, dest, courses]);

  async function begin() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const mr = new MediaRecorder(s);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => { setUrl(URL.createObjectURL(new Blob(chunks.current, { type: mr.mimeType || "audio/webm" }))); s.getTracks().forEach((t) => t.stop()); };
      mr.start();
      rec.current = mr;
    } catch {
      flash("Microphone is blocked. Allow it in your browser to record");
      setPhase("idle"); setRecorderOpen(false);
    }
  }

  function stop() { setLen(secs); rec.current?.stop(); setPhase("save"); }
  function close() { stream.current?.getTracks().forEach((t) => t.stop()); setPhase("idle"); setRecorderOpen(false); setDest(""); setNewName(""); setUrl(undefined); }

  function save() {
    let id = dest;
    if (dest === "new") id = addCourse(newName.trim().slice(0, 8).toUpperCase(), newName.trim(), null);
    addRec(id, { name: `Lecture recording`, dur: Math.max(len, 1), url });
    flash("Saved to your course");
    setPhase("idle"); setRecorderOpen(false); setDest(""); setNewName(""); setUrl(undefined);
  }

  return (
    <>
      <Sheet open={phase === "consent"} onClose={close} title="Before you record">
        <div className="mb-4 flex gap-3 rounded-2xl bg-[var(--uni-soft)] p-3.5 text-[13px] leading-snug text-[var(--uni-deep)]">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" />
          <span>Only record where your lecturer and school allow it. Some places (for example under GDPR or FERPA) require consent. Your recording stays private to you unless you share the course.</span>
        </div>
        <Btn variant="ink" onClick={() => setPhase("recording")}>I have permission, start recording</Btn>
        <button onClick={close} className="mt-2 w-full py-2.5 text-[13.5px] font-semibold text-[var(--dim)]">Cancel</button>
      </Sheet>

      <AnimatePresence>
        {phase === "recording" && (
          <motion.button initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} onClick={stop} aria-label="Stop recording"
            className="absolute left-1/2 top-14 z-[75] flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#C2412D] py-2 pl-3 pr-4 text-white shadow-xl active:scale-95">
            <motion.span className="h-2.5 w-2.5 rounded-full bg-white" animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
            <span className="font-mono text-[13px] font-semibold">{mmss(secs)}</span>
            <span className="flex items-center gap-1 text-[12.5px] font-semibold"><Square size={12} className="fill-white" /> Stop</span>
          </motion.button>
        )}
      </AnimatePresence>

      <Sheet open={phase === "save"} onClose={close} title="Save this recording">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--help-soft)] text-[var(--help)]"><Mic size={18} /></div>
          <div className="min-w-0 flex-1"><div className="text-[14px] font-semibold">Recording · {mmss(len)}</div>{url && <audio src={url} controls className="mt-1.5 h-8 w-full" />}</div>
        </div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Which course does it belong to?</div>
        <div className="mb-4 space-y-2">
          {courses.map((c) => (<button key={c.id} onClick={() => setDest(c.id)} className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left text-[14px] font-semibold transition active:scale-[0.98] ${dest === c.id ? "border-[var(--study)] bg-[var(--study-soft)]" : "border-[var(--line)] bg-white"}`}><span className="h-3 w-3 rounded-full" style={{ background: c.color }} /> {c.code} · {c.name}</button>))}
          <button onClick={() => setDest("new")} className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left text-[14px] font-semibold transition active:scale-[0.98] ${dest === "new" ? "border-[var(--study)] bg-[var(--study-soft)]" : "border-dashed border-[var(--line)]"}`}>+ New course</button>
          {dest === "new" && <TextField value={newName} onChange={setNewName} placeholder="Course name, e.g. Mechanics" />}
        </div>
        <Btn variant="study" disabled={dest === "new" && !newName.trim()} onClick={save}>Save recording</Btn>
        <button onClick={close} className="mt-2 w-full py-2.5 text-[13.5px] font-semibold text-[var(--dim)]">Discard</button>
      </Sheet>
    </>
  );
}
