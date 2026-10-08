// Client side of the real AI: builds grounded prompts from the student's own material and calls /api/ai/chat.
import { words, type Doc } from "./engine";

export type AiOk = { ok: true; text: string; brain: string; model: string; charged_ngn: number; usage: { in: number; out: number } };
export type AiFail = { ok: false; code: "guest" | "insufficient_funds" | "free_allowance_used" | "not_configured" | "error"; message: string; need?: number };
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
    if (r.status === 501 || r.status === 403) return { ok: false, code: "not_configured", message: j.hint ?? "This brain isn't switched on yet." };
    return { ok: false, code: "error", message: j.message ?? j.error ?? "The AI didn't respond." };
  } catch (e) { return { ok: false, code: "error", message: (e as Error).message }; }
}

const LEN = { short: "Keep answers to two or three sentences.", normal: "Keep answers clear and concise, a short paragraph or a few bullet points.", detailed: "Give thorough, step by step answers with examples when they help." } as const;
const NO_MARKDOWN = "Write in plain conversational prose, like a text message. Never use markdown formatting: no #, no ** or * or _ for emphasis, no backticks, no dash or asterisk bullet lists, no markdown links. If you're listing things, just write them as separate sentences or separate lines.";

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

export function chatSystem(o: { name: string; level: string; program: string; course: string | null; material: string; length: keyof typeof LEN; library?: string }) {
  const who = `${o.name}${o.level || o.program ? `, a ${[o.level, o.program].filter(Boolean).join(" ")} student` : ""}`;
  const lib = o.library ? `\nTheir study library (folders and courses):\n${o.library}` : "";
  const teach = "If they ask you to teach them step by step, teach one small idea at a time, ask a short check question, and wait for their answer before moving on. Don't dump everything at once.";
  if (!o.course) return [
    `You are Birdie, a warm, encouraging and genuinely knowledgeable study partner for ${who}. This is a general chat, not tied to one course.`,
    "Answer study questions properly from your own knowledge: accurate, specific and useful. When a question clearly belongs to one of their courses, mention they can open that course above for answers from their own notes.",
    teach, LEN[o.length], NO_MARKDOWN, lib,
  ].join("\n");
  return [
    `You are Birdie, a friendly, knowledgeable study partner for ${who}, helping with the course "${o.course}".`,
    "Use the course material below first, because it's what their lecturer taught. When you use it, name where it came from in square brackets, for example [Note: Eigenvalues].",
    "If the material doesn't cover the question, still answer it properly from general knowledge, but start that part with 'Not from your notes:' so they know. Never present outside knowledge as if it came from their notes.",
    teach, LEN[o.length], NO_MARKDOWN, lib,
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
