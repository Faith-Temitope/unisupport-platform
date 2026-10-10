// Local stand-in for the Claude API. Everything here works ONLY from what the student has added
// (notes and text files), so there is no invented content. When the API is connected, these
// functions are replaced by model calls with the same shapes.
import type { Course } from "./store";

export interface Doc { title: string; text: string; source: string }
export interface MCQ { q: string; opts: string[]; answer: number; topic: string; why: string }
export interface Rubric { label: string; test: RegExp }
export interface FreeQ { kind: "theory" | "practical"; prompt: string; rubric: Rubric[]; model: string; topic: string }
export interface Recommendation { id: string; at: number; courseId: string; title: string; body: string; action: { label: string; go: "test" | "study"; courseId: string } }

const STOP = new Set(("the a an and or of to in on for with is are was were be been it its this that these those as at by from into than then so if but not no yes do does did can could should would will just about your you our we they he she them his her their which what when where how why who whom also more most less very much many any some each other such over under between out up down off again there here have has had having being while during before after above below only own same too").split(" "));

export const words = (t: string) => (t.toLowerCase().match(/[a-z0-9']{3,}/g) ?? []).filter((w) => !STOP.has(w));
const sentences = (t: string) => (t.match(/[^.!?\n]+[.!?]*/g) ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
const shuffle = <T,>(a: T[]) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function docsOf(c: Course): Doc[] {
  const d: Doc[] = c.notes.map((n) => ({ title: n.title, text: n.body, source: `Note: ${n.title}` }));
  for (const f of c.files) {
    if (!f.text) continue;
    f.text.split(/\n{2,}/).map((s) => s.trim()).filter((s) => s.length > 30).forEach((p, i) => d.push({ title: `${f.name} #${i + 1}`, text: p, source: f.name }));
  }
  for (const r of c.recs) {
    if (!r.text) continue;
    r.text.split(/\n{2,}/).map((s) => s.trim()).filter((s) => s.length > 30).forEach((p, i) => d.push({ title: `${r.name} #${i + 1}`, text: p, source: r.name }));
  }
  return d;
}

export function search(docs: Doc[], q: string) {
  const qt = new Set(words(q));
  if (qt.size === 0) return [];
  return docs
    .map((d) => {
      const dt = new Set(words(d.title + " " + d.text));
      let score = 0;
      qt.forEach((w) => { if (dt.has(w)) score += 1; if (words(d.title).includes(w)) score += 1; });
      return { d, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}

export function answer(docs: Doc[], q: string): { text: string; cite: string } | null {
  const hits = search(docs, q);
  if (!hits.length) return null;
  const qt = new Set(words(q));
  const pick = (d: Doc) => {
    const ss = sentences(d.text);
    const ranked = ss.map((s, i) => ({ s, i, sc: words(s).filter((w) => qt.has(w)).length })).sort((a, b) => b.sc - a.sc).slice(0, 2).sort((a, b) => a.i - b.i);
    return ranked.map((r) => r.s).join(" ");
  };
  const text = hits.map((h) => (hits.length > 1 ? `${h.d.title}: ` : "") + pick(h.d)).join("\n\n");
  return { text, cite: hits.map((h) => h.d.source).join(" · ") };
}

export function summarize(docs: Doc[]) {
  return docs.slice(0, 8).map((d) => `• ${d.title}: ${sentences(d.text)[0] ?? d.text}`).join("\n");
}

export function flashcards(docs: Doc[], n = 6) {
  return docs.slice(0, n).map((d) => ({ q: `What do your notes say about "${d.title}"?`, a: d.text }));
}

export function makeQuiz(docs: Doc[], n = 5): MCQ[] {
  const cands: { d: Doc; s: string; kw: string }[] = [];
  for (const d of docs) for (const s of sentences(d.text)) {
    if (s.split(/\s+/).length < 6) continue;
    const ws = (s.match(/[A-Za-z][A-Za-z'-]{4,}/g) ?? []).filter((w) => !STOP.has(w.toLowerCase()));
    if (!ws.length) continue;
    cands.push({ d, s, kw: ws.sort((a, b) => b.length - a.length)[0] });
  }
  const pool = Array.from(new Set(cands.map((c) => c.kw.toLowerCase())));
  if (pool.length < 4) return [];
  return shuffle(cands).slice(0, n).map((c) => {
    const right = c.kw.toLowerCase();
    const opts = shuffle([right, ...shuffle(pool.filter((p) => p !== right)).slice(0, 3)]);
    return {
      q: "Fill the gap: " + c.s.replace(new RegExp(esc(c.kw), "i"), "_____"),
      opts, answer: opts.indexOf(right), topic: c.d.title,
      why: `From "${c.d.title}": ${c.s}`,
    };
  });
}

export function makeFree(docs: Doc[], kind: "theory" | "practical"): FreeQ | null {
  const good = docs.filter((d) => d.text.split(/\s+/).length >= 12);
  if (!good.length) return null;
  const d = good[Math.floor(Math.random() * good.length)];
  const freq = new Map<string, number>();
  words(d.text).forEach((w) => freq.set(w, (freq.get(w) ?? 0) + 1));
  const kws = Array.from(freq.entries()).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, 5).map((x) => x[0]);
  return {
    kind, topic: d.title, model: d.text,
    prompt: kind === "theory" ? `Explain "${d.title}" in your own words.` : `Give a worked example or application of "${d.title}".`,
    rubric: kws.map((k) => ({ label: `Mentions "${k}"`, test: new RegExp(esc(k), "i") })),
  };
}

export function general(text: string): string {
  const t = text.toLowerCase();
  if (/stress|overwhelm|tired|anxious|burnout|panic|worried/.test(t)) return "That sounds like a lot at once. Pick the single thing due soonest, give it 25 focused minutes, then take a 5 minute break. Small steps beat a big plan you never start.";
  if (/plan|timetable|schedule|deadline/.test(t)) return "Tell me what's due and when, and I'll help you order it. As a rule: hardest thing first, while you're fresh.";
  return "I'm running in offline preview, so I can search your notes, quiz you and build flashcards. Open-ended chat arrives when the AI is connected. Pick a course above to work from your own material.";
}

export function recommend(chats: Record<string, { from: string; text: string; at: number }[]>, courses: Course[], since: number, now: number): Recommendation | null {
  let best: { c: Course; n: number; msgs: string[] } | null = null;
  for (const c of courses) {
    const msgs = (chats[c.id] ?? []).filter((m) => m.from === "me" && m.at > since).map((m) => m.text);
    if (msgs.length && (!best || msgs.length > best.n)) best = { c, n: msgs.length, msgs };
  }
  if (!best || best.n < 2) return null;
  const freq = new Map<string, number>();
  words(best.msgs.join(" ")).forEach((w) => freq.set(w, (freq.get(w) ?? 0) + 1));
  const terms = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map((x) => x[0]);
  const canQuiz = makeQuiz(docsOf(best.c)).length > 0;
  return {
    id: Math.random().toString(36).slice(2, 9), at: now, courseId: best.c.id,
    title: canQuiz ? `Lock in ${best.c.code}` : `Give Birdie more to work with in ${best.c.code}`,
    body: `You asked Birdie ${best.n} question${best.n === 1 ? "" : "s"} about ${best.c.code} recently${terms.length ? `, mostly around "${terms.join('" and "')}"` : ""}. ${canQuiz ? "A quick 5 question review will make it stick." : "Add a few notes so it can quiz you on it."}`,
    action: canQuiz ? { label: "Start review", go: "test", courseId: best.c.id } : { label: "Add notes", go: "study", courseId: best.c.id },
  };
}

export function topInterests(chats: Record<string, { from: string; text: string }[]>, courses: Course[], limit = 6): string[] {
  const freq = new Map<string, number>();
  Object.values(chats).flat().filter((m) => m.from === "me").forEach((m) => words(m.text).forEach((w) => w.length > 3 && freq.set(w, (freq.get(w) ?? 0) + 1)));
  const fromChats = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit).map((x) => x[0]);
  const fromCourses = courses.map((c) => c.name.toLowerCase());
  return Array.from(new Set([...fromCourses, ...fromChats])).slice(0, limit);
}
