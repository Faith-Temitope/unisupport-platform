import { createClient as createAdmin } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// GET /api/wallet/topup/verify?reference=... -> called from the Paystack return page so the balance
// updates immediately even if the webhook is slow. credit_topup() is idempotent, so this is safe
// alongside the webhook crediting the same reference.
const err = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get("reference");
  if (!reference) return err(400, "reference_required");

  const store = await cookies();
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: () => {} },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return err(401, "sign_in_required");

  const secret = process.env.PAYSTACK_SECRET_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !serviceKey) return err(501, "payments_not_configured");
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } });

  const { data: t } = await admin.from("topups").select("user_id,amount,status").eq("reference", reference).maybeSingle();
  if (!t || t.user_id !== user.id) return err(404, "not_found");
  if (t.status === "paid") return NextResponse.json({ status: "paid" });

  const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` } });
  const j = await r.json().catch(() => null);
  const paid = j?.status && j.data?.status === "success" && Number(j.data.amount) === Math.round(Number(t.amount) * 100);
  if (!paid) { if (j?.data?.status === "failed") await admin.from("topups").update({ status: "failed" }).eq("reference", reference); return NextResponse.json({ status: j?.data?.status ?? "pending" }); }

  const { error } = await admin.rpc("credit_topup", { p_ref: reference, p_amount: t.amount });
  if (error) return err(500, "credit_failed");
  return NextResponse.json({ status: "paid" });
}
