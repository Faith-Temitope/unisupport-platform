import { jsonError } from "@/lib/server";
import { configValue, errText, gate, logUsage, pcmToWav } from "@/lib/ai/gemini";

// POST /api/ai/speak  { text } -> audio/wav
// Birdie's answers read out in a natural voice (Gemini text-to-speech), instead of the phone's robot voice.
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { text?: string };
  try { body = await req.json(); } catch { return jsonError(400, "invalid_json"); }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 2500) : "";
  if (!text) return jsonError(400, "text_required");
  const g = await gate("speak");
  if (g.fail) return g.fail;

  const voice = await configValue(g.admin, "voice_name", "Sulafat");
  const primary = await configValue(g.admin, "tts_model", "gemini-3.8-flash-tts");
  let last: unknown;
  for (const model of [primary, "gemini-2.5-flash-preview-tts"]) {
    try {
      const r = await g.ai.models.generateContent({ model, contents: [{ role: "user", parts: [{ text }] }], config: { responseModalities: ["AUDIO" as never], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } });
      const audio = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
      if (!audio?.data) throw new Error("no audio");
      const raw = Buffer.from(audio.data, "base64");
      const mime = audio.mimeType ?? "";
      const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
      const wav = /wav/i.test(mime) ? raw : pcmToWav(raw, rate);
      await logUsage(g.admin, g.user.id, model, "speak", r.usageMetadata?.promptTokenCount ?? 0, r.usageMetadata?.candidatesTokenCount ?? 0);
      return new Response(new Uint8Array(wav), { headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
    } catch (e) { last = e; }
  }
  console.error("speak failed", errText(last).slice(0, 300));
  return jsonError(502, "vendor_error");
}
