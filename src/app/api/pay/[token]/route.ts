import { createClient as createAdmin } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Parent top-up for a student's private pay link (/pay/<token>). No account needed for the payer.
//   POST { amount, payer_name, payer_email } -> Paystack checkout into the student's wallet
//   GET  ?reference=...                      -> confirm on return from Paystack (idempotent)
// The credit itself is the same credit_topup() the student's own top-ups and the webhook use.
const err = (status: number, error: string) => NextResponse.json({ error }, { status });
const admin = () => createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function studentFor(token: string): Promise<string | null> {
  if (!/^[a-f0-9]{16}$/.test(token)) return null;
  const { data } = await admin().from("topup_links").select("user_id").eq("token", token).maybeSingle();
  return (data?.user_id as string) ?? null;
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let body: { amount?: number; payer_name?: string; payer_email?: string };
  try { body = await req.json(); } catch { return err(400, "invalid_json"); }
  const amount = Math.round(Number(body.amount));
  const name = (body.payer_name ?? "").trim().slice(0, 60);
  const email = (body.payer_email ?? "").trim().toLowerCase();
  if (!Number.isFinite(amount) || amount < 500 || amount > 200000) return err(400, "amount_out_of_range");
  if (!name) return err(400, "name_required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return err(400, "email_invalid");

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !process.env.SUPABASE_SERVICE_ROLE_KEY) return err(501, "payments_not_configured");
  const studentId = await studentFor(token);
  if (!studentId) return err(404, "link_not_found");

  const reference = `birdie_gift_${studentId.slice(0, 8)}_${Date.now()}`;
  const { error: dbError } = await admin().from("topups").insert({ reference, user_id: studentId, amount, payer_name: name, payer_email: email });
  if (dbError) return err(500, "could_not_start_payment");

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const r = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, amount: amount * 100, reference, currency: "NGN", callback_url: `${origin}/pay/${token}?ref=${reference}`, metadata: { kind: "parent_topup" } }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.status) { await admin().from("topups").update({ status: "failed" }).eq("reference", reference); return err(502, j?.message ?? "paystack_error"); }
  return NextResponse.json({ authorization_url: j.data.authorization_url as string });
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reference = new URL(req.url).searchParams.get("reference");
  if (!reference) return err(400, "reference_required");
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !process.env.SUPABASE_SERVICE_ROLE_KEY) return err(501, "payments_not_configured");
  const studentId = await studentFor(token);
  const { data: t } = await admin().from("topups").select("user_id,amount,status,payer_email").eq("reference", reference).maybeSingle();
  // Only gift payments made through this exact link can be confirmed here.
  if (!studentId || !t || t.user_id !== studentId || !t.payer_email) return err(404, "not_found");
  if (t.status === "paid") return NextResponse.json({ status: "paid", amount: Number(t.amount) });

  const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` } });
  const j = await r.json().catch(() => null);
  const paid = j?.status && j.data?.status === "success" && Number(j.data.amount) === Math.round(Number(t.amount) * 100);
  if (!paid) { if (j?.data?.status === "failed") await admin().from("topups").update({ status: "failed" }).eq("reference", reference); return NextResponse.json({ status: j?.data?.status ?? "pending" }); }
  const { error } = await admin().rpc("credit_topup", { p_ref: reference, p_amount: t.amount });
  if (error) return err(500, "credit_failed");
  return NextResponse.json({ status: "paid", amount: Number(t.amount) });
}
