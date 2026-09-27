import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const sys = "You are Birdie. Answer using ONLY this material: An eigenvector keeps its direction when a matrix acts on it.";
for (const [label, thinkingConfig] of [["default", undefined], ["budget 0", { thinkingBudget: 0 }], ["level low", { thinkingLevel: "LOW" }], ["level minimal", { thinkingLevel: "MINIMAL" }]]) {
  for (const model of ["gemini-3.5-flash", "gemini-3.5-flash-lite"]) {
    try {
      const r = await ai.models.generateContent({ model, contents: [{ role: "user", parts: [{ text: "What is an eigenvector?" }] }], config: { systemInstruction: sys, ...(thinkingConfig ? { thinkingConfig } : {}) } });
      console.log("OK  ", model.padEnd(22), label.padEnd(14), "out", r.usageMetadata?.candidatesTokenCount, "thoughts", r.usageMetadata?.thoughtsTokenCount ?? 0);
    } catch (e) { console.log("FAIL", model.padEnd(22), label.padEnd(14), String(e.message).slice(0, 160)); }
  }
}
