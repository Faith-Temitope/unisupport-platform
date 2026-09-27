import { createClient as createAdmin } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

// POST /api/wallet/topup { amount } -> Paystack checkout link for the signed-in student's own balance.
// The actual credit happens in /api/wallet/topup/webhook once Paystack confirms payment, never here.
const err = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  let body: { amount?: number };
  try { body = await req.json(); } catch { return err(400, "invalid_json"); }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 500 || amount > 500000) return err(400, "amount_out_of_range");

  const store = await cookies();
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: () => {} },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !user.email) return err(401, "sign_in_required");

  const secret = process.env.PAYSTACK_SECRET_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !serviceKey) return err(501, "payments_not_configured");
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } });

  const reference = `birdie_${user.id.slice(0, 8)}_${Date.now()}`;
  const { error: dbError } = await admin.from("topups").insert({ reference, user_id: user.id, amount });
  if (dbError) return err(500, "could_not_start_topup");

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const r = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, amount: Math.round(amount * 100), reference, currency: "NGN", callback_url: `${origin}/prototype?topup=${reference}` }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.status) { await admin.from("topups").update({ status: "failed" }).eq("reference", reference); return err(502, j?.message ?? "paystack_error"); }

  return NextResponse.json({ reference, authorization_url: j.data.authorization_url as string });
}
