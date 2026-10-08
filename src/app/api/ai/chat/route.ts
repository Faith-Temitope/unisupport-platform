import { createClient as createAdmin } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEFAULT_USD_NGN, brainById, modelOf, priceNgn, type Brain, type BrainModel } from "@/lib/ai/registry";

// POST /api/ai/chat  { brain, tier, system?, messages: [{role, content}], feature? }
// Calls Gemini (Spark), OpenAI (Nova) or Claude (Sage), then bills the student cost x margin.
// Needs GEMINI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY and SUPABASE_SERVICE_ROLE_KEY on the server.
// Not yet exercised against live vendor keys (none configured at the time of writing).

type Msg = { role: "user" | "assistant"; content: string };
type Img = { mime: string; data: string };
const IMG_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_OUT = 2048;

const err = (status: number, error: string, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status });

// Photos ride along with the last user message, in each vendor's own format.
async function callVendor(b: Brain, m: BrainModel, system: string | undefined, messages: Msg[], feature: string, images: Img[] = []): Promise<{ text: string; inTok: number; outTok: number }> {
  const lastIdx = messages.length - 1;
  if (b.vendor === "anthropic") {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msgs = messages.map((x, i) => (i === lastIdx && images.length ? { role: x.role, content: [...images.map((im) => ({ type: "image" as const, source: { type: "base64" as const, media_type: im.mime as "image/jpeg", data: im.data } })), { type: "text" as const, text: x.content }] } : x));
    const r = await client.messages.create({ model: m.vendorModel, max_tokens: MAX_OUT, system, messages: msgs });
    const text = r.content.filter((c) => c.type === "text").map((c) => (c as { text: string }).text).join("\n");
    return { text, inTok: r.usage.input_tokens, outTok: r.usage.output_tokens };
  }
  if (b.vendor === "openai") {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const msgs = messages.map((x, i) => (i === lastIdx && images.length && x.role === "user" ? { role: "user" as const, content: [{ type: "text" as const, text: x.content }, ...images.map((im) => ({ type: "image_url" as const, image_url: { url: `data:${im.mime};base64,${im.data}` } }))] } : x));
    const r = await client.chat.completions.create({ model: m.vendorModel, messages: [...(system ? [{ role: "system" as const, content: system }] : []), ...msgs] });
    return { text: r.choices[0]?.message?.content ?? "", inTok: r.usage?.prompt_tokens ?? 0, outTok: r.usage?.completion_tokens ?? 0 };
  }
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const contents = messages.map((x, i) => ({ role: x.role === "assistant" ? "model" : "user", parts: [...(i === lastIdx ? images.map((im) => ({ inlineData: { mimeType: im.mime, data: im.data } })) : []), { text: x.content }] as never[] }));
  // Thinking tokens are billed as output. Ask for the least thinking the task allows; some models reject a level, so step up.
  const wanted = feature === "quiz" || feature === "grade" ? ["LOW"] : ["MINIMAL", "LOW"];
  let lastErr: unknown;
  for (const level of [...wanted, undefined]) {
    try {
      const r = await ai.models.generateContent({ model: m.vendorModel, contents, config: { ...(system ? { systemInstruction: system } : {}), ...(level ? { thinkingConfig: { thinkingLevel: level as never } } : {}) } });
      const think = r.usageMetadata?.thoughtsTokenCount ?? 0;
      return { text: r.text ?? "", inTok: r.usageMetadata?.promptTokenCount ?? 0, outTok: (r.usageMetadata?.candidatesTokenCount ?? 0) + think };
    } catch (e) { lastErr = e; if (!/thinking|INVALID_ARGUMENT/i.test(String((e as Error)?.message))) throw e; }
  }
  throw lastErr;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Overloads are transient (retry). A quota or rate limit means this model is out of capacity right now.
const transient = (e: unknown) => /503|UNAVAILABLE|overload|high demand|timeout|ECONN|fetch failed/i.test(String((e as Error)?.message ?? e));
const outOfCapacity = (e: unknown) => /429|quota|rate limit|RESOURCE_EXHAUSTED/i.test(String((e as Error)?.message ?? e));

/** Retry overloads; if the chosen model is busy or out of quota, use the brain's lightest tier so the student still gets an answer. */
async function callWithRetry(b: Brain, m: BrainModel, system: string | undefined, messages: Msg[], feature: string, images: Img[] = []) {
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    try { return { ...(await callVendor(b, m, system, messages, feature, images)), used: m }; }
    catch (e) { last = e; if (outOfCapacity(e) || !transient(e)) break; await sleep(600 * (i + 1)); }
  }
  const quick = b.models.find((x) => x.tier === "quick");
  if (quick && quick.vendorModel !== m.vendorModel && (transient(last) || outOfCapacity(last))) {
    try { return { ...(await callVendor(b, quick, system, messages, feature, images)), used: quick }; } catch (e) { last = e; }
  }
  throw last;
}

