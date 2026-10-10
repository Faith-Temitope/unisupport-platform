// Client side of the real AI: builds grounded prompts from the student's own material and calls /api/ai/chat.
import { words, type Doc } from "./engine";

export type AiOk = { ok: true; text: string; brain: string; model: string; charged_ngn: number; usage: { in: number; out: number } };
export type AiFail = { ok: false; code: "guest" | "insufficient_funds" | "free_allowance_used" | "not_configured" | "plus" | "error"; message: string; need?: number };
export type AiResult = AiOk | AiFail;
export interface AiImage { mime: string; data: string }
export interface AiCall { brain: string; tier: string; system?: string; messages: { role: "user" | "assistant"; content: string }[]; feature?: string; /** Photos sent with the last message (base64, no data: prefix). */ images?: AiImage[] }

export async function askAI(body: AiCall): Promise<AiResult> {
  try {
    const r = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return { ok: true, text: j.text ?? "", brain: j.brain, model: j.model, charged_ngn: j.charged_ngn ?? 0, usage: j.usage ?? { in: 0, out: 0 } };
    if (r.status === 401) return { ok: false, code: "guest", message: "Sign in to use Birdie's AI." };
    if (r.status === 402) return { ok: false, code: "insufficient_funds", message: "Not enough balance for this brain.", need: j.need_at_least };
    if (r.status === 429) return { ok: false, code: "free_allowance_used", message: j.hint ?? "Today's free answers are used up." };
    if (j.error === "plus_required") return { ok: false, code: "plus", message: j.hint ?? "That's part of Birdie Plus." };
    if (r.status === 501 || r.status === 403) return { ok: false, code: "not_configured", message: j.hint ?? "This brain isn't switched on yet." };
    return { ok: false, code: "error", message: j.message ?? j.error ?? "The AI didn't respond." };
  } catch (e) { return { ok: false, code: "error", message: (e as Error).message }; }
}

const LEN = {
  short: "Keep answers short: a few sentences, unless they ask for more.",
  normal: "Answer as fully as the question needs, without padding. Short questions get short answers; explanations, working and worked examples get the space they need.",
  detailed: "Give thorough answers: explain the reasoning step by step, with worked examples and the common mistakes to avoid.",
} as const;
// The chat shows light formatting (bold, lists, headings, code), so Birdie can lay answers out like any good AI.
const FORMAT = "You can use light Markdown: **bold** for key terms, numbered or bulleted lists, short ### headings for long answers, and code blocks for code. No tables, no images, no links unless they ask. Write maths in plain text (x^2, sqrt(x), a/b).";
const VOICE = "This is a live voice conversation. Talk naturally, like a friendly classmate on a call: short spoken sentences, one idea at a time, no lists or symbols, and leave room for them to reply. Don't read out citations or brackets. Match their language: if they speak Pidgin, Yoruba, Igbo or Hausa, you can reply in kind.";
const BROAD = "You are a capable general assistant as well as a tutor: help with anything they ask (any subject, writing, coding, maths with full working, careers, student life, everyday questions), accurately and specifically, the way the best AI assistants do. Don't refuse or water things down because a question isn't about school. If you aren't sure of a fact, say so rather than inventing it. For assignments, help them understand and do the work themselves rather than handing over something to submit as their own.";

/** Strips markdown syntax an AI reply slipped in despite being told not to, so the chat bubble
 * (plain text, no markdown renderer) never shows raw #, *, _ or backtick characters to the student. */
