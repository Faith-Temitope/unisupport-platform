// Paystack calls used by Birdie for Business: checkout (with the split to a business's subaccount),
// verifying a payment, refunds, the bank list, account-name lookup and subaccounts.
// The secret key only ever lives on the server.
type Json = Record<string, unknown>;

export async function paystack<T = Json>(path: string, init?: { method?: string; body?: Json }): Promise<{ ok: boolean; data: T | null; message: string }> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return { ok: false, data: null, message: "payments_not_configured" };
  try {
    const r = await fetch(`https://api.paystack.co${path}`, {
      method: init?.method ?? (init?.body ? "POST" : "GET"),
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    const j = await r.json().catch(() => null) as { status?: boolean; message?: string; data?: T } | null;
    return { ok: r.ok && !!j?.status, data: (j?.data ?? null) as T | null, message: j?.message ?? `paystack_${r.status}` };
  } catch {
    return { ok: false, data: null, message: "paystack_unreachable" };
  }
}

export const kobo = (naira: number) => Math.round(naira * 100);

/** Loose name match for bank account names ("ADEBAYO TUNDE O" vs "Tunde Adebayo"): any shared word of 3+ letters. */
export function namesMatch(a: string, b: string) {
  const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !["ltd", "limited", "enterprise", "enterprises", "ventures", "nigeria", "the", "and", "services"].includes(w)));
  const x = words(a), y = words(b);
  return [...x].some((w) => y.has(w));
}
