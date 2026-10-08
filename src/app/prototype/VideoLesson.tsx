"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BRAINS } from "@/lib/ai/registry";
import { askAI, contextFor, parseJson, sanitizeDeep } from "./aiClient";
import { docsOf } from "./engine";
import { useApp, type Course } from "./store";
import { Btn, TextField } from "./ui";

interface Slide { title: string; points: string[]; say: string }

const LESSON_SYSTEM = (material: string, topic: string) => `You make short explainer video lessons for a university student, like a good YouTube explainer.
Topic: ${topic}
${material ? `Use this course material first (it's what their lecturer taught):\n${material}\n` : "Use accurate general knowledge."}
Return ONLY a JSON array of 5 to 7 slides, no other text. Each slide: {"title": short heading, "points": 2 to 4 short bullet lines shown on screen, "say": what the narrator says for this slide, 2 to 4 natural spoken sentences that explain (not just read) the points}.
Start with what the topic is and why it matters, build up step by step with an example, and end with a one-slide recap. Plain text only, no markdown symbols.`;

/** Birdie writes a lesson and plays it as narrated slides, using the phone's own voice. Free to replay. */
export function VideoLesson({ course, onClose }: { course: Course | null; onClose: () => void }) {
  const { settings, addNote, flash, refreshWallet, openPlus } = useApp();
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const speaking = useRef<SpeechSynthesisUtterance | null>(null);
  const brain = BRAINS.find((b) => b.id === settings.aiBrain) ?? BRAINS[0];

  async function make() {
    const t = topic.trim() || (course ? `the key ideas of ${course.code} ${course.name}` : "");
    if (!t) return flash("Say what the lesson should be about");
    setBusy(true);
    const material = course ? contextFor(docsOf(course), t).text : "";
    const r = await askAI({ brain: brain.id, tier: "balanced", system: LESSON_SYSTEM(material, t), messages: [{ role: "user", content: "Make the lesson now." }], feature: "lesson" });
    setBusy(false);
    if (!r.ok && r.code === "plus") return openPlus(r.message);
    if (!r.ok) return flash(r.code === "insufficient_funds" ? "Top up, or switch Birdie to Spark (free)" : r.message);
    if (r.charged_ngn) void refreshWallet();
    const list = sanitizeDeep(parseJson<Slide[]>(r.text));
    if (!Array.isArray(list) || !list.length || !list.every((s) => s && typeof s.title === "string" && Array.isArray(s.points) && typeof s.say === "string")) return flash("Birdie couldn't build the lesson. Try again.");
    setSlides(list.slice(0, 8)); setI(0); setPlaying(true);
  }

  // Narrate the current slide; when it finishes, move on.
  useEffect(() => {
    if (!slides || !playing || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(slides[i].say);
    u.rate = 1;
    u.onend = () => { if (speaking.current !== u) return; if (i < slides.length - 1) setI(i + 1); else setPlaying(false); };
    speaking.current = u;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    return () => { speaking.current = null; window.speechSynthesis.cancel(); };
  }, [slides, i, playing]);
  useEffect(() => () => { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);

  const s = slides?.[i];
  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-[var(--paper)]">
      <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-2">
        <div className="disp text-[17px] font-bold">Video lesson{course ? ` · ${course.code}` : ""}</div>
        <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--paper-dim)]"><X size={17} /></button>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6">
        {!slides ? (
          <div className="space-y-3">
            <p className="text-[13px] leading-snug text-[var(--dim)]">Birdie writes a short explainer {course ? `from your ${course.code} notes` : ""} and plays it with narration, like a video. Uses {brain.brand}{brain.free ? " (free)" : ""}.</p>
            <TextField value={topic} onChange={setTopic} placeholder={course ? `Topic (leave blank for ${course.code}'s key ideas)` : "What should the lesson explain?"} />
            <Btn variant="birdie" disabled={busy} onClick={() => void make()}>{busy ? "Birdie is writing your lesson..." : "Make my lesson"}</Btn>
          </div>
        ) : s && (
          <div className="space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#2A1640] to-[#120B1C] p-5 text-white">
              <AnimatePresence mode="wait">
                <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex h-full flex-col">
                  <div className="disp text-[19px] font-bold leading-tight text-[#E6B3F2]">{s.title}</div>
                  <ul className="mt-3 space-y-1.5">{s.points.map((p, k) => (<motion.li key={k} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + k * 0.6 }} className="text-[13.5px] leading-snug">• {p}</motion.li>))}</ul>
                </motion.div>
              </AnimatePresence>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">{slides.map((_, k) => <span key={k} className={`h-1 rounded-full ${k === i ? "w-5 bg-white" : "w-1.5 bg-white/40"}`} />)}</div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setI(Math.max(0, i - 1))} aria-label="Previous" className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--paper-dim)]"><ChevronLeft size={20} /></button>
              <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--birdie)] text-white">{playing ? <Pause size={22} /> : <Play size={22} />}</button>
              <button onClick={() => setI(Math.min(slides.length - 1, i + 1))} aria-label="Next" className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--paper-dim)]"><ChevronRight size={20} /></button>
            </div>
            <p className="rounded-2xl bg-[var(--paper-dim)] p-3 text-[13px] leading-relaxed">{s.say}</p>
            {course && <Btn variant="ghost" onClick={() => { addNote(course.id, `Lesson: ${slides[0].title}`, slides.map((x) => `${x.title}\n${x.points.map((p) => `- ${p}`).join("\n")}\n${x.say}`).join("\n\n")); flash(`Saved to ${course.code}`); }}><span className="inline-flex items-center gap-2"><Save size={15} /> Save the lesson to {course.code}</span></Btn>}
            <button onClick={() => { setSlides(null); setPlaying(false); }} className="w-full py-2 text-[13px] font-semibold text-[var(--dim)]">Make another</button>
          </div>
        )}
      </div>
    </div>
  );
}
