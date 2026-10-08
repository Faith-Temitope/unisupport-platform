"use client";

import { useEffect, useState } from "react";

const AMOUNTS = [2000, 5000, 10000, 20000];
const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
const ERRORS: Record<string, string> = {
  amount_out_of_range: "Choose an amount between ₦500 and ₦200,000.",
  name_required: "Enter your name so the student knows who paid.",
  email_invalid: "Enter a valid email for your Paystack receipt.",
  link_not_found: "This link isn't active anymore. Ask the student for a new one.",
  payments_not_configured: "Payments aren't available right now. Please try again later.",
};

export default function PayForm({ token, firstName, school }: { token: string; firstName: string; school: string | null }) {
  const [amount, setAmount] = useState("5000");
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [result, setResult] = useState<{ status: string; amount?: number } | null>(null);
  const n = Math.round(Number(amount) || 0);

  // Back from Paystack: confirm the payment for this link.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref) return;
    window.history.replaceState(null, "", window.location.pathname);
    void fetch(`/api/pay/${token}?reference=${encodeURIComponent(ref)}`).then((r) => r.json()).then((j) => setResult({ status: j.status ?? "error", amount: j.amount })).catch(() => setResult({ status: "error" }));
  }, [token]);

  async function pay() {
    setBusy(true); setError("");
    const r = await fetch(`/api/pay/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: n, payer_name: name, payer_email: email }) });
    const j = await r.json().catch(() => null);
    if (r.ok && j?.authorization_url) { window.location.assign(j.authorization_url); return; }
    setBusy(false); setError(ERRORS[j?.error] ?? "Couldn't start the payment. Please try again.");
  }

  if (result) return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      {result.status === "paid" ? (<>
        <h1 className="text-[22px] font-bold">Thank you</h1>
        <p className="mt-2 text-[14.5px] leading-snug text-[#4a3a5e]">{result.amount ? naira(result.amount) : "Your payment"} is now in {firstName}&apos;s Birdie balance. They&apos;ll see it marked as a top-up from you.</p>
      </>) : result.status === "error" ? (<>
        <h1 className="text-[20px] font-bold">We couldn&apos;t confirm that yet</h1>
        <p className="mt-2 text-[14px] text-[#6E6480]">If you were charged, it will reach {firstName}&apos;s balance shortly. Your Paystack receipt is your proof of payment.</p>
      </>) : (<>
        <h1 className="text-[20px] font-bold">Payment not completed</h1>
        <p className="mt-2 text-[14px] text-[#6E6480]">Nothing was added. You can try again below.</p>
        <button onClick={() => setResult(null)} className="mt-4 w-full rounded-xl bg-[#1a1024] py-3 text-[14px] font-semibold text-white">Try again</button>
      </>)}
    </div>
  );

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="text-[22px] font-bold leading-tight">Pay for {firstName}&apos;s study tools</h1>
      {school && <p className="mt-1 text-[13px] text-[#6E6480]">{firstName} · {school}</p>}
      <p className="mt-3 text-[13.5px] leading-snug text-[#4a3a5e]">This tops up {firstName}&apos;s Birdie balance. It can only be spent inside Birdie: the AI study assistant, Exam Pass, course materials and study services.</p>

      <div className="mt-5 grid grid-cols-4 gap-2">{AMOUNTS.map((a) => (
        <button key={a} onClick={() => setAmount(String(a))} className={`rounded-xl border-2 py-2.5 text-[12.5px] font-bold ${n === a ? "border-[#8b3fa6] bg-[#F1DDF8] text-[#7B2A91]" : "border-[#E6DCF0] text-[#6E6480]"}`}>{naira(a)}</button>
      ))}</div>
      <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="Or enter an amount" className="mt-2 w-full rounded-xl bg-[#F4EFF8] px-4 py-3 text-[14px] outline-none" />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (shown to the student)" className="mt-3 w-full rounded-xl bg-[#F4EFF8] px-4 py-3 text-[14px] outline-none" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Your email (for the receipt)" className="mt-2 w-full rounded-xl bg-[#F4EFF8] px-4 py-3 text-[14px] outline-none" />
      {error && <p role="alert" className="mt-3 text-[13px] text-[#C2412D]">{error}</p>}
      <button disabled={busy || n < 500 || !name.trim() || !email.trim()} onClick={() => void pay()} className="mt-4 w-full rounded-xl bg-[#1a1024] py-3.5 text-[14.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-40">{busy ? "Opening Paystack..." : `Pay ${naira(n)} with Paystack`}</button>
      <p className="mt-3 text-center text-[11.5px] text-[#6E6480]">Secure payment by Paystack. You don&apos;t need a Birdie account.</p>
    </div>
  );
}
