import { createClient as createAdmin } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { NextResponse } from "next/server";

// POST /api/wallet/topup/webhook — Paystack's server calls this directly (no student session).
// Authenticity comes only from the x-paystack-signature header, an HMAC-SHA512 of the raw body
// with the secret key. Never trust the body before that check passes.
export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !serviceKey) return NextResponse.json({ error: "payments_not_configured" }, { status: 501 });

  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature");
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (!sig || sig !== expected) return NextResponse.json({ error: "bad_signature" }, { status: 401 });

  const evt = JSON.parse(raw) as { event?: string; data?: { reference?: string; amount?: number; status?: string } };
  if (evt.event !== "charge.success" || !evt.data?.reference) return NextResponse.json({ ok: true });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } });
  const { data: t } = await admin.from("topups").select("amount").eq("reference", evt.data.reference).maybeSingle();
  if (!t || Math.round(Number(t.amount) * 100) !== evt.data.amount) return NextResponse.json({ ok: true }); // unknown or mismatched, ignore

  const { error } = await admin.rpc("credit_topup", { p_ref: evt.data.reference, p_amount: t.amount });
  if (error) console.error("credit_topup (webhook) failed", error.message);
  return NextResponse.json({ ok: true });
}
