// Latency + behaviour benchmark for the Gemini models that could back Spark. Costs a few cents at most.
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const material = "[Note: Eigenvalues]\nAn eigenvector of a matrix keeps its direction when the matrix acts on it. The scalar factor is called the eigenvalue. To find eigenvalues you solve det(A - lambda I) = 0.\n\n[Note: Determinant]\nThe determinant of a square matrix equals the product of its eigenvalues.";
const sys = `You are Birdie, a study partner. Answer using ONLY the course material below. If the material does not cover it, say so in one sentence.\n\n${material}`;
const quizSys = `Write 5 multiple choice questions using ONLY this material:\n\n${material}\nReturn ONLY a JSON array of {"q","opts":[4],"answer":0-3,"topic","why"}.`;
const models = process.argv.slice(2);
async function run(model, system, user, level) {
  const t = Date.now();
  try {
    const r = await ai.models.generateContent({ model, contents: [{ role: "user", parts: [{ text: user }] }], config: { systemInstruction: system, thinkingConfig: { thinkingLevel: level } } });
    return { ms: Date.now() - t, out: r.usageMetadata?.candidatesTokenCount, think: r.usageMetadata?.thoughtsTokenCount ?? 0, text: (r.text ?? "").replace(/\s+/g, " ").slice(0, 90) };
  } catch (e) { return { ms: Date.now() - t, err: String(e.message).slice(0, 70) }; }
}
for (const m of models) {
  const a = await run(m, sys, "What is an eigenvector?", "MINIMAL");
  const b = await run(m, sys, "How does photosynthesis work?", "MINIMAL");
  const c = await run(m, quizSys, "Write the questions now.", "LOW");
  const f = (x) => (x.err ? `ERR ${x.ms}ms ${x.err}` : `${String(x.ms).padStart(5)}ms out${x.out} th${x.think}`);
  console.log(m.padEnd(24), "| chat", f(a), "| offtopic", f(b), "| quiz", f(c));
  console.log("   offtopic ->", b.text ?? "");
}
