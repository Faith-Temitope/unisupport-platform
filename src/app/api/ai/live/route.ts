import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server";
import { configValue, errText, gate, logUsage } from "@/lib/ai/gemini";

// POST /api/ai/live  { system } -> { token, model }
// Starts a real-time voice chat with Birdie (Gemini Live). The phone talks to Google directly with a
// one-use token that expires in minutes and is locked to our model and settings, so the real key
// never leaves the server and the token can't be reused for anything else.
const LIMIT = { freeKey: "free_voice_daily", plusKey: "plus_voice_daily", free: 5, plus: 40, label: "voice chats" };

export async function POST(req: Request) {
  let body: { system?: string };
  try { body = await req.json(); } catch { return jsonError(400, "invalid_json"); }
  const g = await gate("voice", LIMIT);
  if (g.fail) return g.fail;
  const system = (typeof body.system === "string" ? body.system : "").slice(0, 24000) || "You are Birdie, a friendly study buddy.";
  const [model, voice] = await Promise.all([configValue(g.admin, "voice_model", "gemini-3.8-live"), configValue(g.admin, "voice_name", "Sulafat")]);
  try {
    const { Modality } = await import("@google/genai");
    const tok = await g.ai.authTokens.create({ config: {
      uses: 1,
      expireTime: new Date(Date.now() + 15 * 60_000).toISOString(),
      newSessionExpireTime: new Date(Date.now() + 2 * 60_000).toISOString(),
      liveConnectConstraints: { model, config: {
        responseModalities: [Modality.AUDIO], systemInstruction: system,
        inputAudioTranscription: {}, outputAudioTranscription: {},
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      } },
      httpOptions: { apiVersion: "v1alpha" },
    } });
    if (!tok.name) throw new Error("no token");
    await logUsage(g.admin, g.user.id, model, "voice", 0, 0, 0);
    return NextResponse.json({ token: tok.name, model });
  } catch (e) {
    console.error("live token failed", errText(e).slice(0, 300));
    return jsonError(502, "vendor_error");
  }
}
