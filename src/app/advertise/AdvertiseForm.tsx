"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

const CATEGORIES = ["Food", "Printing", "Hostels", "Repairs", "Fashion & laundry", "Transport", "Data & gadgets", "Other"];
const ERRORS: Record<string, string> = {
  name_required: "Enter your business name.",
  phone_required: "Enter a phone or WhatsApp number we can reach you on.",
  busy: "We're getting a lot of requests right now. Please try again in a few minutes.",
};
const field = "w-full rounded-xl bg-[#F4EFF8] px-4 py-3 text-[14px] outline-none placeholder:text-[#9a8fab]";

export default function AdvertiseForm() {
  const [f, setF] = useState({ business_name: "", category: "Food", school: "", location: "", phone: "", contact_name: "", offer: "", discount_code: "", website: "", note: "" });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error: err } = await createClient().rpc("submit_business", { p: { kind: "business", ...f } });
    setBusy(false);
    if (err) return setError(ERRORS[err.message.replace(/^.*?exception:\s*/i, "")] ?? "Couldn't send that. Please try again.");
    setDone(true);
  }

  if (done) return (
    <div className="mt-7 rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-[22px] font-bold">Thanks, {f.contact_name.split(" ")[0] || "we've got it"}</h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[#4a3a5e]">We&apos;ll reach you on {f.phone} to set up {f.business_name} on Birdie.</p>
    </div>
  );

  return (
    <form onSubmit={submit} className="mt-7 space-y-3 rounded-3xl bg-white p-5 shadow-sm md:p-6">
      <h2 className="text-[20px] font-bold">List your business</h2>
      <input className={field} value={f.business_name} onChange={set("business_name")} placeholder="Business name" required />
      <div className="flex flex-wrap gap-1.5">{CATEGORIES.map((c) => (<button type="button" key={c} onClick={() => setF({ ...f, category: c })} className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${f.category === c ? "bg-[#1a1024] text-white" : "bg-[#F4EFF8] text-[#6E6480]"}`}>{c}</button>))}</div>
      <input className={field} value={f.school} onChange={set("school")} placeholder="Which school are you near? e.g. UNILAG, FUL" />
      <input className={field} value={f.location} onChange={set("location")} placeholder="Where exactly? e.g. opposite the main gate" />
      <div className="grid gap-3 md:grid-cols-2">
        <input className={field} value={f.contact_name} onChange={set("contact_name")} placeholder="Your name" />
        <input className={field} value={f.phone} onChange={set("phone")} placeholder="Phone / WhatsApp" inputMode="tel" required />
      </div>
      <input className={field} value={f.offer} onChange={set("offer")} placeholder="Student offer, e.g. 10% off with your student ID" />
      <div className="grid gap-3 md:grid-cols-2">
        <input className={field} value={f.discount_code} onChange={set("discount_code")} placeholder="Discount code (optional)" />
        <input className={field} value={f.website} onChange={set("website")} placeholder="Instagram or website (optional)" />
      </div>
      <textarea className={`${field} min-h-[80px]`} value={f.note} onChange={set("note")} placeholder="Anything else? Opening hours, delivery, questions for us" />
      {error && <p role="alert" className="text-[13px] text-[#C2412D]">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-[#1a1024] py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50">{busy ? "Sending..." : "Send"}</button>
      <p className="text-center text-[11.5px] text-[#6E6480]">No payment now. We&apos;ll call you to agree the details first.</p>
    </form>
  );
}
