// Reproduces the summary and quiz prompts against Gemini to see the raw vendor behaviour.
import { GoogleGenAI } from "@google/genai";
const material = `[Note: Eigenvalues]\nAn eigenvector of a matrix keeps its direction when the matrix acts on it. The scalar factor is called the eigenvalue.\n\n[Note: Determinant]\nThe determinant of a square matrix equals the product of its eigenvalues.`;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const cases = {
  summary: { system: `You are Birdie, a study partner. Answer using ONLY the course material below.\n\n--- COURSE MATERIAL ---\n${material}`, user: "Summarise this course material as clear bullet points a student can revise from." },
  quiz: { system: `You write exam practice questions. Use ONLY this course material:\n\n${material}\n\nWrite 5 multiple choice questions. Return ONLY a JSON array. Each item: {"q": string, "opts": [4 strings], "answer": 0-3, "topic": string, "why": string}.`, user: "Write the questions now." },
};
for (const [name, c] of Object.entries(cases)) {
  try {
    const r = await ai.models.generateContent({ model: "gemini-3.5-flash", contents: [{ role: "user", parts: [{ text: c.user }] }], config: { systemInstruction: c.system } });
    console.log(name, "OK text length:", r.text?.length, "| finish:", r.candidates?.[0]?.finishReason, "| usage:", JSON.stringify(r.usageMetadata));
    console.log("   ", String(r.text).slice(0, 220).replace(/\n/g, " | "));
  } catch (e) { console.log(name, "FAIL", String(e.message).slice(0, 400)); }
}
