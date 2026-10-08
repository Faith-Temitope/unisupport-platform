"use client";

import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { COUNTRIES, REGIONS } from "./places";
import { useApp } from "./store";
import { Sheet } from "./ui";

type School = { id: string; name: string; state: string | null; pending: boolean };

/** A field that opens a searchable list. Optionally lets you add something that isn't listed. */
function PickField({ label, value, placeholder, options, onChange, onAdd, addLabel, loading, onQuery }: {
  label: string; value: string; placeholder: string; options: { value: string; hint?: string }[]; onChange: (v: string) => void;
  onAdd?: (typed: string) => void; addLabel?: (typed: string) => string; loading?: boolean; onQuery?: (q: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const shown = options.filter((o) => !q.trim() || o.value.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 200);
  const exact = options.some((o) => o.value.toLowerCase() === q.trim().toLowerCase());
  return (
    <>
      <button type="button" onClick={() => { setQ(""); setOpen(true); }} className="flex w-full items-center justify-between gap-2 rounded-2xl border border-[var(--line)] bg-white px-4 py-3.5 text-left text-[14.5px]">
        <span className={value ? "text-[var(--text)]" : "text-[#a99fb8]"}>{value || placeholder}</span><ChevronDown size={16} className="shrink-0 text-[var(--dim)]" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[var(--paper-dim)] px-3.5 py-3"><Search size={16} className="text-[var(--dim)]" /><input autoFocus value={q} onChange={(e) => { setQ(e.target.value); onQuery?.(e.target.value); }} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" /></div>
        <div className="max-h-[46vh] space-y-1 overflow-y-auto">
          {loading && <div className="py-3 text-center text-[12.5px] text-[var(--dim)]">Loading...</div>}
          {shown.map((o) => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }} className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[14px] ${o.value === value ? "bg-[var(--birdie-soft)] font-semibold" : "active:bg-[var(--paper-dim)]"}`}>
              <span className="min-w-0">{o.value}{o.hint && <span className="ml-1.5 text-[11.5px] text-[var(--dim)]">{o.hint}</span>}</span>{o.value === value && <Check size={15} className="shrink-0 text-[var(--birdie)]" />}
            </button>
          ))}
          {!loading && shown.length === 0 && !onAdd && <div className="py-3 text-center text-[12.5px] text-[var(--dim)]">Nothing matches.</div>}
          {onAdd && q.trim().length >= 3 && !exact && (
            <button onClick={() => { onAdd(q.trim()); setOpen(false); }} className="flex w-full items-center gap-2 rounded-xl bg-[var(--paper-dim)] px-3 py-3 text-left text-[13.5px] font-semibold"><Plus size={15} className="shrink-0 text-[var(--birdie)]" />{addLabel ? addLabel(q.trim()) : `Add "${q.trim()}"`}</button>
          )}
        </div>
      </Sheet>
    </>
  );
}

export function CountryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <PickField label="Country" value={value} placeholder="Country" options={COUNTRIES.map((c) => ({ value: c }))} onChange={onChange} onAdd={(t) => onChange(t)} addLabel={(t) => `Use "${t}"`} />;
}

export function RegionPicker({ country, value, onChange }: { country: string; value: string; onChange: (v: string) => void }) {
  const list = REGIONS[country];
  return <PickField label={country === "Nigeria" ? "State" : "State or region"} value={value} placeholder={country === "Nigeria" ? "State" : "State or region"} options={(list ?? []).map((r) => ({ value: r }))} onChange={onChange} onAdd={(t) => onChange(t)} addLabel={(t) => `Use "${t}"`} />;
}

/** Schools come from Birdie's shared list. If yours is missing, add it: you can use it straight away and the team approves it for everyone. */
export function SchoolPicker({ country, region, value, onChange }: { country: string; region?: string; value: string; onChange: (v: string) => void }) {
  const { flash, auth } = useApp();
  const [schools, setSchools] = useState<School[] | null>(null);
  useEffect(() => {
    void createClient().rpc("list_schools", { p_country: country || null, p_q: "" }).then(({ data }) => setSchools((data ?? []) as School[]));
  }, [country]);
  // Schools in your state first.
  const sorted = [...(schools ?? [])].sort((a, b) => Number(b.state === region) - Number(a.state === region) || a.name.localeCompare(b.name));
  async function add(name: string) {
    if (auth.status !== "in") { onChange(name); return; }
    const { error } = await createClient().rpc("suggest_school", { p_name: name, p_country: country || null, p_state: region || null });
    onChange(name);
    flash(error ? "Saved on your profile" : "Added. The Birdie team will check it for everyone.");
  }
  return <PickField label="School" value={value} placeholder="School" loading={schools === null} options={sorted.map((s) => ({ value: s.name, hint: s.pending ? "(waiting for approval)" : s.state ?? undefined }))} onChange={onChange} onAdd={(t) => void add(t)} addLabel={(t) => `My school isn't listed: add "${t}"`} />;
}
