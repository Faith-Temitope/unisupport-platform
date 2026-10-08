"use client";

import { useViewState } from "./persist";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Menu, Mic, Paperclip, Send, SquarePen, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { answer, docsOf, flashcards, general, makeFree, makeQuiz, summarize, type FreeQ, type MCQ } from "./engine";
import { firstName, nowTime, uid, useApp, type BAction, type BMsg, type Course } from "./store";
import { Btn, DemoControls, Empty, Sheet } from "./ui";
import { brainName } from "./BrainPicker";
import { SponsoredCard, usePlacements } from "./Sponsored";
import { brainById } from "@/lib/ai/registry";
import { CARDS_SYSTEM, GRADE_SYSTEM, QUIZ_SYSTEM, askAI, chatSystem, contextFor, parseJson, sanitizeDeep, stripMarkdown, type AiFail } from "./aiClient";

type Mode = "chat" | "test" | "exam" | "practical";
const bird = (text: string, extra: Partial<BMsg> = {}): BMsg => ({ id: uid(), from: "bird", text, t: nowTime(), at: Date.now(), ...extra });
const me = (text: string): BMsg => ({ id: uid(), from: "me", text, t: nowTime(), at: Date.now() });

function greeting(c: Course | null, name: string): BMsg {
  if (!c) return bird(`Hi ${name}. This is a general chat, not tied to a course. Create a course in Study and I can learn from your slides and notes.`);
  const n = docsOf(c).length;
  const filesWithText = c.files.filter((f) => f.text).length;
  const recsWithText = c.recs.filter((r) => r.text).length;
  const transcribing = c.recs.some((r) => r.transcribing);
  const parts = [`${c.notes.length} note${c.notes.length === 1 ? "" : "s"}`];
  if (filesWithText) parts.push(`${filesWithText} file${filesWithText === 1 ? "" : "s"}`);
  if (recsWithText) parts.push(`${recsWithText} recording${recsWithText === 1 ? "" : "s"}`);
  if (n > 0) return bird(`I'm ready for ${c.code}. I can read ${parts.join(", ")}. Ask me anything and I'll answer only from what you've added.`);
  if (transcribing) return bird(`I'm ready for ${c.code}, but I'm still turning your recording into text. Give it a minute and ask again.`);
  return bird(`I'm ready for ${c.code}, but there's nothing to learn from yet. Add a note, upload a PDF, Word doc or text file, or record a lecture in Study and I'll answer only from it.`);
}

function respond(text: string, c: Course | null, length: "short" | "normal" | "detailed"): BMsg {
  const t = text.toLowerCase();
  if (!c) return bird(general(text));
  const docs = docsOf(c);
  if (/flash/.test(t)) { if (!docs.length) return bird(`There's nothing in ${c.code} to build flashcards from yet. Add a note, upload a file, or record a lecture first.`, { actions: [{ label: "Add material", run: "study" }] }); return bird(`Here are ${Math.min(6, docs.length)} flashcards from your ${c.code} material. Tap a card to flip it.`, { cards: flashcards(docs), actions: [{ label: "Save to course", run: "file", payload: `Flashcards - ${c.code}.txt` }] }); }
  if (/summar/.test(t)) { if (!docs.length) return bird(`I don't have anything to summarise in ${c.code} yet.`, { actions: [{ label: "Add material", run: "study" }] }); return bird(`Summary of ${c.code}\n${summarize(docs)}`, { cite: docs.slice(0, 3).map((d) => d.source).join(" · "), actions: [{ label: "Save as note", run: "note", payload: `Summary - ${c.code}` }] }); }
  if (/study guide|guide/.test(t)) { if (!docs.length) return bird(`Add some material to ${c.code} first and I'll assemble a guide.`, { actions: [{ label: "Add material", run: "study" }] }); return bird(`Study guide for ${c.code}\n${docs.map((d, i) => `${i + 1}. ${d.title}`).join("\n")}`, { actions: [{ label: "Save as note", run: "note", payload: `Study guide - ${c.code}` }] }); }
  if (/quiz|test me|mock/.test(t)) return bird("Switching to Test mode.", { actions: [{ label: "Start quiz", run: "test" }] });
  const a = answer(docs, text);
  if (a) { const sentences = a.text.match(/[^.]+\.?/g) ?? [a.text]; const body = length === "short" ? a.text.split("\n")[0].slice(0, 220) : length === "detailed" ? a.text : sentences.slice(0, 4).join(" "); return bird(body, { cite: a.cite }); }
  return bird(`I couldn't find that in your ${c.code} material, and I won't guess. Add the note, file or recording that covers it, or talk to a writer who can walk you through it.`, { actions: [{ label: "Add material", run: "study" }, { label: "Talk to a writer", run: "writer" }] });
}

