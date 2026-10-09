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

/** Pick the most relevant material for a question, within a size budget (roughly 3k tokens). */
export function contextFor(docs: Doc[], question: string, budget = 12000): { text: string; used: Doc[] } {
  const qt = new Set(words(question));
  const scored = docs.map((d) => {
    const dt = new Set(words(d.title + " " + d.text)); let s = 0; qt.forEach((w) => { if (dt.has(w)) s += 1; });
    return { d, s };
  });
  // relevant first; if nothing matches (e.g. "summarise"), fall back to document order
  const ordered = scored.some((x) => x.s > 0) ? [...scored].sort((a, b) => b.s - a.s) : scored;
  const used: Doc[] = []; let n = 0;
  for (const { d } of ordered) { const chunk = d.text.slice(0, 3500); if (n + chunk.length > budget) break; used.push({ ...d, text: chunk }); n += chunk.length; }
  return { text: used.map((d) => `[${d.source}]\n${d.text}`).join("\n\n"), used };
}

export function chatSystem(o: { name: string; level: string; program: string; course: string | null; material: string; length: keyof typeof LEN; library?: string; voice?: boolean }) {
  const style = o.voice ? VOICE : `${LEN[o.length]}\n${FORMAT}`;
  const who = `${o.name}${o.level || o.program ? `, a ${[o.level, o.program].filter(Boolean).join(" ")} student` : ""}`;
  const lib = o.library ? `\nTheir study library (folders and courses):\n${o.library}` : "";
  const teach = "If they ask you to teach them step by step, teach one small idea at a time, ask a short check question, and wait for their answer before moving on. Don't dump everything at once.";
  if (!o.course) return [
    `You are Birdie, a warm, encouraging and genuinely knowledgeable study partner for ${who}. This is a general chat, not tied to one course.`,
    BROAD,
    "When a question clearly belongs to one of their courses, you can mention that opening that course gives answers from their own notes.",
    teach, style, lib,
  ].join("\n");
  return [
    `You are Birdie, a friendly, knowledgeable study partner for ${who}, helping with the course "${o.course}".`,
    "Use the course material below first, because it's what their lecturer taught. When you use it, name where it came from in square brackets, for example [Note: Eigenvalues].",
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
