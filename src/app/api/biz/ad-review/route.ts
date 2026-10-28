import { NextResponse } from "next/server";
import { configValue, errText, gate, logUsage } from "@/lib/ai/gemini";
import { jsonError } from "@/lib/server";

// POST { id } -> { ok, reason }  Every ad is checked before it runs. For now the only thing blocked is
// sexual content (porn, nudity, sex work, adult services); the list grows in AD_RULES when we decide.
export const maxDuration = 120;
const AD_RULES = "Block only: pornography, nudity, sexual content, sex work or escort services, adult products marketed sexually. Everything else is allowed.";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as { id?: string };
  const g = await gate("ad_review");
  if (g.fail) return g.fail;
  const { admin, user } = g;
  if (!/^[0-9a-f-]{36}$/i.test(String(b.id))) return jsonError(400, "bad_id");
  const { data: c } = await admin.from("ad_campaigns").select("id, oa_id, title, body, cta_label, media_kind, media_url, status, url").eq("id", b.id).maybeSingle();
  if (!c) return jsonError(404, "not_found");
  const { data: role } = await admin.rpc("_oa_role", { p_oa: c.oa_id, p_user: user.id });
  if (!role || role === "staff") return jsonError(403, "not_allowed");
  if (c.status !== "review") return NextResponse.json({ ok: c.status === "live" });

  const parts: object[] = [];
  if (c.media_url && c.media_kind !== "none") {
    try {
      const r = await fetch(c.media_url);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 18 * 1024 * 1024) parts.push({ inlineData: { mimeType: r.headers.get("content-type") || (c.media_kind === "video" ? "video/mp4" : "image/jpeg"), data: buf.toString("base64") } });
    } catch { /* judged on the text */ }
  }
  parts.push({ text: `You check ads before they run on Birdie, a student app in Nigeria. ${AD_RULES}
Ad title: ${c.title}
Ad text: ${c.body ?? ""}
Button: ${c.cta_label}${c.url ? `\nLink: ${c.url}` : ""}
${parts.length ? "The image or video above is part of the ad." : ""}
Reply with JSON only: {"allowed": true|false, "reason": "if not allowed, one short sentence the advertiser will see"}` });
  let ok = true, reason: string | null = null;
  try {
    const model = await configValue(admin, "read_model", "gemini-3.6-flash");
    const res = await g.ai.models.generateContent({ model, contents: [{ role: "user", parts: parts as never }], config: { responseMimeType: "application/json", maxOutputTokens: 400 } });
    await logUsage(admin, user.id, model, "ad_review", res.usageMetadata?.promptTokenCount ?? 0, res.usageMetadata?.candidatesTokenCount ?? 0);
    const j = JSON.parse((res.text ?? "").replace(/^[^{]*/, "").replace(/[^}]*$/, "")) as { allowed: boolean; reason?: string };
    ok = j.allowed !== false; reason = ok ? null : j.reason ?? "It breaks the ad rules.";
  } catch (e) {
    console.error("ad review failed", errText(e).slice(0, 200));
    return jsonError(502, "try_again");
  }
  await admin.rpc("_ad_moderated", { p_id: c.id, p_ok: ok, p_reason: reason });
  return NextResponse.json({ ok, reason });
}