export default function Birdie({ active }: { active: boolean }) {
  const { courses, profile, settings, chats, setChats, birdieIntent, clearBirdieIntent, applyQuiz, addNote, addFile, flash, setTab, goStudy, goHelp, phone, setOverlay, logChat, setBrainOpen, auth, setWalletOpen, setSetting, refreshWallet, loadRemoteCourseContent, sharedRemoteContent } = useApp();
  const [ctx, setCtx] = useViewState<string>("birdie.ctx", "general");
  const [typing, setTyping] = useState(false);
  const [mode, setMode] = useViewState<Mode>("birdie.mode", "chat");
  const [draft, setDraft] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [attach, setAttach] = useState(false);
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fileIn = useRef<HTMLInputElement>(null);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const name = firstName(profile);
  const course = ctx === "general" ? null : courses.find((c) => c.id === ctx) ?? null;
  useEffect(() => { if (ctx !== "general" && !courses.some((c) => c.id === ctx)) setCtx("general"); }, [courses, ctx]);

  // A joined (not owned) shared course keeps its own notes/files/recs empty locally -- the real
  // content lives with the owner and is fetched read-only (see Study.tsx's CourseView for the same
  // pattern). Birdie needs that same real content to actually be useful on a shared course instead
  // of saying "nothing added yet" about material that very much exists, just not locally.
  useEffect(() => {
    if (!course?.sourceCourseId) return;
    loadRemoteCourseContent(course.sourceCourseId);
    const i = setInterval(() => loadRemoteCourseContent(course.sourceCourseId!), 5000);
    return () => clearInterval(i);
  }, [course?.sourceCourseId, loadRemoteCourseContent]);
  const effectiveCourse = useMemo(() => (course?.sourceCourseId ? { ...course, notes: sharedRemoteContent?.notes ?? [], files: sharedRemoteContent?.files ?? [], recs: sharedRemoteContent?.recs ?? [] } : course), [course, sharedRemoteContent]);

  const thread = chats[ctx] ?? [greeting(effectiveCourse, name)];
  const docs = useMemo(() => (effectiveCourse ? docsOf(effectiveCourse) : []), [effectiveCourse]);

  const append = useCallback((key: string, m: BMsg, base?: BMsg[]) => setChats((cs) => ({ ...cs, [key]: [...(cs[key] ?? base ?? []), m] })), [setChats]);

  const live = auth.status === "in";
  const brain = brainById(settings.aiBrain);
  const [aiQuiz, setAiQuiz] = useState<{ key: string; qs: MCQ[] | null; loading: boolean } | null>(null);

  const failMsg = (r: AiFail): BMsg | null => {
    if (r.code === "insufficient_funds") return bird(`Your balance is too low for ${brain.brand}. Top up, switch to Spark (free), or get an Exam Pass for unlimited access.`, { actions: [{ label: "Top up", run: "topup" }, { label: "Use Spark (free)", run: "spark" }, { label: "Get Exam Pass", run: "topup" }] });
    if (r.code === "free_allowance_used") return bird("You've used today's free answers. Come back tomorrow, choose a paid brain, or get an Exam Pass for unlimited access.", { actions: [{ label: "Choose a brain", run: "brain" }, { label: "Get Exam Pass", run: "topup" }] });
    if (r.code === "not_configured") return bird(`${brain.brand} isn't available yet. Spark is free and ready now.`, { actions: [{ label: "Use Spark (free)", run: "spark" }, { label: "Choose a brain", run: "brain" }] });
    return null;
  };

  const send = useCallback(async (text: string, key = ctx, c: Course | null = effectiveCourse) => {
    if (!text.trim()) return;
    logChat();
    const base = [greeting(c, name)];
    const history = (chats[key] ?? []).slice(-8);
    setChats((cs) => ({ ...cs, [key]: [...(cs[key] ?? base), me(text.trim())] }));
    setTyping(true);
    const t = text.toLowerCase();
    const local = () => respond(text, c, settings.answerLength);
    const finish = (m: BMsg) => { setTyping(false); append(key, m, base); };
    const cdocs = c ? docsOf(c) : [];
    const quizAsk = /quiz|test me|mock/.test(t);

    // Guests, empty courses and quiz requests use the offline engine (no AI cost).
    if (!live || quizAsk || (c && cdocs.length === 0)) { timers.current.push(setTimeout(() => finish(local()), 600)); return; }

    const cards = /flash/.test(t), summary = /summar/.test(t), guide = /study guide|guide/.test(t);
    const info = c ? contextFor(cdocs, cards || summary || guide ? "" : text) : { text: "", used: [] };
    let system = chatSystem({ name, level: profile.level, program: profile.program, course: c ? `${c.code} ${c.name}` : null, material: info.text, length: settings.answerLength });
    let messages: { role: "user" | "assistant"; content: string }[];
    if (cards) { system = CARDS_SYSTEM(info.text, 6); messages = [{ role: "user", content: "Make the flashcards now." }]; }
    else if (summary) messages = [{ role: "user", content: "Summarise this course material as clear bullet points a student can revise from." }];
    else if (guide) messages = [{ role: "user", content: "Build a study guide: the main topics in a sensible order, with the key points to remember under each." }];
    else messages = [...history.filter((m) => !m.actions && !m.cards).map((m) => ({ role: (m.from === "me" ? "user" : "assistant") as "user" | "assistant", content: m.text })), { role: "user", content: text.trim() }];
    // the API needs the conversation to start with a user turn
    while (messages.length > 1 && messages[0].role !== "user") messages.shift();

    const res = await askAI({ brain: brain.id, tier: settings.aiTier, system, messages, feature: cards ? "flashcards" : summary || guide ? "summary" : "chat" });
    if (!res.ok) {
      const f = failMsg(res);
      if (f) return finish(f);
      const l = local(); return finish({ ...l, text: `(${brain.brand} couldn't answer just now, so I searched your notes instead.)\n\n${l.text}` });
    }
    if (res.charged_ngn > 0) void refreshWallet();
    const meta = `${brain.brand} · ${res.charged_ngn > 0 ? "₦" + res.charged_ngn : "free"}`;
    const cite = c && info.used.length && /\[/.test(res.text) ? info.used.map((d) => d.source).join(" · ") : undefined;
    if (cards) {
      const list = sanitizeDeep(parseJson<{ q: string; a: string }[]>(res.text));
      if (Array.isArray(list) && list.length && list.every((x) => x && typeof x.q === "string" && typeof x.a === "string")) return finish(bird(`Here are ${Math.min(list.length, 8)} flashcards from your ${c!.code} material. Tap a card to flip it.`, { cards: list.slice(0, 8), meta, actions: [{ label: "Save to course", run: "file", payload: `Flashcards - ${c!.code}.txt` }] }));
    }
    finish(bird(stripMarkdown(res.text), { meta, cite, actions: (summary || guide) && c ? [{ label: "Save as note", run: "note", payload: `${guide ? "Study guide" : "Summary"} - ${c.code}` }] : undefined }));
  }, [ctx, effectiveCourse, name, chats, setChats, append, settings.answerLength, settings.aiTier, logChat, live, brain, profile.level, profile.program, refreshWallet]); // eslint-disable-line react-hooks/exhaustive-deps

  // Test mode: for signed-in students the AI writes the questions from their material.
  useEffect(() => {
    if (mode !== "test") { setAiQuiz(null); return; }
    if (!course || !live || docs.length === 0) return;
    const key = course.id + docs.map((d) => d.title).join("|");
    if (aiQuiz?.key === key) return;
    setAiQuiz({ key, qs: null, loading: true });
    const info = contextFor(docs, "");
    askAI({ brain: brain.id, tier: settings.aiTier, system: QUIZ_SYSTEM(info.text, 5), messages: [{ role: "user", content: "Write the questions now." }], feature: "quiz" }).then((res) => {
      if (res.ok) {
        if (res.charged_ngn > 0) void refreshWallet();
        const arr = sanitizeDeep(parseJson<MCQ[]>(res.text));
        const ok = Array.isArray(arr) ? arr.filter((q) => q && typeof q.q === "string" && Array.isArray(q.opts) && q.opts.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4 && typeof q.topic === "string" && typeof q.why === "string").slice(0, 5) : [];
        setAiQuiz({ key, qs: ok.length >= 3 ? ok : null, loading: false });
      } else setAiQuiz({ key, qs: null, loading: false });
    });
  }, [mode, course, live, docs]); // eslint-disable-line react-hooks/exhaustive-deps

  const gradeAI = live ? async (prompt: string, answerText: string, model: string) => {
    const res = await askAI({ brain: brain.id, tier: settings.aiTier, system: GRADE_SYSTEM(model), messages: [{ role: "user", content: `Question: ${prompt}\n\nStudent answer: ${answerText}` }], feature: "grade" });
    if (!res.ok) return null;
    if (res.charged_ngn > 0) void refreshWallet();
    const j = sanitizeDeep(parseJson<{ points: { label: string; ok: boolean }[]; feedback: string }>(res.text));
    return j && Array.isArray(j.points) && j.points.length ? j : null;
  } : undefined;

  useEffect(() => {
    if (!birdieIntent) return;
    setCtx(birdieIntent.courseId); setMode(birdieIntent.mode ?? "chat");
    if (birdieIntent.prompt) { const c = courses.find((x) => x.id === birdieIntent.courseId) ?? null; timers.current.push(setTimeout(() => send(birdieIntent.prompt!, birdieIntent.courseId, c), 300)); }
    clearBirdieIntent();
  }, [birdieIntent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread.length, typing, ctx, mode]);

  function runAction(m: BMsg, a: BAction) {
    setChats((cs) => ({ ...cs, [ctx]: (cs[ctx] ?? []).map((x) => (x.id === m.id ? { ...x, done: true } : x)) }));
    if (a.run === "topup") { setWalletOpen(true); return; }
    if (a.run === "spark") { setSetting("aiBrain", "spark"); flash("Switched to Spark (free)"); return; }
    if (a.run === "brain") { setBrainOpen(true); return; }
    if (a.run === "writer") { goHelp({ mode: "mentor", courseId: course?.id ?? null }); return; }
    if (a.run === "study" && course) { goStudy({ courseId: course.id, tab: "notes" }); return; }
    if (!course) return;
    if (a.run === "note") { addNote(course.id, a.payload ?? "Summary", m.text); flash("Saved to Notes"); }
    if (a.run === "file") { addFile(course.id, { name: a.payload ?? "Study material.txt", kind: "text", size: m.text.length, text: (m.cards ?? []).map((c) => `${c.q}\n${c.a}`).join("\n\n") || m.text }); flash("Saved to Materials"); }
    if (a.run === "test") setMode("test");
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { flash("Read aloud isn't supported in this browser"); return; }
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  function pickMode(m: Mode) {
    if (m !== "chat" && !course) { flash("Pick a course first"); return; }
    setMode(m);
  }

  function dictate() {
    type SR = { start: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; lang: string };
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) { flash("Voice input isn't supported in this browser"); return; }
    const r = new Ctor(); r.lang = "en-NG";
    r.onresult = (e) => setDraft(e.results[0][0].transcript);
    r.onend = () => setListening(false); r.onerror = () => { setListening(false); flash("Couldn't hear you. Check the microphone"); };
    setListening(true); r.start();
  }

  const chips = course ? ["Summarize my notes", "Make flashcards", "Study guide", "Quiz me"] : ["I'm feeling stressed", "Help me plan my week"];
  const birdieCards = usePlacements("card", "birdie", active);
  const chatting = mode === "chat";
  const sponsor = birdieCards.length ? birdieCards[(ctx.length + thread.length) % birdieCards.length] : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-2">
        <button onClick={() => setDrawer(true)} aria-label="Chats" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--paper-dim)] active:scale-90"><Menu size={17} /></button>
        <button onClick={() => setBrainOpen(true)} aria-label="Choose Birdie's brain" className="flex flex-col items-center active:scale-95"><span className="flex items-center gap-2"><span className="disp flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#C05BD6] to-[#8A2FA3] text-[13px] font-bold text-white">B</span><span className="disp text-[19px] font-bold text-[var(--text)]">Birdie</span></span><span className="mt-0.5 rounded-full bg-[var(--birdie-soft)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--birdie-text)]">{live ? brainName(settings.aiBrain, settings.aiTier) : "Offline preview"} ▾</span></button>
        <button onClick={() => { setChats((cs) => { const n = { ...cs }; delete n[ctx]; return n; }); setMode("chat"); }} aria-label="New chat" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--paper-dim)] active:scale-90"><SquarePen size={16} /></button>
      </div>

      <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-5 pb-3">
        {[...courses.map((c) => ({ id: c.id, label: c.code })), { id: "general", label: "General" }].map((c) => (
          <button key={c.id} onClick={() => { setCtx(c.id); setMode("chat"); }} className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold transition active:scale-95 ${ctx === c.id ? "bg-[var(--birdie)] text-white" : "bg-[var(--birdie-soft)] text-[var(--birdie-text)]"}`}>{c.label}</button>
        ))}
      </div>

      <div className="relative min-h-0 flex-1">
        {chatting ? (
          <div className="no-scrollbar absolute inset-0 space-y-3 overflow-y-auto px-5 pb-3">
            {courses.length === 0 && <div className="rounded-2xl bg-[var(--birdie-soft)] p-3.5 text-[13px] leading-snug text-[var(--birdie-text)]">Birdie learns from your courses. <button onClick={() => setTab("study")} className="font-bold underline">Create one in Study</button> to get answers from your own material.</div>}
            {thread.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] ${m.from === "me" ? "" : "w-full"}`}>
                  <div className={`whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug ${m.from === "me" ? "ml-auto w-fit rounded-br-md bg-[var(--ink)] text-[var(--paper)]" : "w-fit max-w-full rounded-bl-md border border-[var(--line)] bg-white text-[var(--text)]"}`}>{m.text}</div>
                  {m.cite && <div className="mt-1 pl-1 text-[11px] font-semibold text-[var(--study)]">From: {m.cite}</div>}
                  {m.meta && <div className="mt-0.5 pl-1 text-[10.5px] text-[var(--dim)]">{m.meta}</div>}
                  {m.cards && <Flashcards cards={m.cards} />}
                  {m.from === "bird" && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-1">
                      {settings.readAloud && <button onClick={() => speak(m.text)} aria-label="Read aloud" className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--dim)] active:bg-[var(--paper-dim)]"><Volume2 size={14} /></button>}
                      {m.actions?.map((a) => (<button key={a.label} disabled={m.done && a.run !== "study" && a.run !== "writer" && a.run !== "topup" && a.run !== "brain"} onClick={() => runAction(m, a)} className="rounded-lg bg-[var(--ink)] px-3 py-1.5 text-[12px] font-semibold text-white transition active:scale-95 disabled:opacity-40">{m.done && a.run !== "study" && a.run !== "writer" && a.run !== "topup" && a.run !== "brain" ? "Done" : a.label}</button>))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {sponsor && thread.length <= 1 && !typing && <SponsoredCard p={sponsor} />}
            {typing && (<div className="flex"><div className="flex gap-1 rounded-2xl rounded-bl-md border border-[var(--line)] bg-white px-4 py-3">{[0, 1, 2].map((i) => (<motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-[#a99fb8]" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />))}</div></div>)}
            <div ref={endRef} />
          </div>
        ) : mode === "test" && course && aiQuiz?.loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="h-9 w-9 rounded-full border-4 border-[var(--birdie-soft)] border-t-[var(--birdie)]" /><div className="text-[14px] font-semibold text-[var(--text)]">{brain.brand} is writing your questions…</div><div className="text-[12px] text-[var(--dim)]">From your own notes, so they match what you were taught.</div></div>
        ) : mode === "test" && course ? (
          <Quiz key={course.id + docs.length + (aiQuiz?.qs?.length ?? 0)} preset={aiQuiz?.qs ?? undefined} course={course} docs={docs} onDone={(per) => applyQuiz(course.id, per)} onExit={() => setMode("chat")} onExplain={(txt) => { setMode("chat"); append(ctx, bird(txt), [greeting(course, name)]); }} onAdd={() => goStudy({ courseId: course.id, tab: "notes" })} />
        ) : course ? (
          <FreeResponse key={course.id + mode + docs.length} q={makeFreeMemo(docs, mode === "exam" ? "theory" : "practical")} onGrade={gradeAI} onExit={() => setMode("chat")} onAdd={() => goStudy({ courseId: course.id, tab: "notes" })} />
        ) : null}
      </div>

      {chatting && (<div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-5 pb-2 pt-1">{chips.map((c) => (<button key={c} onClick={() => send(c)} className="shrink-0 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text)] active:scale-95">{c}</button>))}</div>)}

      <div className="flex shrink-0 gap-1.5 border-t border-[var(--line)] px-5 py-2.5">
        {(["chat", "test", "exam", "practical"] as Mode[]).map((m) => (<button key={m} onClick={() => pickMode(m)} className={`flex-1 rounded-xl py-2 text-[12.5px] font-bold capitalize transition active:scale-95 ${mode === m ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{m}</button>))}
      </div>
      <div className="flex shrink-0 items-center gap-2 px-5 pb-3">
        <input ref={fileIn} type="file" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f || !course) return; const text = /\.(txt|md)$/i.test(f.name) ? await f.text() : undefined; addFile(course.id, { name: f.name, kind: text ? "text" : "pdf", size: f.size, text, url: URL.createObjectURL(f) }); setAttach(false); flash(`Saved to ${course.code}`); append(ctx, bird(text ? `Added ${f.name} to ${course.code}. I can read it now.` : `Added ${f.name} to ${course.code}. I'll be able to read it once the AI is connected.`)); }} />
        <button onClick={() => (course ? fileIn.current?.click() : flash("Pick a course to attach files to"))} aria-label="Attach" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--paper-dim)] text-[var(--dim)] active:scale-90"><Paperclip size={17} /></button>
        <input value={draft} disabled={!chatting} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { send(draft); setDraft(""); } }} placeholder={!chatting ? `${mode} mode` : listening ? "Listening..." : course ? `Ask about ${course.code}...` : "Talk to Birdie..."} className="min-w-0 flex-1 rounded-full bg-[var(--paper-dim)] px-4 py-3 text-[14px] outline-none placeholder:text-[#a99fb8] disabled:opacity-50" />
        <button onClick={dictate} aria-label="Dictate" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:scale-90 ${listening ? "bg-[var(--help)] text-white" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}><Mic size={17} /></button>
        <button onClick={() => { send(draft); setDraft(""); }} disabled={!draft.trim() || !chatting} aria-label="Send" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--birdie)] text-white transition active:scale-90 disabled:opacity-40"><Send size={17} /></button>
      </div>

      {phone && createPortal(
        <AnimatePresence>
          {drawer && (
            <motion.div className="absolute inset-0 z-[65] bg-[#12121A]/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)}>
              <motion.div className="flex h-full w-[82%] flex-col bg-[var(--ink)] p-4 pt-14 text-[var(--paper)]" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 32, stiffness: 320 }} onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between"><div className="disp text-[16px] font-bold">Your chats</div><button onClick={() => setDrawer(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10"><X size={15} /></button></div>
                <div className="no-scrollbar flex-1 space-y-1 overflow-y-auto">
                  {[...courses.map((c) => ({ id: c.id, title: `${c.code} · ${c.name}` })), { id: "general", title: "General chat" }].map((c) => { const last = (chats[c.id] ?? []).slice(-1)[0]; return (<button key={c.id} onClick={() => { setCtx(c.id); setMode("chat"); setDrawer(false); }} className={`w-full rounded-xl px-3 py-2.5 text-left ${ctx === c.id ? "bg-white/10" : ""}`}><div className="text-[13.5px] font-semibold">{c.title}</div><div className="truncate text-[11.5px] text-white/45">{last ? last.text : "No messages yet"}</div></button>); })}
                </div>
                <button onClick={() => { setDrawer(false); setOverlay({ t: "settings" }); }} className="mt-3 flex items-center gap-3 border-t border-white/10 pt-3 text-left"><span className="disp flex h-9 w-9 items-center justify-center rounded-full bg-[var(--birdie)] text-[15px] font-bold text-white">{(name[0] ?? "B").toUpperCase()}</span><span><div className="text-[13.5px] font-bold">{profile.name || "Your account"}</div><div className="text-[11.5px] text-white/50">Settings and account</div></span></button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>, phone)}

      <Sheet open={attach} onClose={() => setAttach(false)} title="Add to Birdie"><Btn variant="ink" onClick={() => fileIn.current?.click()}>Choose a file</Btn></Sheet>

      <DemoControls active={active} title="Birdie: how it works right now">
        <p className="text-[12.5px] leading-snug text-[var(--dim)]">Claude isn't connected, so Birdie runs on a local engine that works <b className="text-[var(--text)]">only from your notes and .txt files</b>. It searches them, builds fill-the-gap quizzes and flashcards, and marks free answers by key terms. Nothing is made up.</p>
        <ul className="list-disc space-y-1 pl-4 text-[12.5px] leading-snug text-[var(--text)]"><li>Add 3+ notes in Study, then pick Test</li><li>Ask a question using words from a note</li><li>Ask something not in your notes to see it refuse to guess</li></ul>
      </DemoControls>
    </div>
  );
}

// Keep the same free-response question for a given docs snapshot + kind while the tab is open.
const freeCache = new Map<string, FreeQ | null>();
function makeFreeMemo(docs: ReturnType<typeof docsOf>, kind: "theory" | "practical") {
  const key = kind + docs.map((d) => d.title).join("|");
  if (!freeCache.has(key)) freeCache.set(key, makeFree(docs, kind));
  return freeCache.get(key)!;
}

function Flashcards({ cards }: { cards: { q: string; a: string }[] }) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  return (
    <div className="no-scrollbar mt-2 flex gap-2.5 overflow-x-auto pb-1">
      {cards.map((c, i) => (
        <button key={i} onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))} className="h-[150px] w-[210px] shrink-0 [perspective:800px]" aria-label="Flip card">
          <motion.div className="relative h-full w-full [transform-style:preserve-3d]" animate={{ rotateY: flipped[i] ? 180 : 0 }} transition={{ duration: 0.4 }}>
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[var(--ink)] p-4 text-center text-[13.5px] font-semibold leading-snug text-[var(--paper)] [backface-visibility:hidden]">{c.q}</div>
            <div className="absolute inset-0 overflow-y-auto rounded-2xl bg-[var(--birdie-soft)] p-3.5 text-left text-[12px] leading-snug text-[var(--birdie-text)] [backface-visibility:hidden] [transform:rotateY(180deg)]">{c.a}</div>
          </motion.div>
        </button>
      ))}
    </div>
  );
}

