import type { GoogleGenAI } from "@google/genai";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { adminClient, currentUser, jsonError } from "@/lib/server";
import { brainById, modelOf } from "./registry";

// Shared plumbing for the Gemini-only routes (reading scans, speaking, voice chat, pictures).
// All of them run on Spark's key, are free to the student, and are logged in ai_usage so the
// daily safety cap and the admin cost view both see them.

type Gate = { fail: Response } | { fail: null; user: User; admin: SupabaseClient; plus: boolean; ai: GoogleGenAI };
export interface DailyLimit { freeKey: string; plusKey: string; free: number; plus: number; label: string }

/** Signed in, server configured, under the daily safety cap and (optionally) under a per-feature daily limit. */
export async function gate(feature: string, limit?: DailyLimit): Promise<Gate> {
  const { user } = await currentUser();
  if (!user) return { fail: jsonError(401, "sign_in_required") };
  if (!process.env.GEMINI_API_KEY) return { fail: jsonError(501, "provider_not_configured", { needs: "GEMINI_API_KEY" }) };
  const admin = adminClient();
  if (!admin) return { fail: jsonError(501, "billing_not_configured") };
  const [{ data: plusRpc }, { data: left }] = await Promise.all([admin.rpc("is_plus", { p_user: user.id }), admin.rpc("ai_free_remaining", { p_user: user.id })]);
  const plus = plusRpc === true;
  if (typeof left === "number" && left <= 0) return { fail: jsonError(429, "free_allowance_used", { hint: "You've hit today's safety limit. Try again tomorrow." }) };
  if (limit) {
    const since = new Date(); since.setUTCHours(0, 0, 0, 0);
    const [{ data: lim }, { count }] = await Promise.all([
      admin.from("app_config").select("value").eq("key", plus ? limit.plusKey : limit.freeKey).maybeSingle(),
      admin.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("feature", feature).gte("created_at", since.toISOString()),
    ]);
    const allowed = Number(lim?.value ?? (plus ? limit.plus : limit.free));
    if ((count ?? 0) >= allowed) return { fail: plus
      ? jsonError(429, "daily_limit", { hint: `That's today's ${allowed} ${limit.label}. More tomorrow.` })
      : jsonError(403, "plus_required", { hint: `You've used today's ${allowed} free ${limit.label}. Birdie Plus gives you more.` }) };
  }
  const { GoogleGenAI } = await import("@google/genai");
  return { fail: null, user, admin, plus, ai: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) };
}

/** A config value from app_config, or the fallback. Lets the team swap models without a deploy. */
export async function configValue(admin: SupabaseClient, key: string, fallback: string) {
  const { data } = await admin.from("app_config").select("value").eq("key", key).maybeSingle();
  return (data?.value as string | undefined) || fallback;
}

/** Log a Spark-side call. Never charged to the student. */
export async function logUsage(admin: SupabaseClient, userId: string, model: string, feature: string, inTok: number, outTok: number, costUsd?: number) {
  const m = modelOf(brainById("spark"), "balanced");
  const usd = costUsd ?? (inTok * m.inUsd + outTok * m.outUsd) / 1e6;
  const { error } = await admin.rpc("record_ai_usage", { p_user: userId, p_brain: "spark", p_model: model, p_feature: feature, p_in: inTok, p_out: outTok, p_cost_usd: usd, p_charged_ngn: 0 });
  if (error) console.error("record_ai_usage failed", error.message);
}

const msg = (e: unknown) => String((e as Error)?.message ?? e);
export const outOfCapacity = (e: unknown) => /429|quota|rate limit|RESOURCE_EXHAUSTED/i.test(msg(e));
/** The key's plan has no allowance at all for this model (Google's free tier gives image models 0). */
export const noAllowance = (e: unknown) => /limit: 0|free_tier/i.test(msg(e)) && outOfCapacity(e);
export const transient = (e: unknown) => /503|UNAVAILABLE|overload|high demand|timeout|ECONN|fetch failed|500|INTERNAL/i.test(msg(e));
export const errText = msg;

/** 16-bit mono PCM -> a WAV file a phone can play. */
export function pcmToWav(pcm: Buffer, rate = 24000): Buffer {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
