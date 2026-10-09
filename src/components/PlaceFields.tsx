"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { COUNTRIES, REGIONS, canonical, sameSchool, schoolMatches } from "@/app/prototype/places";

type Kind = "country" | "region" | "school";
const ALL_REGIONS = Array.from(new Set(Object.values(REGIONS).flat())).sort();
let schoolCache: Promise<string[]> | null = null;
const loadSchools = () => (schoolCache ??= Promise.resolve(createClient().rpc("list_schools", { p_country: null, p_q: "" })).then(({ data }) => ((data ?? []) as { name: string }[]).map((x) => x.name)).catch(() => []));

/**
 * Pick countries, states or schools from Birdie's lists (with acronym-aware search), so ads,
 * internships, print shops and course limits match students' profiles exactly. `max={1}` for a
 * single value. With `allowNew`, a school that isn't listed can still be entered (tidied up).
 */
export function PlaceMultiPick({ kind, values, onChange, max, allowNew, placeholder, className = "" }: {
  kind: Kind; values: string[]; onChange: (v: string[]) => void; max?: number; allowNew?: boolean; placeholder?: string; className?: string;
}) {
  const [schools, setSchools] = useState<string[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { if (kind === "school") void loadSchools().then(setSchools); }, [kind]);
  const list = kind === "country" ? COUNTRIES : kind === "region" ? ALL_REGIONS : schools;
  const hits = useMemo(() => {
    const t = q.trim(); if (!t) return [];
    const f = kind === "school" ? list.filter((n) => schoolMatches(n, t)) : list.filter((n) => n.toLowerCase().includes(t.toLowerCase()));
    return f.filter((n) => !values.includes(n)).slice(0, 8);
  }, [q, list, kind, values]);
  const full = max !== undefined && values.length >= max;

  function add(v: string) {
    if (!v || values.includes(v)) { setQ(""); return; }
    onChange(max === 1 ? [v] : [...values, v]); setQ("");
  }
  function addTyped() {
    const t = q.trim(); if (!t) return;
    const known = kind === "school" ? sameSchool(t, list) : canonical(t, list);
    if (known) return add(known);
    if (hits[0]) return add(hits[0]);
    if (allowNew && kind === "school") add(t.replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  }

  return (
    <div className={className}>
      {values.length > 0 && <div className="mb-1.5 flex flex-wrap gap-1.5">{values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-full bg-[#F5E8FA] px-2.5 py-1 text-[12.5px] font-semibold text-[#6E2A80]">{v}<button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`}><X size={12} /></button></span>
      ))}</div>}
      {!full && (
        <div className="relative">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTyped(); } }}
            placeholder={placeholder ?? (kind === "country" ? "Type a country" : kind === "region" ? "Type a state or region" : "Type a school, e.g. UNILAG or FUL")}
            className="w-full rounded-xl border-2 border-[#E6DCF0] bg-white px-3 py-2 text-[13.5px] outline-none focus:border-[#8b3fa6]" />
          {q.trim() && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[#E6DCF0] bg-white shadow-lg">
              {hits.map((h) => <button type="button" key={h} onClick={() => add(h)} className="block w-full px-3 py-2 text-left text-[13.5px] hover:bg-[#F8F4FB]">{h}</button>)}
              {hits.length === 0 && (allowNew && kind === "school"
                ? <button type="button" onClick={addTyped} className="block w-full px-3 py-2 text-left text-[13px] text-[#6E6480]">Not on the list. Use &quot;{q.trim()}&quot;</button>
                : <div className="px-3 py-2 text-[13px] text-[#6E6480]">Nothing matches. Check the spelling.</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
