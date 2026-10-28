import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { adminClient, currentUser, jsonError } from "@/lib/server";
import { kobo, paystack } from "@/lib/paystack";

// POST { purpose: "order" | "verify_fee" | "ad_credit", id, amount? } -> { authorization_url, reference }
// Orders are split at checkout: the business's subaccount gets its share straight away and Birdie's
// transaction_charge is its 5% (plus any refund the business still owes). The business pays Paystack's fee.
// Test businesses never reach Paystack: admins pay those from Test Mode.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as { purpose?: string; id?: string; amount?: number };
  const { user } = await currentUser();
  if (!user?.email) return jsonError(401, "sign_in_required");
  if (!["order", "verify_fee", "ad_credit"].includes(String(b.purpose)) || !/^[0-9a-f-]{36}$/i.test(String(b.id))) return jsonError(400, "bad_request");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");

  const { data: start, error } = await admin.rpc("_biz_payment_start", { p_purpose: b.purpose, p_target: b.id, p_user: user.id, p_amount: b.amount ?? null });
  if (error || !start) return jsonError(400, (error?.message ?? "failed").replace(/^.*?exception:\s*/i, ""));
  const s = start as { reference: string; amount: number; subaccount?: string; charge?: number; is_test: boolean };
  if (s.is_test) return jsonError(400, "test_business");
  if (b.purpose === "order" && (!s.subaccount || s.subaccount === "TEST")) return jsonError(400, "not_taking_orders");

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://unisupportorg.vercel.app";
  const body: Record<string, unknown> = {
    email: user.email, amount: kobo(s.amount), reference: s.reference, currency: "NGN",
    callback_url: `${origin}/prototype?paid=${s.reference}`,
    metadata: { purpose: b.purpose, target: b.id, user: user.id },
  };
  if (b.purpose === "order") Object.assign(body, { subaccount: s.subaccount, transaction_charge: kobo(s.charge ?? 0), bearer: "subaccount" });
  const r = await paystack<{ authorization_url: string }>("/transaction/initialize", { body });
  if (!r.ok || !r.data) {
    // Paystack refuses a reference it has already seen: the checkout already exists, so verify instead.
    if (/duplicate/i.test(r.message)) return jsonError(409, "already_started");
    return jsonError(502, r.message);
  }
  return NextResponse.json({ authorization_url: r.data.authorization_url, reference: s.reference });
}
