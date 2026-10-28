import { NextResponse } from "next/server";
import { gate } from "@/lib/ai/gemini";
import { transcribe } from "@/lib/ai/transcribe";
import { jsonError } from "@/lib/server";

// POST /api/ai/transcribe  multipart form, field "audio" -> { text }
// Turns a lecture recording into text so Birdie can actually read it (docsOf() includes rec
// transcripts). Gemini first, Whisper if that fails. Not billed to the student's wallet -- it's
// part of getting their own material into a usable state, same as uploading a note isn't charged.
export const maxDuration = 300;
const MAX_BYTES = 100 * 1024 * 1024;

export async function POST(req: Request) {
  const g = await gate("transcribe");
  if (g.fail) return g.fail;
  let form: FormData;
  try { form = await req.formData(); } catch { return jsonError(400, "invalid_form"); }
  const audio = form.get("audio");
  if (!(audio instanceof File)) return jsonError(400, "audio_file_required");
  if (audio.size > MAX_BYTES) return jsonError(413, "file_too_large");
  if (audio.size === 0) return jsonError(400, "empty_file");
  const r = await transcribe(g, audio, audio.type || "audio/webm", "text", "transcribe");
  return "error" in r ? jsonError(502, r.error) : NextResponse.json({ text: r.text });
}
