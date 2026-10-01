import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// POST /api/ai/transcribe  multipart form, field "audio" -> { text }
// Turns a lecture recording into text so Birdie can actually read it (docsOf() includes rec
// transcripts). Uses OpenAI's Whisper model directly; not billed to the student's wallet -- it's
// part of getting their own material into a usable state, same as uploading a note isn't charged.
const err = (status: number, error: string) => NextResponse.json({ error }, { status });
const MAX_BYTES = 25 * 1024 * 1024; // Whisper's own upload limit

export async function POST(req: Request) {
  const store = await cookies();
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: () => {} },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return err(401, "sign_in_required");

  const key = process.env.OPENAI_API_KEY;
  if (!key) return err(501, "transcription_not_configured");

  let form: FormData;
  try { form = await req.formData(); } catch { return err(400, "invalid_form"); }
  const audio = form.get("audio");
  if (!(audio instanceof File)) return err(400, "audio_file_required");
  if (audio.size > MAX_BYTES) return err(413, "file_too_large");
  if (audio.size === 0) return err(400, "empty_file");

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: key });
    const r = await client.audio.transcriptions.create({ file: audio, model: "whisper-1" });
    return NextResponse.json({ text: r.text ?? "" });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (/invalid.?api.?key|authentication|billing|permission|401|403|insufficient_quota/i.test(msg)) {
      return err(501, "transcription_not_configured");
    }
    return err(502, "vendor_error");
  }
}