export async function POST(req: Request) {
  let body: { brain?: string; tier?: string; system?: string; messages?: Msg[]; feature?: string; images?: Img[] };
  try { body = await req.json(); } catch { return err(400, "invalid_json"); }
  const { brain, tier = "balanced", system, messages, feature } = body;
  if (!brain || !Array.isArray(messages) || messages.length === 0) return err(400, "brain_and_messages_required");
  // At most 3 photos, each a real JPEG/PNG/WebP under ~5 MB.
  const images = (Array.isArray(body.images) ? body.images : []).slice(0, 3);
  if (images.some((im) => !im || !IMG_TYPES.includes(im.mime) || typeof im.data !== "string" || im.data.length > 7_000_000 || !/^[A-Za-z0-9+/=]+$/.test(im.data))) return err(400, "bad_image");

  // 1. who is asking
  const store = await cookies();
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* read-only context */ } } },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return err(401, "sign_in_required");

  const base = brainById(brain);
  const keyName = base.vendor === "gemini" ? "GEMINI_API_KEY" : base.vendor === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
  if (!process.env[keyName]) return err(501, "provider_not_configured", { vendor: base.vendor, needs: keyName });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return err(501, "billing_not_configured", { needs: "SUPABASE_SERVICE_ROLE_KEY" });
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } });

  // Live configuration from the team console: margin, free/paid, enabled, model ids and prices.
  const [{ data: prov }, { data: rows }] = await Promise.all([
    admin.from("ai_providers").select("is_free,margin,enabled").eq("id", base.id).maybeSingle(),
    admin.from("ai_models").select("tier,label,vendor_model,vendor_label,input_usd_per_mtok,output_usd_per_mtok,enabled").eq("provider_id", base.id),
  ]);
  if (prov && !prov.enabled) return err(403, "brain_disabled", { hint: `${base.brand} is switched off right now` });
  const b: Brain = { ...base, free: prov?.is_free ?? base.free, margin: Number(prov?.margin ?? base.margin), models: base.models.map((dm) => {
    const r = rows?.find((x) => x.tier === dm.tier && x.enabled);
    return r ? { tier: dm.tier, label: r.label, vendorModel: r.vendor_model, vendorLabel: r.vendor_label, inUsd: Number(r.input_usd_per_mtok), outUsd: Number(r.output_usd_per_mtok) } : dm;
  }) };
  const m = modelOf(b, tier);

  // 2. can they afford it (paid brains) or have free answers left (free brains) -- an active Exam
  // Pass waives both, since that's the whole point of paying for one.
  const { data: cfg } = await admin.from("app_config").select("value").eq("key", "usd_ngn").maybeSingle();
  const usdNgn = Number(cfg?.value ?? DEFAULT_USD_NGN);
  // Active course reps get the same unlimited access as an Exam Pass, for as long as they're a rep.
  const [{ data: passRow }, { data: repRow }] = await Promise.all([
    admin.from("profiles").select("exam_pass_until").eq("id", user.id).maybeSingle(),
    admin.from("course_reps").select("status").eq("user_id", user.id).maybeSingle(),
  ]);
  const examPassActive = (!!passRow?.exam_pass_until && new Date(passRow.exam_pass_until) > new Date()) || repRow?.status === "active";
  if (!examPassActive) {
    if (b.free) {
      const { data: left } = await admin.rpc("ai_free_remaining", { p_user: user.id });
      if ((left as number) <= 0) return err(429, "free_allowance_used", { hint: "Try again tomorrow, pick a paid brain, or get an Exam Pass for unlimited access" });
    } else {
      const worst = priceNgn(b, m, 12000, MAX_OUT, usdNgn).ngn; // pre-check with a generous ceiling
      const { data: bal } = await sb.from("wallet_balances").select("balance").eq("user_id", user.id).maybeSingle();
      if (Number(bal?.balance ?? 0) < worst) return err(402, "insufficient_funds", { need_at_least: worst });
    }
  }

  // 3. ask the vendor
  let out: { text: string; inTok: number; outTok: number; used: BrainModel };
  try { out = await callWithRetry(b, m, system, messages, feature ?? "chat", images); }
  catch (e) {
    const msg = (e as Error).message ?? "";
    // No credits, a bad/revoked key, or the account isn't billing-enabled: this brain is down until
    // someone fixes the account, not a one-off blip. Tell the client the same way as "not configured".
    if (/insufficient_quota|exceeded your current quota|invalid.?api.?key|authentication|billing|permission|401|403/i.test(msg)) {
      return err(501, "provider_not_configured", { vendor: b.vendor, needs: keyName });
    }
    return err(502, "vendor_error", { message: msg });
  }

  // 4. bill and log -- still logs the real provider cost for admin margin tracking, but charges
  // the student nothing while their Exam Pass is active.
  const p = priceNgn(b, out.used, out.inTok, out.outTok, usdNgn);
  const { error } = await admin.rpc("record_ai_usage", { p_user: user.id, p_brain: b.id, p_model: out.used.vendorModel, p_feature: feature ?? "chat", p_in: out.inTok, p_out: out.outTok, p_cost_usd: p.providerUsd, p_charged_ngn: examPassActive ? 0 : p.ngn });
  if (error) console.error("record_ai_usage failed", error.message);

  return NextResponse.json({ text: out.text, brain: b.id, model: out.used.vendorModel, usage: { in: out.inTok, out: out.outTok }, charged_ngn: p.ngn });
}
