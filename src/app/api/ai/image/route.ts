import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server";
import { configValue, errText, gate, logUsage, noAllowance } from "@/lib/ai/gemini";

// POST /api/ai/image  { prompt } -> { path, caption }
// Birdie draws a picture (diagram, illustration, poster) with Gemini's image model and saves it in the
// student's own files. Google gives image models no free-tier allowance on the API, so this only works
// once billing is switched on for the Gemini key; until then it says so plainly.
export const maxDuration = 120;
const LIMIT = { freeKey: "free_images_daily", plusKey: "plus_images_daily", free: 3, plus: 30, label: "pictures" };

export async function POST(req: Request) {
  let body: { prompt?: string };
  try { body = await req.json(); } catch { return jsonError(400, "invalid_json"); }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 2000) : "";
  if (prompt.length < 3) return jsonError(400, "prompt_required");
  const g = await gate("image", LIMIT);
  if (g.fail) return g.fail;

  const model = await configValue(g.admin, "image_model", "gemini-3.1-flash-image");
  try {
    const r = await g.ai.models.generateContent({ model, contents: [{ role: "user", parts: [{ text: `${prompt}\n\n(For a student. Keep any text in the image short and spelled correctly.)` }] }], config: { responseModalities: ["IMAGE" as never, "TEXT" as never] } });
    const parts = r.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find((p) => p.inlineData?.data)?.inlineData;
    if (!img?.data) return jsonError(422, "no_image", { hint: "Birdie couldn't draw that one. Try describing it differently." });
    const ext = /jpe?g/.test(img.mimeType ?? "") ? "jpg" : "png";
    const path = `${g.user.id}/birdie-images/${crypto.randomUUID()}.${ext}`;
    const { error } = await g.admin.storage.from("study-files").upload(path, Buffer.from(img.data, "base64"), { contentType: img.mimeType ?? "image/png" });
    if (error) return jsonError(500, "save_failed");
    await logUsage(g.admin, g.user.id, model, "image", r.usageMetadata?.promptTokenCount ?? 0, r.usageMetadata?.candidatesTokenCount ?? 0, 0.04);
    const caption = parts.filter((p) => p.text).map((p) => p.text).join(" ").trim();
    return NextResponse.json({ path, caption });
  } catch (e) {
    if (noAllowance(e)) return jsonError(501, "image_billing_off", { hint: "Picture making isn't switched on yet. The Birdie team needs to turn on billing for the Gemini key." });
    console.error("image failed", errText(e).slice(0, 300));
    return jsonError(502, "vendor_error");
  }
}
