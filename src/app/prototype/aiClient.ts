// Client side of the real AI: builds grounded prompts from the student's own material and calls /api/ai/chat.
import { words, type Doc } from "./engine";

export type AiOk = { ok: true; text: string; brain: string; model: string; charged_ngn: number; usage: { in: number; out: number } };
export type AiFail = { ok: false; code: "guest" | "insufficient_funds" | "free_allowance_used" | "not_configured" | "error"; message: string; need?: number };
export type AiResult = AiOk | AiFail;
export interface AiCall { brain: string; tier: string; system?: string; messages: { role: "user" | "assistant"; content: string }[]; feature?: string }

export async function askAI(body: AiCall): Promise<AiResult> {
  try {
    const r = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return { ok: true, text: j.text ?? "", brain: j.brain, model: j.model, charged_ngn: j.charged_ngn ?? 0, usage: j.usage ?? { in: 0, out: 0 } };
    if (r.status === 401) return { ok: false, code: "guest", message: "Sign in to use Birdie's AI." };
    if (r.status === 402) return { ok: false, code: "insufficient_funds", message: "Not enough balance for this brain.", need: j.need_at_least };
    if (r.status === 429) return { ok: false, code: "free_allowance_used", message: j.hint ?? "Today's free answers are used up." };
    if (r.status === 501) return { ok: false, code: "not_configured", message: "This brain isn't switched on yet." };
    return { ok: false, code: "error", message: j.message ?? j.error ?? "The AI didn't respond." };
  } catch (e) { return { ok: false, code: "error", message: (e as Error).message }; }
}

const LEN = { short: "Keep answers to two or three sentences.", normal: "Keep answers clear and concise, a short paragraph or a few bullet points.", detailed: "Give thorough, step by step answers with examples when they help." } as const;

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

export function chatSystem(o: { name: string; level: string; program: string; course: string | null; material: string; length: keyof typeof LEN }) {
  const who = `${o.name}${o.level || o.program ? `, a ${[o.level, o.program].filter(Boolean).join(" ")} student` : ""}`;
  if (!o.course) return `You are Birdie, a warm, encouraging study partner for ${who}. You are in a general chat that isn't tied to a course. Be kind and practical, and keep replies short. If they ask about their coursework, tell them to pick a course above so you can answer from their own notes.`;
  return [
    `You are Birdie, a friendly study partner for ${who}, helping with the course "${o.course}".`,
    "Answer using ONLY the course material below. Do not use outside knowledge to fill gaps.",
    "If the material does not cover the question, say so plainly in one sentence and suggest adding a note, or talking to a writer. Never invent facts.",
    "When you use the material, name where it came from in square brackets, for example [Note: Eigenvalues].",
    LEN[o.length],
    o.material ? `\n--- COURSE MATERIAL ---\n${o.material}` : "\n(The student has not added any material yet. Say so and suggest adding a note.)",
  ].join("\n");
}

/** Ask for strict JSON and parse it, tolerating code fences. Returns null if it can't be parsed. */
export function parseJson<T>(text: string): T | null {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = Math.min(...["[", "{"].map((c) => (t.indexOf(c) === -1 ? Infinity : t.indexOf(c))));
  const end = Math.max(t.lastIndexOf("]"), t.lastIndexOf("}"));
  if (!isFinite(start) || end < start) return null;
  try { return JSON.parse(t.slice(start, end + 1)) as T; } catch { return null; }
}

export const QUIZ_SYSTEM = (material: string, n: number) => `You write exam practice questions for a student. Use ONLY this course material:\n\n${material}\n\nWrite ${n} multiple choice questions that test understanding of the material (not trivia). Return ONLY a JSON array, no other text. Each item: {"q": string, "opts": [4 strings], "answer": index 0-3 of the correct option, "topic": short topic name taken from the material, "why": one sentence explaining the correct answer using the material}.`;

export const CARDS_SYSTEM = (material: string, n: number) => `Create ${n} study flashcards using ONLY this course material:\n\n${material}\n\nReturn ONLY a JSON array, no other text. Each item: {"q": a short question, "a": a concise answer taken from the material}.`;

export const GRADE_SYSTEM = (material: string) => `You mark a student's written answer. Base the marking ONLY on this course material:\n\n${material}\n\nReturn ONLY JSON: {"points":[{"label": string, "ok": boolean}], "feedback": string}. "points" lists 3 to 5 key ideas the answer should contain (from the material) and whether the student covered each. "feedback" is two or three encouraging sentences telling them what to improve.`;
