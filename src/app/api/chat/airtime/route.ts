import { NextResponse } from "next/server";
import { adminClient, currentUser, jsonError } from "@/lib/server";

// POST { id, phone, network } -> { ok, amount } | { ok: false, error }
// Opening an airtime giveaway: reserve a share in the database, send the airtime through VTpass, then
// confirm it, or put the share back if VTpass didn't deliver. The sender already paid from their wallet
// when they made the giveaway; the airtime itself comes from Birdie's VTpass balance.
// Needs VTPASS_API_KEY and VTPASS_SECRET_KEY (and VTPASS_SANDBOX=1 to use the test server).
// Not yet tested against a live VTpass account.
export const maxDuration = 60;
const SERVICE: Record<string, string> = { mtn: "mtn", glo: "glo", airtel: "airtel", etisalat: "etisalat" };

/** VTpass wants request ids that start with the Lagos date and time (YYYYMMDDHHmm). */
function requestId() {
  const lagos = new Date(Date.now() + 60 * 60_000); // UTC+1
  const p = (n: number) => String(n).padStart(2, "0");
  return `${lagos.getUTCFullYear()}${p(lagos.getUTCMonth() + 1)}${p(lagos.getUTCDate())}${p(lagos.getUTCHours())}${p(lagos.getUTCMinutes())}${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export async function POST(req: Request) {
  let b: { id?: string; phone?: string; network?: string };
  try { b = await req.json(); } catch { return jsonError(400, "invalid_json"); }
  const { user } = await currentUser();
  if (!user) return jsonError(401, "sign_in_required");
  const apiKey = process.env.VTPASS_API_KEY, secret = process.env.VTPASS_SECRET_KEY;
  if (!apiKey || !secret) return NextResponse.json({ ok: false, error: "airtime_off" }, { status: 501 });
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  const phone = String(b.phone ?? "").replace(/\D/g, "").replace(/^234/, "0");
  const network = String(b.network ?? "").toLowerCase();

  const { data: res, error } = await admin.rpc("_reserve_airtime", { p_user: user.id, p_id: b.id, p_phone: phone, p_network: network });
  if (error) return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  const r = res as { ok: boolean; error?: string; claim_id?: string; amount?: number };
  if (!r.ok) return NextResponse.json(r);

  const base = process.env.VTPASS_SANDBOX === "1" ? "https://sandbox.vtpass.com" : "https://vtpass.com";
  let delivered = false, ref: string | null = null;
  try {
    const v = await fetch(`${base}/api/pay`, {
      method: "POST",
      headers: { "api-key": apiKey, "secret-key": secret, "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId(), serviceID: SERVICE[network], amount: r.amount, phone }),
      signal: AbortSignal.timeout(30_000),
    });
    const j = await v.json().catch(() => ({}));
    const status = j?.content?.transactions?.status;
    delivered = j?.code === "000" && status !== "failed";
    ref = j?.requestId ?? j?.content?.transactions?.transactionId ?? null;
    if (!delivered) console.error("vtpass failed", j?.code, j?.response_description);
  } catch (e) { console.error("vtpass error", (e as Error).message); }

  await admin.rpc("_finish_airtime", { p_claim: r.claim_id, p_ok: delivered, p_ref: ref });
  return NextResponse.json(delivered ? { ok: true, amount: r.amount } : { ok: false, error: "provider" });
}
