import { NextResponse } from "next/server";
import { adminClient, jsonError } from "@/lib/server";
import { kobo, paystack } from "@/lib/paystack";

// POST { id } -- called by the database when a refund is queued (and again by the 5-minute job if it
// failed). It carries no secret: the refund is re-read and claimed atomically, so it's only ever sent
// to Paystack once, and only for the amount the database decided.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as { id?: string };
  if (!/^[0-9a-f-]{36}$/i.test(String(b.id))) return jsonError(400, "bad_id");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  const { data: claim } = await admin.rpc("_refund_claim", { p_id: b.id });
  if (!claim) return NextResponse.json({ ok: true, skipped: true });
  const c = claim as { id: string; amount: number; reference: string };
  const r = await paystack("/refund", { body: { transaction: c.reference, amount: kobo(Number(c.amount)) } });
  // "already refunded" means an earlier try worked: treat it as done.
  const ok = r.ok || /fully refunded|already.*refund/i.test(r.message);
  await admin.rpc("_refund_result", { p_id: c.id, p_ok: ok, p_error: ok ? null : r.message });
  return NextResponse.json({ ok });
}
