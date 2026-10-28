import { NextResponse } from "next/server";
import { adminClient, currentUser, jsonError } from "@/lib/server";
import { kobo, paystack } from "@/lib/paystack";

// POST { reference } -> { status } -- called from Paystack's return page so the order shows as paid
// straight away even if the webhook is slow. _biz_payment_paid() only acts once per reference.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as { reference?: string };
  const { user } = await currentUser();
  if (!user) return jsonError(401, "sign_in_required");
  if (!/^bz_[a-z]_[0-9a-f]{32}$/.test(String(b.reference))) return jsonError(400, "bad_reference");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  const { data: pay } = await admin.from("biz_payments").select("user_id, amount, status, purpose, target").eq("reference", b.reference).maybeSingle();
  if (!pay || pay.user_id !== user.id) return jsonError(404, "not_found");
  if (pay.status === "paid") return NextResponse.json({ status: "paid", purpose: pay.purpose, target: pay.target });
  const r = await paystack<{ status: string; amount: number }>(`/transaction/verify/${encodeURIComponent(b.reference!)}`);
  if (!r.ok || r.data?.status !== "success" || Number(r.data.amount) !== kobo(Number(pay.amount))) {
    if (r.data?.status === "failed") await admin.from("biz_payments").update({ status: "failed" }).eq("reference", b.reference);
    return NextResponse.json({ status: r.data?.status ?? "pending", purpose: pay.purpose, target: pay.target });
  }
  const { error } = await admin.rpc("_biz_payment_paid", { p_ref: b.reference, p_amount: pay.amount });
  if (error) return jsonError(500, "confirm_failed");
  return NextResponse.json({ status: "paid", purpose: pay.purpose, target: pay.target });
}
