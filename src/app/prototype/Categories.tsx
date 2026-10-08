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

/** One row that is both the filter and where new items go: pick "Past Questions" and you see only
 * past questions, and anything you add from there is filed as one. "All" adds under `base`. */
export function CategoryTabs({ items, base, value, onChange, allowCustom }: { items: { category?: string }[]; base: string; value: string; onChange: (v: string) => void; allowCustom: boolean }) {
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState("");
  const count = (c: string) => (c === "All" ? items.length : items.filter((i) => (i.category || base) === c).length);
  const options = ["All", base, ...CATEGORY_PRESETS];
  for (const i of items) if (i.category && !options.includes(i.category)) options.push(i.category);
  if (value && !options.includes(value)) options.push(value);
  return (
    <div className="no-scrollbar -mx-5 flex items-center gap-1.5 overflow-x-auto px-5 pb-1">
      {options.map((c) => { const n = count(c); return (
        <button key={c} onClick={() => onChange(c)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-95 ${value === c ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-white text-[var(--dim)] ring-1 ring-[var(--line)]"}`}>{c}{n > 0 ? ` ${n}` : ""}</button>
      ); })}
      {allowCustom && (custom ? (
        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => setCustom(false)}
          onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { onChange(draft.trim()); setDraft(""); setCustom(false); } }}
          placeholder="Name it, press Enter" className="w-36 shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] outline-none ring-1 ring-[var(--study)]" />
      ) : (
        <button onClick={() => setCustom(true)} className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--paper-dim)] px-3 py-1.5 text-[12px] font-semibold text-[var(--dim)]"><Plus size={12} /> New category</button>
      ))}
    </div>
  );
}
