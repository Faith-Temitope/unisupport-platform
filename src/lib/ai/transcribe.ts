import type { GoogleGenAI } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { configValue, errText, logUsage, outOfCapacity, transient } from "./gemini";

// Speech to text for voice notes ("To Text") and subtitles for uploaded videos. Gemini first (it is
// what the rest of Birdie's free features run on); Whisper only if Gemini fails and OpenAI has credit.
const INLINE_MAX = 14 * 1024 * 1024;
const PROMPTS = {
  text: `Transcribe what is said in this recording, word for word, in the language it is spoken (English, Pidgin, Yoruba, Igbo, Hausa...). Add normal punctuation. Output only the transcript. If nobody speaks, output exactly NO_SPEECH.`,
  vtt: `Write English subtitles for this video as a WebVTT file. Start with the line WEBVTT, then a blank line, then cues like:
00:00:01.000 --> 00:00:04.200
What is said here

Keep each cue under 8 seconds and two short lines. Times must match when the words are spoken. Output only the WebVTT file, no code fences. If nobody speaks, output exactly NO_SPEECH.`,
};

export async function transcribe(g: { ai: GoogleGenAI; admin: SupabaseClient; user: { id: string } }, blob: Blob, mime: string, mode: "text" | "vtt", feature: string): Promise<{ text: string } | { error: string }> {
  let part: object, uploaded: string | undefined;
  try {
    if (blob.size <= INLINE_MAX) part = { inlineData: { mimeType: mime, data: Buffer.from(await blob.arrayBuffer()).toString("base64") } };
    else {
      const f = await g.ai.files.upload({ file: new Blob([await blob.arrayBuffer()], { type: mime }), config: { mimeType: mime } });
      uploaded = f.name;
      let state = f.state, tries = 0;
      while (String(state) === "PROCESSING" && tries++ < 45) { await new Promise((r) => setTimeout(r, 2000)); state = (await g.ai.files.get({ name: f.name! })).state; }
      part = { fileData: { fileUri: f.uri, mimeType: mime } };
    }
    const primary = await configValue(g.admin, "read_model", "gemini-3.6-flash");
    for (const model of [primary, "gemini-3.5-flash-lite"]) {
      try {
        const ask = (thinking: boolean) => g.ai.models.generateContent({ model, contents: [{ role: "user", parts: [part as never, { text: PROMPTS[mode] }] }], config: { maxOutputTokens: 16000, ...(thinking ? { thinkingConfig: { thinkingLevel: "MINIMAL" as never } } : {}) } });
        const r = await ask(true).catch((e) => { if (/thinking|INVALID_ARGUMENT/i.test(errText(e))) return ask(false); throw e; });
        await logUsage(g.admin, g.user.id, model, feature, r.usageMetadata?.promptTokenCount ?? 0, (r.usageMetadata?.candidatesTokenCount ?? 0) + (r.usageMetadata?.thoughtsTokenCount ?? 0));
        const text = (r.text ?? "").trim().replace(/^```[a-z]*\n?|```$/g, "").trim();
        if (text === "NO_SPEECH") return { text: "" };
        if (mode === "vtt" && !text.startsWith("WEBVTT")) throw new Error("bad_vtt");
        return { text };
      } catch (e) { if (model !== primary || !(outOfCapacity(e) || transient(e) || /bad_vtt/.test(errText(e)))) throw e; }
    }
  } catch (e) {
    console.error(`${feature} (gemini) failed`, errText(e).slice(0, 300));
  } finally {
    if (uploaded) await g.ai.files.delete({ name: uploaded }).catch(() => {});
  }
  return whisper(blob, mime, mode);
}

async function whisper(blob: Blob, mime: string, mode: "text" | "vtt"): Promise<{ text: string } | { error: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || blob.size > 25 * 1024 * 1024) return { error: "vendor_error" };
  try {
    const { default: OpenAI } = await import("openai");
    const file = new File([blob], mime.startsWith("video") ? "video.mp4" : "voice.webm", { type: mime });
    const r = await new OpenAI({ apiKey: key }).audio.transcriptions.create({ file, model: "whisper-1", response_format: mode === "vtt" ? "vtt" : "json" });
    const text = typeof r === "string" ? r : String((r as { text?: string }).text ?? "");
    return { text: text.trim() };
  } catch (e) {
    console.error("whisper failed", errText(e).slice(0, 200));
    return { error: "vendor_error" };
  }
}
