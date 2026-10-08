"use client";

import { Lightbulb, Store } from "lucide-react";
import { useState } from "react";
import { CAMPUS_CATEGORIES, DEAL_CATEGORIES, submitBusiness, type Placement } from "./live/sponsorData";
import { CampusStrip, SponsoredCard } from "./Sponsored";
import { useApp } from "./store";
import { Btn, Sheet, TextField } from "./ui";

function Chips({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  if (options.length < 2) return null;
  return (
    <div className="no-scrollbar -mx-5 mb-2 flex gap-1.5 overflow-x-auto px-5">
      {["All", ...options].map((c) => (<button key={c} onClick={() => onChange(c)} className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ${value === c ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-white text-[var(--dim)] ring-1 ring-[var(--line)]"}`}>{c}</button>))}
    </div>
  );
}

/** Explore > Campus & deals: what's near your school, student deals, and the ways in for businesses. */
export function CampusDeals({ campus, deals }: { campus: Placement[]; deals: Placement[] }) {
  const { profile, flash } = useApp();
  const [cc, setCc] = useState("All"); const [dc, setDc] = useState("All");
  const [suggest, setSuggest] = useState(false);
  const [f, setF] = useState({ business_name: "", category: "Food", location: "", phone: "", note: "" });
  const [busy, setBusy] = useState(false);
  const campusCats = CAMPUS_CATEGORIES.filter((c) => campus.some((p) => p.category === c));
  const dealCats = DEAL_CATEGORIES.filter((c) => deals.some((p) => p.category === c));
  const shownCampus = cc === "All" ? campus : campus.filter((p) => p.category === cc);
  const shownDeals = dc === "All" ? deals : deals.filter((p) => p.category === dc);

  async function send() {
    setBusy(true);
    const err = await submitBusiness({ kind: "suggestion", ...f, school: profile.institution || undefined });
    setBusy(false);
    if (err) return flash(err === "too_many" ? "Thanks! You've sent a lot today. Try again tomorrow." : "Couldn't send that. Try again.");
    flash("Thanks! We'll reach out to them."); setSuggest(false); setF({ business_name: "", category: "Food", location: "", phone: "", note: "" });
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Near your campus{profile.institution ? ` · ${profile.institution}` : ""}</span></div>
        <Chips value={cc} onChange={setCc} options={campusCats} />
        {shownCampus.length ? <CampusStrip items={shownCampus} /> : <p className="text-[13px] leading-snug text-[var(--dim)]">{profile.institution ? "No spots listed near your school yet. Tell us the ones you use and we'll get them on." : "Add your school in Settings > Edit profile to see food spots, printers, hostels and repair shops near you."}</p>}
      </div>

      <div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Student deals</div>
        <Chips value={dc} onChange={setDc} options={dealCats} />
        {shownDeals.length ? <div className="space-y-3">{shownDeals.map((d) => <SponsoredCard key={d.id} p={d} />)}</div> : <p className="text-[13px] text-[var(--dim)]">Discounts on laptops, data, food and gadgets for students will show up here.</p>}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={() => setSuggest(true)} className="rounded-2xl bg-[var(--study-soft)] p-3.5 text-left active:scale-[0.98]"><Lightbulb size={20} className="text-[var(--study)]" /><div className="mt-1.5 text-[13.5px] font-bold">Suggest a place</div><div className="text-[11.5px] leading-snug text-[var(--dim)]">A spot you love near campus that should be here</div></button>
        <a href="/advertise" target="_blank" rel="noopener noreferrer" className="rounded-2xl bg-[var(--paper-dim)] p-3.5 text-left active:scale-[0.98]"><Store size={20} className="text-[var(--ink)]" /><div className="mt-1.5 text-[13.5px] font-bold">Own a business?</div><div className="text-[11.5px] leading-snug text-[var(--dim)]">Reach students at your nearest school</div></a>
      </div>

      <Sheet open={suggest} onClose={() => setSuggest(false)} title="Suggest a place">
        <div className="space-y-3">
          <p className="text-[13px] leading-snug text-[var(--dim)]">Where do you eat, print, fix your phone? Tell us and we&apos;ll ask them to list a student deal here.</p>
          <TextField value={f.business_name} onChange={(v) => setF({ ...f, business_name: v })} placeholder="Business name" />
          <div className="flex flex-wrap gap-1.5">{CAMPUS_CATEGORIES.map((c) => (<button key={c} onClick={() => setF({ ...f, category: c })} className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${f.category === c ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{c}</button>))}</div>
          <TextField value={f.location} onChange={(v) => setF({ ...f, location: v })} placeholder="Where is it? e.g. opposite the main gate" />
          <TextField value={f.phone} onChange={(v) => setF({ ...f, phone: v })} placeholder="Their phone number, if you know it" />
          <TextField multiline value={f.note} onChange={(v) => setF({ ...f, note: v })} placeholder="Why students love it (optional)" />
          <Btn variant="study" disabled={busy || f.business_name.trim().length < 2} onClick={() => void send()}>{busy ? "Sending..." : "Send suggestion"}</Btn>
        </div>
      </Sheet>
    </div>
  );
}
