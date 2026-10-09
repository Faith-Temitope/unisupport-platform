import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server";
import { configValue, errText, gate, logUsage, outOfCapacity, transient } from "@/lib/ai/gemini";

// POST /api/ai/read  { path } -> { text }
// Reads a scanned PDF (CamScanner, phone scans) or a photo of notes that has no text layer, so
// Birdie can use it. The file must already be in the student's own study-files folder.
export const maxDuration = 300;

const MIME: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif" };
const INLINE_MAX = 14 * 1024 * 1024;
const PROMPT = `These are a student's notes, handouts or lecture slides, scanned or photographed. Some pages may be handwritten.
Transcribe every word you can read, in reading order, page by page. Start each page with "--- Page N ---".
Keep headings, numbered points and lists. Write equations and formulas in plain text (for example: x^2 + 3x = 0).
For a diagram, table or figure, write a one-line description in square brackets, for example [Diagram: the stages of mitosis].
If a word can't be read, write [unclear]. Output only the transcription, nothing else.
If there is no readable text at all, output exactly NO_TEXT.`;

export async function POST(req: Request) {
  let body: { path?: string };
  try { body = await req.json(); } catch { return jsonError(400, "invalid_json"); }
  const g = await gate("read");
  if (g.fail) return g.fail;
  const path = body.path;
  if (typeof path !== "string" || !path.startsWith(`${g.user.id}/`) || path.includes("..")) return jsonError(403, "not_your_file");
  const mime = MIME[path.split(".").pop()?.toLowerCase() ?? ""];
  if (!mime) return jsonError(400, "unsupported_type");

  const { data: blob, error } = await g.admin.storage.from("study-files").download(path);
  if (error || !blob) return jsonError(404, "file_not_found");
  if (blob.size > 40 * 1024 * 1024) return jsonError(413, "file_too_large");

  // Small files go inline; bigger ones go through Gemini's file store (deleted straight after).
  let part: object, uploaded: string | undefined;
  if (blob.size <= INLINE_MAX) part = { inlineData: { mimeType: mime, data: Buffer.from(await blob.arrayBuffer()).toString("base64") } };
  else {
    const f = await g.ai.files.upload({ file: new Blob([await blob.arrayBuffer()], { type: mime }), config: { mimeType: mime } });
    uploaded = f.name;
    let state = f.state, tries = 0;
    while (String(state) === "PROCESSING" && tries++ < 30) { await new Promise((r) => setTimeout(r, 2000)); state = (await g.ai.files.get({ name: f.name! })).state; }
    part = { fileData: { fileUri: f.uri, mimeType: mime } };
  }

  const primary = await configValue(g.admin, "read_model", "gemini-3.6-flash");
  try {
    for (const model of [primary, "gemini-3.5-flash-lite"]) {
      try {
        const r = await g.ai.models.generateContent({ model, contents: [{ role: "user", parts: [part as never, { text: PROMPT }] }], config: { maxOutputTokens: 32000, thinkingConfig: { thinkingLevel: "MINIMAL" as never } } })
          .catch((e) => { if (/thinking|INVALID_ARGUMENT/i.test(errText(e))) return g.ai.models.generateContent({ model, contents: [{ role: "user", parts: [part as never, { text: PROMPT }] }], config: { maxOutputTokens: 32000 } }); throw e; });
        const text = (r.text ?? "").trim();
        await logUsage(g.admin, g.user.id, model, "read", r.usageMetadata?.promptTokenCount ?? 0, (r.usageMetadata?.candidatesTokenCount ?? 0) + (r.usageMetadata?.thoughtsTokenCount ?? 0));
        return NextResponse.json({ text: text === "NO_TEXT" ? "" : text, model });
      } catch (e) { if (!(outOfCapacity(e) || transient(e)) || model !== primary) throw e; }
    }
    return jsonError(502, "vendor_error");
  } catch (e) {
    console.error("read failed", errText(e).slice(0, 300));
    return jsonError(502, "vendor_error");
  } finally {
    if (uploaded) await g.ai.files.delete({ name: uploaded }).catch(() => {});
  }
}
