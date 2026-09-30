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
const MAX_OUT = 2048;

const err = (status: number, error: string, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status });

async function callVendor(b: Brain, m: BrainModel, system: string | undefined, messages: Msg[], feature: string): Promise<{ text: string; inTok: number; outTok: number }> {
  if (b.vendor === "anthropic") {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const r = await client.messages.create({ model: m.vendorModel, max_tokens: MAX_OUT, system, messages });
    const text = r.content.filter((c) => c.type === "text").map((c) => (c as { text: string }).text).join("\n");
    return { text, inTok: r.usage.input_tokens, outTok: r.usage.output_tokens };
  }
  if (b.vendor === "openai") {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await client.chat.completions.create({ model: m.vendorModel, messages: [...(system ? [{ role: "system" as const, content: system }] : []), ...messages] });
    return { text: r.choices[0]?.message?.content ?? "", inTok: r.usage?.prompt_tokens ?? 0, outTok: r.usage?.completion_tokens ?? 0 };
  }
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const contents = messages.map((x) => ({ role: x.role === "assistant" ? "model" : "user", parts: [{ text: x.content }] }));
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
async function callWithRetry(b: Brain, m: BrainModel, system: string | undefined, messages: Msg[], feature: string) {
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    try { return { ...(await callVendor(b, m, system, messages, feature)), used: m }; }
    catch (e) { last = e; if (outOfCapacity(e) || !transient(e)) break; await sleep(600 * (i + 1)); }
  }
  const quick = b.models.find((x) => x.tier === "quick");
  if (quick && quick.vendorModel !== m.vendorModel && (transient(last) || outOfCapacity(last))) {
    try { return { ...(await callVendor(b, quick, system, messages, feature)), used: quick }; } catch (e) { last = e; }
  }
  throw last;
}

export async function POST(req: Request) {
  let body: { brain?: string; tier?: string; system?: string; messages?: Msg[]; feature?: string };
  try { body = await req.json(); } catch { return err(400, "invalid_json"); }
  const { brain, tier = "balanced", system, messages, feature } = body;
  if (!brain || !Array.isArray(messages) || messages.length === 0) return err(400, "brain_and_messages_required");

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

  // 2. can they afford it (paid brains) or have free answers left (free brains)
  const { data: cfg } = await admin.from("app_config").select("value").eq("key", "usd_ngn").maybeSingle();
  const usdNgn = Number(cfg?.value ?? DEFAULT_USD_NGN);
  if (b.free) {
    const { data: left } = await admin.rpc("ai_free_remaining", { p_user: user.id });
    if ((left as number) <= 0) return err(429, "free_allowance_used", { hint: "Try again tomorrow or pick a paid brain" });
  } else {
    const worst = priceNgn(b, m, 12000, MAX_OUT, usdNgn).ngn; // pre-check with a generous ceiling
    const { data: bal } = await sb.from("wallet_balances").select("balance").eq("user_id", user.id).maybeSingle();
    if (Number(bal?.balance ?? 0) < worst) return err(402, "insufficient_funds", { need_at_least: worst });
  }

  // 3. ask the vendor
  let out: { text: string; inTok: number; outTok: number; used: BrainModel };
  try { out = await callWithRetry(b, m, system, messages, feature ?? "chat"); }
  catch (e) {
    const msg = (e as Error).message ?? "";
    // No credits, a bad/revoked key, or the account isn't billing-enabled: this brain is down until
    // someone fixes the account, not a one-off blip. Tell the client the same way as "not configured".
    if (/insufficient_quota|exceeded your current quota|invalid.?api.?key|authentication|billing|permission|401|403/i.test(msg)) {
      return err(501, "provider_not_configured", { vendor: b.vendor, needs: keyName });
    }
    return err(502, "vendor_error", { message: msg });
  }

  // 4. bill and log
  const p = priceNgn(b, out.used, out.inTok, out.outTok, usdNgn);
  const { error } = await admin.rpc("record_ai_usage", { p_user: user.id, p_brain: b.id, p_model: out.used.vendorModel, p_feature: feature ?? "chat", p_in: out.inTok, p_out: out.outTok, p_cost_usd: p.providerUsd, p_charged_ngn: p.ngn });
  if (error) console.error("record_ai_usage failed", error.message);

  return NextResponse.json({ text: out.text, brain: b.id, model: out.used.vendorModel, usage: { in: out.inTok, out: out.outTok }, charged_ngn: p.ngn });
}
