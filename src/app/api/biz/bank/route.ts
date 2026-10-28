import { NextResponse } from "next/server";
import { adminClient, currentUser, jsonError } from "@/lib/server";
import { namesMatch, paystack } from "@/lib/paystack";

// GET  -> { banks: [{ name, code }] }
// POST { oa, bank_code, account_number } -> the business's payout account. Paystack looks up the
// account name; it has to match the business name or the owner's checked ID name. Then the business
// gets (or updates) its Paystack subaccount, so its share of every order settles straight to that bank.
let banks: { at: number; list: { name: string; code: string }[] } | null = null;

export async function GET() {
  if (!banks || Date.now() - banks.at > 24 * 3600e3) {
    const r = await paystack<{ name: string; code: string; active: boolean }[]>("/bank?country=nigeria&perPage=200");
    if (!r.ok || !r.data) return jsonError(502, r.message);
    banks = { at: Date.now(), list: r.data.filter((x) => x.active !== false).map((x) => ({ name: x.name, code: x.code })) };
  }
  return NextResponse.json({ banks: banks.list });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as { oa?: string; bank_code?: string; account_number?: string };
  const { user, sb } = await currentUser();
  if (!user) return jsonError(401, "sign_in_required");
  if (!/^[0-9a-f-]{36}$/i.test(String(b.oa)) || !/^\d{10}$/.test(String(b.account_number)) || !/^[0-9A-Za-z]{3,10}$/.test(String(b.bank_code))) return jsonError(400, "bad_request");
  const { data: home, error } = await sb.rpc("biz_home", { p_oa: b.oa });
  if (error || !home || !["owner"].includes(String(home.role))) return jsonError(403, "owner_only");
  if (home.is_test) return jsonError(400, "test_business");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");

  const look = await paystack<{ account_name: string }>(`/bank/resolve?account_number=${b.account_number}&bank_code=${b.bank_code}`);
  if (!look.ok || !look.data?.account_name) return jsonError(400, "account_not_found");
  const accountName = look.data.account_name;
  const { data: oa } = await admin.from("official_accounts").select("name, owner_check, subaccount_code").eq("id", b.oa).single();
  const idName = String((oa?.owner_check as { name_on_id?: string } | null)?.name_on_id ?? "");
  if (!namesMatch(accountName, String(oa?.name ?? "")) && !namesMatch(accountName, idName)) return jsonError(400, "name_mismatch", { account_name: accountName });

  const bankName = banks?.list.find((x) => x.code === b.bank_code)?.name ?? null;
  const body = { business_name: String(oa?.name ?? "Birdie business").slice(0, 100), settlement_bank: b.bank_code, account_number: b.account_number, percentage_charge: 5, description: `Birdie business ${b.oa}` };
  const r = oa?.subaccount_code && oa.subaccount_code !== "TEST"
    ? await paystack<{ subaccount_code: string }>(`/subaccount/${oa.subaccount_code}`, { method: "PUT", body })
    : await paystack<{ subaccount_code: string }>("/subaccount", { body });
  if (!r.ok || !r.data?.subaccount_code) return jsonError(502, r.message);
  await admin.rpc("_biz_bank_set", { p_oa: b.oa, p_bank: { bank_code: b.bank_code, bank_name: bankName, account_name: accountName, last4: String(b.account_number).slice(-4) }, p_subaccount: r.data.subaccount_code });
  return NextResponse.json({ ok: true, account_name: accountName });
}
