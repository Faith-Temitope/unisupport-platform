"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

export const CATEGORY_PRESETS = ["Past Questions", "Assignments", "Tests"];

/** Preset chips plus a free-text "Custom" option, so students can file things however their
 * course is actually organised. `base` is the default for the item type ("Notes" / "Materials"). */
export function CategoryPicker({ value, onChange, base }: { value: string; onChange: (v: string) => void; base: string }) {
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState("");
  const options = [base, ...CATEGORY_PRESETS];
  if (value && !options.includes(value)) options.push(value);
  const chip = (on: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-95 ${on ? "bg-[var(--study)] text-white" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`;
  return (
    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
      {options.map((o) => (<button key={o} type="button" onClick={() => { onChange(o); setCustom(false); }} className={chip(value === o)}>{o}</button>))}
      {custom ? (
        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => setCustom(false)}
          onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { onChange(draft.trim()); setDraft(""); setCustom(false); } }}
          placeholder="Name it, press Enter" className="w-36 shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] outline-none ring-1 ring-[var(--study)]" />
      ) : (
        <button type="button" onClick={() => setCustom(true)} className={`${chip(false)} flex items-center gap-1`}><Plus size={12} /> Custom</button>
      )}
    </div>
  );
}

export function CategoryPill({ category }: { category?: string }) {
  if (!category) return null;
  return <span className="inline-block rounded-full bg-[var(--study-soft)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--study)]">{category}</span>;
}

/** Filter chips for a list -- only shown when the list actually has more than one category. */
export function CategoryFilter({ items, base, value, onChange }: { items: { category?: string }[]; base: string; value: string; onChange: (v: string) => void }) {
  const cats = Array.from(new Set(items.map((i) => i.category || base)));
  if (cats.length < 2) return null;
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
      {["All", ...cats].map((c) => (<button key={c} onClick={() => onChange(c)} className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ${value === c ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-white text-[var(--dim)] ring-1 ring-[var(--line)]"}`}>{c}</button>))}
    </div>
  );
}
