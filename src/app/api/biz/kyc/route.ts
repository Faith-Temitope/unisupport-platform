import { NextResponse } from "next/server";
import { adminClient, jsonError } from "@/lib/server";
import { namesMatch } from "@/lib/paystack";

// POST { run: true } -- called by the 5-minute job while businesses are waiting for the tick. For each one:
//   1. Dojah looks up the CAC registration (RC/BN number); the registered name must match the business.
//   2. Dojah checks the owner's NIN against a selfie (face match).
// Both pass: verified (once the ₦5,000 fee is paid). Until DOJAH_APP_ID and DOJAH_SECRET_KEY are set,
// requests simply wait in the queue and run on their own the moment the keys exist.
// It carries no secret: it only works through the queue the database already holds.
export const maxDuration = 300;
const BASE = process.env.DOJAH_BASE_URL ?? "https://api.dojah.io";

async function dojah<T>(path: string, init?: { method?: string; body?: unknown }): Promise<{ ok: boolean; data: T | null; error?: string }> {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: { Authorization: process.env.DOJAH_SECRET_KEY!, AppId: process.env.DOJAH_APP_ID!, "Content-Type": "application/json" },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    const j = await r.json().catch(() => null) as { entity?: T; error?: string } | null;
    return { ok: r.ok && !!j?.entity, data: (j?.entity ?? null) as T | null, error: j?.error };
  } catch { return { ok: false, data: null, error: "unreachable" }; }
}

export async function POST() {
  if (!process.env.DOJAH_APP_ID || !process.env.DOJAH_SECRET_KEY) return NextResponse.json({ queued: true });
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  const { data: rows } = await admin.from("official_accounts").select("id, name, kyc").eq("kyc_status", "queued").limit(10);
  let done = 0;
  for (const o of rows ?? []) {
    const k = (o.kyc ?? {}) as { rc_number?: string; company_type?: string; nin?: string; selfie?: string };
    if (!k.rc_number || !k.nin) continue;
    const rc = k.rc_number.replace(/^(RC|BN)/i, "");
    const cac = await dojah<{ company_name: string; status: string; rc_number: string; type_of_company: string }>(`/api/v1/kyc/cac/basic?rc_number=${encodeURIComponent(rc)}&company_type=${encodeURIComponent(k.company_type ?? "COMPANY")}`);
    let selfieB64 = "";
    if (k.selfie) {
      const { data } = await admin.storage.from("verifications").download(k.selfie);
      if (data) selfieB64 = Buffer.from(await data.arrayBuffer()).toString("base64");
    }
    const nin = selfieB64 ? await dojah<{ firstname: string; surname: string; selfie_verification?: { confidence_value: number; match: boolean } }>("/api/v1/kyc/nin/verify", { method: "POST", body: { nin: k.nin, selfie_image: selfieB64, threshold: 80 } }) : { ok: false, data: null };
    const cacOk = cac.ok && !!cac.data && namesMatch(cac.data.company_name, o.name) && !/inactive|struck/i.test(cac.data.status ?? "");
    const faceOk = !!nin.data?.selfie_verification?.match;
    const passed = cacOk && faceOk;
    const note = passed ? null : !cac.ok ? "We couldn't find that CAC number." : !cacOk ? `The CAC name (${cac.data?.company_name}) doesn't match ${o.name}.` : !nin.ok ? "We couldn't check that NIN." : "The selfie doesn't match the NIN photo.";
    // Keep the result, drop the NIN itself.
    await admin.rpc("_biz_kyc_done", { p_oa: o.id, p_passed: passed, p_result: {
      note, rc_number: k.rc_number, company_type: k.company_type, cac_name: cac.data?.company_name ?? null, cac_status: cac.data?.status ?? null,
      nin_last4: k.nin.slice(-4), nin_name: nin.data ? `${nin.data.firstname} ${nin.data.surname}` : null, face_score: nin.data?.selfie_verification?.confidence_value ?? null, checked_at: new Date().toISOString() } });
    done++;
  }
  return NextResponse.json({ done });
}
