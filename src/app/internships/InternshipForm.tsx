"use client";

import { PlaceMultiPick } from "@/components/PlaceFields";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

const ERRORS: Record<string, string> = {
  name_required: "Enter your company name.",
  role_required: "Enter the role, e.g. SIWES Intern, Software.",
  phone_required: "Enter a phone or WhatsApp number we can reach you on.",
  busy: "We're getting a lot of requests right now. Please try again in a few minutes.",
};
const field = "w-full rounded-xl bg-[#F4EFF8] px-4 py-3 text-[14px] outline-none placeholder:text-[#9a8fab]";

/** Companies post an internship / SIWES placement. It goes to the Birdie console for approval. */
export default function InternshipForm() {
  const [f, setF] = useState({ business_name: "", offer: "", category: "", location: "", school: "", website: "", deadline: "", note: "", contact_name: "", phone: "" });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error: err } = await createClient().rpc("submit_business", { p: { kind: "internship", ...f } });
    setBusy(false);
    if (err) return setError(ERRORS[err.message.replace(/^.*?exception:\s*/i, "")] ?? "Couldn't send that. Please try again.");
    setDone(true);
  }

  if (done) return (
    <div className="mt-7 rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-[22px] font-bold">Thanks, {f.contact_name.split(" ")[0] || "we've got it"}</h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[#4a3a5e]">We&apos;ll reach you on {f.phone} to confirm the {f.offer} role, then it goes live for students.</p>
    </div>
  );

  return (
    <form onSubmit={submit} className="mt-7 space-y-3 rounded-3xl bg-white p-5 shadow-sm md:p-6">
      <h2 className="text-[20px] font-bold">Post a placement</h2>
      <input className={field} value={f.business_name} onChange={set("business_name")} placeholder="Company name" required />
      <input className={field} value={f.offer} onChange={set("offer")} placeholder="Role, e.g. SIWES Intern, Software Engineering" required />
      <input className={field} value={f.category} onChange={set("category")} placeholder="Who is it for? e.g. Computer Science, Accounting, any course" />
      <div className="grid gap-3 md:grid-cols-2">
        <input className={field} value={f.location} onChange={set("location")} placeholder="Location, e.g. Lagos, onsite / remote" />
        <PlaceMultiPick kind="school" allowNew max={1} values={f.school ? [f.school] : []} onChange={(v) => setF({ ...f, school: v[0] ?? "" })} placeholder="Only one school? (optional)" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input className={field} value={f.website} onChange={set("website")} placeholder="How to apply: link or email" />
        <label className="block"><span className="mb-1 block text-[12px] text-[#6E6480]">Apply by (optional)</span><input type="date" className={field} value={f.deadline} onChange={set("deadline")} /></label>
      </div>
      <textarea className={`${field} min-h-[100px]`} value={f.note} onChange={set("note")} placeholder="What they'll do, duration, stipend, requirements" />
      <div className="grid gap-3 md:grid-cols-2">
        <input className={field} value={f.contact_name} onChange={set("contact_name")} placeholder="Your name" />
        <input className={field} value={f.phone} onChange={set("phone")} placeholder="Phone / WhatsApp" inputMode="tel" required />
      </div>
      {error && <p role="alert" className="text-[13px] text-[#C2412D]">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-[#1a1024] py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50">{busy ? "Sending..." : "Send"}</button>
      <p className="text-center text-[11.5px] text-[#6E6480]">We check every placement before students see it.</p>
    </form>
  );
}