function Quiz({ course, docs, preset, onDone, onExit, onExplain, onAdd }: { course: Course; docs: ReturnType<typeof docsOf>; preset?: MCQ[]; onDone: (per: Record<string, { right: number; total: number }>) => void; onExit: () => void; onExplain: (t: string) => void; onAdd: () => void }) {
  const qs: MCQ[] = useMemo(() => preset ?? makeQuiz(docs, 5), [docs, preset]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  if (qs.length === 0) return (
    <div className="absolute inset-0 overflow-y-auto px-5"><Empty title="Not enough to quiz you on" text={`I build questions from your ${course.code} notes and text files. Add a few full-sentence notes (at least 3 or 4) and try again.`} action={<Btn variant="birdie" onClick={onAdd}>Add notes</Btn>} /></div>
  );

  function next() {
    if (picked === null) return;
    const a = [...answers, picked]; setAnswers(a); setPicked(null);
    if (i + 1 >= qs.length) {
      const per: Record<string, { right: number; total: number }> = {};
      qs.forEach((q, k) => { const p = (per[q.topic] ??= { right: 0, total: 0 }); p.total++; if (a[k] === q.answer) p.right++; });
      onDone(per); setFinished(true);
    } else setI(i + 1);
  }

  if (finished) {
    const score = answers.filter((a, k) => a === qs[k].answer).length;
    const missed = qs.filter((q, k) => answers[k] !== q.answer);
    return (
      <div className="no-scrollbar absolute inset-0 space-y-3 overflow-y-auto px-5 pb-4">
        <div className="rounded-[22px] bg-[var(--ink)] p-5 text-center text-[var(--paper)]"><div className="disp text-[44px] font-bold leading-none">{score}/{qs.length}</div><div className="mt-1 text-[13px] text-white/60">Progress updated in Study.</div></div>
        {qs.map((q, k) => { const ok = answers[k] === q.answer; return (<div key={k} className="rounded-2xl border border-[var(--line)] bg-white p-3.5"><div className="flex items-start gap-2"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${ok ? "bg-[#2FA36B]" : "bg-[var(--help)]"}`}>{ok ? <Check size={12} strokeWidth={3.5} /> : <X size={12} strokeWidth={3.5} />}</span><div className="text-[13.5px] font-semibold leading-snug">{q.q}</div></div>{!ok && <div className="mt-1.5 pl-7 text-[12.5px] text-[var(--dim)]">You said: {q.opts[answers[k]]}. Correct: <b className="text-[var(--text)]">{q.opts[q.answer]}</b></div>}<div className="mt-1 pl-7 text-[12px] italic text-[var(--dim)]">{q.why}</div></div>); })}
        <div className="space-y-2 pt-1">{missed.length > 0 && <Btn variant="birdie" onClick={() => onExplain(`Let's go back over what you missed:\n${missed.map((q) => `• ${q.why}`).join("\n")}`)}>Go over what I missed</Btn>}<Btn variant="ghost" onClick={onExit}>Back to chat</Btn></div>
      </div>
    );
  }

  const q = qs[i];
  return (
    <div className="no-scrollbar absolute inset-0 overflow-y-auto px-5 pb-4">
      <div className="mb-3 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--paper-dim)]"><div className="h-full rounded-full bg-[var(--birdie)] transition-all" style={{ width: `${(i / qs.length) * 100}%` }} /></div><span className="text-[12px] font-bold text-[var(--dim)]">{i + 1} / {qs.length}</span></div>
      <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
        <div className="mb-1 truncate text-[11px] font-bold uppercase tracking-wider text-[var(--birdie)]">{q.topic}</div>
        <div className="mb-4 text-[15px] font-semibold leading-snug">{q.q}</div>
        <div className="space-y-2.5">{q.opts.map((o, k) => (<button key={o + k} onClick={() => setPicked(k)} className={`w-full rounded-xl border-2 px-3.5 py-3 text-left text-[14px] transition active:scale-[0.98] ${picked === k ? "border-[var(--birdie)] bg-[var(--birdie-soft)] font-semibold" : "border-[var(--line)]"}`}>{o}</button>))}</div>
      </div>
      <div className="mt-3"><Btn variant="ink" disabled={picked === null} onClick={next}>{i + 1 === qs.length ? "Finish" : "Next question"}</Btn></div>
    </div>
  );
}

function FreeResponse({ q, onGrade, onExit, onAdd }: { q: FreeQ | null; onGrade?: (prompt: string, answer: string, model: string) => Promise<{ points: { label: string; ok: boolean }[]; feedback: string } | null>; onExit: () => void; onAdd: () => void }) {
  const [text, setText] = useState("");
  const [graded, setGraded] = useState<null | { label: string; ok: boolean }[]>(null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  if (!q) return <div className="absolute inset-0 overflow-y-auto px-5"><Empty title="Nothing to ask you yet" text="I make these from your notes. Add a note with a few full sentences and try again." action={<Btn variant="birdie" onClick={onAdd}>Add notes</Btn>} /></div>;
  const passed = graded?.filter((g) => g.ok).length ?? 0;
  async function submit() {
    setBusy(true);
    const ai = onGrade ? await onGrade(q!.prompt, text, q!.model) : null;
    if (ai) { setGraded(ai.points); setFeedback(ai.feedback); }
    else setGraded(q!.rubric.map((r) => ({ label: r.label, ok: r.test.test(text) })));
    setBusy(false);
  }
  return (
    <div className="no-scrollbar absolute inset-0 overflow-y-auto px-5 pb-4">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-4"><div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--birdie)]">{q.kind === "theory" ? "Exam question" : "Practical"}</div><div className="text-[15px] font-semibold leading-snug">{q.prompt}</div></div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={!!graded || busy} rows={6} placeholder="Write your answer..." className="mt-3 w-full resize-none rounded-2xl border-2 border-[var(--line)] bg-white p-3.5 text-[14px] outline-none focus:border-[var(--birdie)] disabled:opacity-70" />
      {!graded ? (<div className="mt-3"><Btn variant="ink" disabled={text.trim().length < 6 || busy} onClick={submit}>{busy ? "Marking…" : "Submit for marking"}</Btn></div>) : (
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl bg-[var(--ink)] p-4 text-[var(--paper)]"><span className="disp text-[28px] font-bold">{passed}/{graded.length}</span> <span className="text-[13px] text-white/60">key ideas from your notes covered</span></div>
          {graded.map((g) => (<div key={g.label} className="flex items-start gap-2 rounded-xl bg-white p-3 text-[13px] ring-1 ring-[var(--line)]"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${g.ok ? "bg-[#2FA36B]" : "bg-[var(--help)]"}`}>{g.ok ? <Check size={12} strokeWidth={3.5} /> : <X size={12} strokeWidth={3.5} />}</span>{g.label}</div>))}
          {feedback && <div className="rounded-xl bg-[var(--birdie-soft)] p-3 text-[13px] leading-snug text-[var(--birdie-text)]"><b>Feedback:</b> {feedback}</div>}
          <div className="rounded-xl bg-[var(--paper-dim)] p-3 text-[12.5px] leading-snug text-[var(--dim)]"><b>From your notes:</b> <span className="whitespace-pre-line">{q.model}</span></div>
          <div className="grid grid-cols-2 gap-2"><Btn variant="ghost" onClick={() => { setGraded(null); setText(""); setFeedback(""); }}>Try again</Btn><Btn variant="ink" onClick={onExit}>Back to chat</Btn></div>
        </div>
      )}
    </div>
  );
}