export function stripMarkdown(text: string): string {
  let t = text;
  t = t.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
  t = t.replace(/^#{1,6}\s+/gm, "");
  t = t.replace(/\*\*\*(.+?)\*\*\*/g, "$1");
  t = t.replace(/\*\*(.+?)\*\*/g, "$1");
  t = t.replace(/__(.+?)__/g, "$1");
  t = t.replace(/~~(.+?)~~/g, "$1");
  t = t.replace(/(?<![*\w])\*(?!\*)([^*\n]+?)\*(?!\*)/g, "$1");
  t = t.replace(/(?<![_\w])_(?!_)([^_\n]+?)_(?!_)/g, "$1");
  t = t.replace(/`([^`]+)`/g, "$1");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // markdown links, but leaves bare [Citations] alone
  t = t.replace(/^\s*(?:[-*_]\s*){3,}\s*$/gm, "");
  t = t.replace(/^(\s*)[-*+]\s+/gm, "$1");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

/** Recursively strips markdown from every string value in a parsed AI JSON response (flashcards,
 * quiz questions, grading feedback), so fields never shown through stripMarkdown's main caller
 * still come out clean. */
export function sanitizeDeep<T>(v: T): T {
  if (typeof v === "string") return stripMarkdown(v) as unknown as T;
  if (Array.isArray(v)) return v.map(sanitizeDeep) as unknown as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = sanitizeDeep(val);
    return out as T;
  }
  return v;
}

/**
 * The course material Birdie reads for a question. If everything fits the budget (60k characters,
 * about 15k tokens, is roughly a 40-page handout plus notes), it gets ALL of it, whole and in order.
 * Bigger courses are cut into passages: the ones that match the question come first (rarer words
 * count more), each with the passage that follows it, then the rest spread evenly across every file
 * so nothing is ignored. `onlyRelevant` (general chat across all courses) sends nothing if nothing matches.
 */
export function contextFor(docs: Doc[], question: string, budget = 60000, opts: { onlyRelevant?: boolean } = {}): { text: string; used: Doc[] } {
  const bySrc = new Map<string, string[]>();
  for (const d of docs) bySrc.set(d.source, [...(bySrc.get(d.source) ?? []), d.text]);
  const sources = [...bySrc].map(([source, parts]) => ({ source, text: parts.join("\n\n") }));
  const asDoc = (s: { source: string; text: string }): Doc => ({ title: s.source, text: s.text, source: s.source });
  const total = sources.reduce((n, s) => n + s.text.length, 0);
  if (!opts.onlyRelevant && total <= budget) return { text: sources.map((s) => `[${s.source}]\n${s.text}`).join("\n\n"), used: sources.map(asDoc) };

  type Chunk = { si: number; i: number; text: string; score: number };
  const chunks: Chunk[] = [];
  sources.forEach((s, si) => {
    let buf = "", i = 0;
    for (const p of s.text.split(/\n{2,}/)) {
      if (buf && buf.length + p.length > 1800) { chunks.push({ si, i: i++, text: buf, score: 0 }); buf = ""; }
      buf += (buf ? "\n\n" : "") + p;
    }
    if (buf.trim()) chunks.push({ si, i: i++, text: buf, score: 0 });
  });
  const qw = Array.from(new Set(words(question)));
  if (qw.length) {
    const sets = chunks.map((c) => new Set(words(c.text)));
    const df = new Map(qw.map((w) => [w, sets.filter((st) => st.has(w)).length]));
    chunks.forEach((c, k) => {
      for (const w of qw) if (sets[k].has(w)) c.score += Math.log(1 + chunks.length / Math.max(1, df.get(w)!));
      const title = words(sources[c.si].source); for (const w of qw) if (title.includes(w)) c.score += 0.5;
    });
  }
  const relevant = chunks.some((c) => c.score > 0);
  if (opts.onlyRelevant && !relevant) return { text: "", used: [] };
  const key = (c: Chunk) => `${c.si}:${c.i}`;
  const at = new Map(chunks.map((c) => [key(c), c]));
  const order: Chunk[] = [];
  if (relevant) {
    const seen = new Set<string>();
    for (const c of [...chunks].sort((a, b) => b.score - a.score)) {
      if (opts.onlyRelevant && c.score <= 0) break;
      for (const n of [c, at.get(`${c.si}:${c.i + 1}`)]) if (n && !seen.has(key(n))) { seen.add(key(n)); order.push(n); }
    }
  } else {
    // nothing specific asked (summaries, quizzes): take turns across files so every file is covered
    const lists = sources.map((_, si) => chunks.filter((c) => c.si === si));
    for (let r = 0; order.length < chunks.length; r++) lists.forEach((l) => { if (l[r]) order.push(l[r]); });
  }
  const picked: Chunk[] = []; let n = 0;
  for (const c of order) { if (n + c.text.length > budget) continue; picked.push(c); n += c.text.length; if (n > budget - 400) break; }
  picked.sort((a, b) => a.si - b.si || a.i - b.i);
  const used = Array.from(new Set(picked.map((c) => c.si)));
  const text = used.map((si) => {
    const part = picked.filter((c) => c.si === si);
    const whole = part.length === chunks.filter((c) => c.si === si).length;
    return `[${sources[si].source}]${whole ? "" : " (excerpts)"}\n${part.map((c) => c.text).join("\n[...]\n")}`;
  }).join("\n\n");
  const skipped = sources.filter((_, si) => !used.includes(si)).map((s) => s.source);
  return { text: text + (skipped.length && !opts.onlyRelevant ? `\n\n(Also in this course, not shown here: ${skipped.join("; ")})` : ""), used: used.map((si) => asDoc(sources[si])) };
}

export function chatSystem(o: { name: string; level: string; program: string; course: string | null; material: string; length: keyof typeof LEN; library?: string; voice?: boolean }) {
  const style = o.voice ? VOICE : `${LEN[o.length]}\n${FORMAT}`;
  const who = `${o.name}${o.level || o.program ? `, a ${[o.level, o.program].filter(Boolean).join(" ")} student` : ""}`;
  const lib = o.library ? `\nTheir study library (folders and courses):\n${o.library}` : "";
  const teach = [
    "How to help them study: do the work of explaining. Break topics into clear parts, define every key term, explain the why and the how, give worked examples (with full working for calculations), and end longer explanations with a short recap of the key points. Where it helps, add a memory trick or the kind of exam question this usually becomes.",
    "Don't answer a question with a question, and don't stall with 'what would you like to know?'. If a request is vague, give your best full answer first, then offer what you could go into next.",
    "When they ask about a topic in their material, gather everything the material says about it (it may be spread across several files, notes and lecture recordings) and bring it together in a logical order, then fill any gaps from general knowledge, marked 'Not from your notes:'.",
    "Only when they explicitly ask to be taught step by step: give a short overview of the topics first, then teach the first one fully with examples, then end with one quick check question. When they reply, correct or confirm it and move on to the next topic.",
  ].join("\n");
  if (!o.course) return [
    `You are Birdie, a warm, encouraging and genuinely knowledgeable study partner for ${who}. This is a general chat, not tied to one course.`,
    BROAD,
    o.material ? "Below are passages from their own courses that match this question. Use them first (they're what their lecturers taught), name the source in square brackets, and mark anything else 'Not from your notes:'." : "When a question clearly belongs to one of their courses, you can mention that opening that course gives answers from their own notes.",
    teach, style, lib,
    o.material ? `\n--- FROM THEIR COURSES ---\n${o.material}` : "",
  ].join("\n");
  return [
    `You are Birdie, a friendly, knowledgeable study partner for ${who}, helping with the course "${o.course}".`,
    "Read all of the course material below (notes, files and lecture recordings) before answering, and use it first, because it's what their lecturer taught. When you use it, cite the file using its exact name as shown in square brackets above its text, for example [Note: Eigenvalues] or [Lecture 3.pdf]. Cite each file once, at the end of the sentence or paragraph that used it.",
    "If the material doesn't cover the question, still answer it properly from general knowledge, but start that part with 'Not from your notes:' so they know. Never present outside knowledge as if it came from their notes.",
    BROAD, teach, style, lib,
    o.material ? `\n--- COURSE MATERIAL ---\n${o.material}` : "\n(No material has been added to this course yet. Answer from general knowledge, starting with 'Not from your notes:', and suggest adding their notes so you can match their lecturer.)",
  ].join("\n");
}

/** A short outline of the student's folders and courses, so Birdie knows how their studies are organised. */
export function libraryOutline(folders: { id: string; name: string; parentId: string | null }[], courses: { code: string; name: string; folderId: string | null }[]): string {
  const path = (id: string | null): string => { const f = folders.find((x) => x.id === id); return f ? [path(f.parentId), f.name].filter(Boolean).join(" > ") : ""; };
  return courses.slice(0, 40).map((c) => `- ${c.code} ${c.name}${c.folderId ? ` (in ${path(c.folderId)})` : ""}`).join("\n");
}

/** Ask for strict JSON and parse it, tolerating code fences. Returns null if it can't be parsed. */
export function parseJson<T>(text: string): T | null {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = Math.min(...["[", "{"].map((c) => (t.indexOf(c) === -1 ? Infinity : t.indexOf(c))));
  const end = Math.max(t.lastIndexOf("]"), t.lastIndexOf("}"));
  if (!isFinite(start) || end < start) return null;
  try { return JSON.parse(t.slice(start, end + 1)) as T; } catch { return null; }
}

export const QUIZ_SYSTEM = (material: string, n: number) => `You write exam practice questions for a student. Use ONLY this course material:\n\n${material}\n\nWrite ${n} multiple choice questions that test understanding of the material (not trivia). Return ONLY a JSON array, no other text. Each item: {"q": string, "opts": [4 strings], "answer": index 0-3 of the correct option, "topic": short topic name taken from the material, "why": one sentence explaining the correct answer using the material}. Every text field must be plain prose with no markdown formatting (no #, *, _, backticks).`;

export const CARDS_SYSTEM = (material: string, n: number) => `Create ${n} study flashcards using ONLY this course material:\n\n${material}\n\nReturn ONLY a JSON array, no other text. Each item: {"q": a short question, "a": a concise answer taken from the material}. Every text field must be plain prose with no markdown formatting (no #, *, _, backticks).`;

export const GRADE_SYSTEM = (material: string) => `You mark a student's written answer. Base the marking ONLY on this course material:\n\n${material}\n\nReturn ONLY JSON: {"points":[{"label": string, "ok": boolean}], "feedback": string}. "points" lists 3 to 5 key ideas the answer should contain (from the material) and whether the student covered each. "feedback" is two or three encouraging sentences telling them what to improve. Every text field must be plain prose with no markdown formatting (no #, *, _, backticks).`;

// --- Gemini extras: reading scans, a natural voice, pictures and live voice chat ---

/** Reads a scanned PDF or a photo of notes already in the student's files. Empty text = nothing readable. */
export async function readScan(path: string): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  try {
    const r = await fetch("/api/ai/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, text: j.text ?? "" } : { ok: false, message: j.hint ?? j.error ?? "Couldn't read it" };
  } catch (e) { return { ok: false, message: (e as Error).message }; }
}

const voiceCache = new Map<string, string>();
/** Natural-voice audio for a piece of text, as a playable URL (cached for this session). */
export async function speechUrl(text: string): Promise<string | null> {
  const t = stripMarkdown(text).replace(/\[[^\]]{1,80}\]/g, "").replace(/Not from your notes:\s*/g, "").slice(0, 2500);
  const hit = voiceCache.get(t); if (hit) return hit;
  try {
    const r = await fetch("/api/ai/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t }) });
    if (!r.ok) return null;
    const url = URL.createObjectURL(await r.blob());
    voiceCache.set(t, url); return url;
  } catch { return null; }
}

/** Birdie draws a picture. Returns the saved file path. */
export async function makePicture(prompt: string): Promise<{ ok: true; path: string; caption: string } | { ok: false; code: string; message: string }> {
  try {
    const r = await fetch("/api/ai/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, path: j.path, caption: j.caption ?? "" } : { ok: false, code: j.error ?? "error", message: j.hint ?? "Birdie couldn't draw that just now." };
  } catch (e) { return { ok: false, code: "error", message: (e as Error).message }; }
}

/** A one-use token for a live voice chat. */
export async function liveToken(system: string): Promise<{ ok: true; token: string; model: string } | { ok: false; code: string; message: string }> {
  try {
    const r = await fetch("/api/ai/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return { ok: true, token: j.token, model: j.model };
    return { ok: false, code: j.error ?? "error", message: j.hint ?? (r.status === 401 ? "Sign in to talk to Birdie." : "Voice chat isn't available right now.") };
  } catch (e) { return { ok: false, code: "error", message: (e as Error).message }; }
}
