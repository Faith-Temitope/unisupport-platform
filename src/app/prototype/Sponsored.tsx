"use client";

/* eslint-disable @next/next/no-img-element -- sponsor logos are arbitrary https URLs, not local assets */
import { Briefcase, Calendar, Copy, ExternalLink, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cleanUrl } from "./live/socialData";
import { fetchPlacements, logPlacement, type Placement, type PlacementKind, type Surface } from "./live/sponsorData";
import { useApp } from "./store";

export function usePlacements(kind: PlacementKind, surface?: Surface, enabled = true) {
  const { auth } = useApp();
  const [items, setItems] = useState<Placement[]>([]);
  useEffect(() => {
    if (!enabled || auth.status !== "in") return;
    let dead = false;
    void fetchPlacements(kind, surface).then((d) => { if (!dead) setItems(d); });
    return () => { dead = true; };
  }, [kind, surface, enabled, auth.status]);
  return items;
}

/** Counts a view once the placement is actually on screen (at least half visible), not just mounted. */
function useViewLog(id: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let done = false;
    const io = new IntersectionObserver((es) => { if (!done && es.some((e) => e.isIntersecting)) { done = true; logPlacement(id, "view"); io.disconnect(); } }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [id]);
  return ref;
}

function open(p: Placement) {
  logPlacement(p.id, "click");
  const u = p.url ? cleanUrl(p.url) : null;
  if (u) window.open(u, "_blank", "noopener,noreferrer");
}

function CodeChip({ code }: { code: string }) {
  const { flash } = useApp();
  return (
    <button onClick={(e) => { e.stopPropagation(); void navigator.clipboard.writeText(code); flash(`Code ${code} copied`); }} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--study)] bg-[var(--study-soft)] px-2 py-1 font-mono text-[12px] font-bold text-[var(--study)]">
      <Copy size={12} /> {code}
    </button>
  );
}

export const SponsoredLabel = ({ name }: { name: string }) => <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--dim)]">Sponsored · {name}</div>;

/** Generic card: deals, sponsored cards in Birdie/Explore/end of video. */
export function SponsoredCard({ p, dark }: { p: Placement; dark?: boolean }) {
  const ref = useViewLog(p.id);
  return (
    <div ref={ref} className={`rounded-2xl p-3.5 ${dark ? "bg-white/95 text-[var(--text)]" : "border border-[var(--line)] bg-white"}`}>
      <SponsoredLabel name={p.sponsor_name} />
      <div className="mt-2 flex gap-3">
        {p.image_url && <img src={p.image_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />}
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold leading-snug text-[var(--text)]">{p.title}</div>
          {p.body && <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--dim)]">{p.body}</p>}
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {p.discount_code && <CodeChip code={p.discount_code} />}
        {p.url && <button onClick={() => open(p)} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--ink)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--paper)] active:scale-95">{p.cta_label} <ExternalLink size={12} /></button>}
      </div>
    </div>
  );
}

/** Compact tile for the "Near campus" strip. */
function CampusTile({ p }: { p: Placement }) {
  const ref = useViewLog(p.id);
  return (
    <div ref={ref} className="w-56 shrink-0 rounded-2xl border border-[var(--line)] bg-white p-3">
      <div className="flex items-center gap-2.5">
        {p.image_url ? <img src={p.image_url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--study-soft)] text-[var(--study)]"><MapPin size={17} /></div>}
        <div className="min-w-0"><div className="truncate text-[13.5px] font-bold">{p.sponsor_name}</div><div className="truncate text-[11.5px] text-[var(--dim)]">{p.location || "Near campus"}</div></div>
      </div>
      <div className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-[var(--text)]">{p.title}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {p.discount_code && <CodeChip code={p.discount_code} />}
        {p.url && <button onClick={() => open(p)} className="text-[12px] font-bold text-[var(--study)]">{p.cta_label} ›</button>}
      </div>
      <div className="mt-1.5 text-[10px] uppercase tracking-wider text-[var(--dim)]">Sponsored</div>
    </div>
  );
}

export function CampusStrip({ items }: { items: Placement[] }) {
  if (!items.length) return null;
  return <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">{items.map((p) => <CampusTile key={p.id} p={p} />)}</div>;
}

export function InternshipCard({ p }: { p: Placement }) {
  const ref = useViewLog(p.id);
  return (
    <div ref={ref} className="rounded-2xl border border-[var(--line)] bg-white p-3.5">
      <div className="flex gap-3">
        {p.image_url ? <img src={p.image_url} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--uni-soft)] text-[var(--uni-deep)]"><Briefcase size={18} /></div>}
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold leading-snug">{p.title}</div>
          <div className="text-[12px] text-[var(--dim)]">{p.company || p.sponsor_name}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-[var(--dim)]">
            {p.location && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {p.location}</span>}
            {p.deadline && <span className="inline-flex items-center gap-1"><Calendar size={11} /> Apply by {new Date(p.deadline).toLocaleDateString([], { day: "numeric", month: "short" })}</span>}
          </div>
        </div>
      </div>
      {p.body && <p className="mt-2 whitespace-pre-line text-[12.5px] leading-snug text-[var(--text)]">{p.body}</p>}
      {p.url && <button onClick={() => open(p)} className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-[var(--uni)] px-3.5 py-2 text-[12.5px] font-bold text-white active:scale-95">{p.cta_label === "Learn more" ? "Apply" : p.cta_label} <ExternalLink size={12} /></button>}
    </div>
  );
}
