// Smoke test for the vendor SDK calls used by /api/ai/chat. Costs a fraction of a cent.
// Run:  node --env-file=.env.local scripts/ai-smoke.mjs
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

const prompt = "Reply with exactly three words: Birdie is ready.";

async function gemini(model) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const r = await ai.models.generateContent({ model, contents: [{ role: "user", parts: [{ text: prompt }] }], config: { systemInstruction: "You are terse." } });
  return { text: r.text, in: r.usageMetadata?.promptTokenCount, out: r.usageMetadata?.candidatesTokenCount };
}
async function openai(model) {
  const c = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const r = await c.chat.completions.create({ model, messages: [{ role: "system", content: "You are terse." }, { role: "user", content: prompt }] });
  return { text: r.choices[0]?.message?.content, in: r.usage?.prompt_tokens, out: r.usage?.completion_tokens };
}

for (const [name, fn, model] of [["spark/quick", gemini, "gemini-3.5-flash-lite"], ["spark/balanced", gemini, "gemini-3.5-flash"], ["nova/quick", openai, "gpt-5.6-luna"]]) {
  try { const r = await fn(model); console.log("OK  ", name, model, JSON.stringify(r)); }
  catch (e) { console.log("FAIL", name, model, String(e.message).slice(0, 300)); }
}
