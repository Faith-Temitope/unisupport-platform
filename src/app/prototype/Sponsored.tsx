"use client";

/* eslint-disable @next/next/no-img-element -- sponsor logos are arbitrary https URLs, not local assets */
import { Briefcase, Calendar, Copy, ExternalLink, FileText, MapPin, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cleanUrl } from "./live/socialData";
import { fetchPlacements, logPlacement, type Placement, type PlacementKind, type Surface } from "./live/sponsorData";
import { useApp } from "./store";

export function usePlacements(kind: PlacementKind, surface?: Surface, enabled = true) {
  const { auth, plus } = useApp();
  const [items, setItems] = useState<Placement[]>([]);
  useEffect(() => {
    // Birdie Plus has no ads. Internships, campus listings and deals are content, so they stay.
    if (!enabled || auth.status !== "in" || (kind === "card" && plus)) return;
    let dead = false;
    void fetchPlacements(kind, surface).then((d) => { if (!dead) setItems(d); });
    return () => { dead = true; };
  }, [kind, surface, enabled, auth.status, plus]);
  return kind === "card" && plus ? [] : items;
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

/** The sponsor's own creative: a flyer/picture shown whole, a video that plays muted while on screen, or a PDF. */
export function AdMedia({ p, edge, small }: { p: Placement; edge?: boolean; small?: boolean }) {
  const vid = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    const el = vid.current; if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) void el.play().catch(() => undefined); else el.pause(); }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [p.media_url]);
  if (!p.media_url || !p.media_kind || p.media_kind === "none") return null;
  const round = edge ? "" : "rounded-xl";
  if (p.media_kind === "image") return <button onClick={() => open(p)} className="block w-full"><img src={p.media_url} alt={p.title} loading="lazy" className={`w-full bg-[var(--paper-dim)] object-contain ${small ? "max-h-40" : "max-h-[70vh]"} ${round}`} /></button>;
  if (p.media_kind === "video") return (
    <div className={`relative w-full overflow-hidden bg-black ${round}`}>
      <video ref={vid} src={p.media_url} muted={muted} loop playsInline preload="metadata" onClick={() => open(p)} className={`w-full ${small ? "max-h-40" : "max-h-[70vh]"}`} />
      <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"} className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white">{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
    </div>
  );
  return <a href={p.media_url} target="_blank" rel="noopener noreferrer" onClick={() => logPlacement(p.id, "click")} className={`flex items-center gap-2.5 bg-[var(--paper-dim)] p-3 text-[13px] font-semibold ${round}`}><FileText size={18} className="text-[var(--uni)]" /> Open the flyer (PDF)</a>;
}

export const SponsoredLabel = ({ name }: { name: string }) => <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--dim)]">Sponsored · {name}</div>;

/** Generic card: deals, sponsored cards in Birdie/Explore/end of video. */
export function SponsoredCard({ p, dark }: { p: Placement; dark?: boolean }) {
  const ref = useViewLog(p.id);
  return (
    <div ref={ref} className={`rounded-2xl p-3.5 ${dark ? "bg-white/95 text-[var(--text)]" : "border border-[var(--line)] bg-white"}`}>
      <SponsoredLabel name={p.sponsor_name} />
      {p.media_url && <div className="mt-2"><AdMedia p={p} /></div>}
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

/** Feed-sized ad, YouTube style: big picture, avatar + headline + "Sponsored · name", full-width button. */
export function FeedAd({ p, edge }: { p: Placement; edge?: boolean }) {
  const ref = useViewLog(p.id);
  return (
    <div ref={ref}>
      {p.media_url ? <AdMedia p={p} edge={edge} /> : p.image_url && <button onClick={() => open(p)} className="block w-full"><img src={p.image_url} alt="" className={`aspect-video w-full object-cover ${edge ? "" : "rounded-xl"}`} /></button>}
      <div className={`flex gap-3 pt-3 ${edge ? "px-3" : ""}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--paper-dim)] text-[13px] font-bold text-[var(--dim)]">{p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : p.sponsor_name.slice(0, 1)}</div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[15px] font-semibold leading-snug">{p.title}</div>
          {p.body && <div className="line-clamp-2 text-[12.5px] leading-snug text-[var(--dim)]">{p.body}</div>}
          <div className="mt-0.5 text-[12.5px]"><b>Sponsored</b> <span className="text-[var(--dim)]">· {p.sponsor_name}</span></div>
          {p.discount_code && <div className="mt-1.5"><CodeChip code={p.discount_code} /></div>}
        </div>
      </div>
      {p.url && <div className={edge ? "px-3" : ""}><button onClick={() => open(p)} className="mt-3 w-full rounded-full bg-[var(--paper-dim)] py-2.5 text-[14px] font-semibold active:scale-[0.99]">{p.cta_label}</button></div>}
    </div>
  );
}

/** Slim bar under the video player (like YouTube's "Sponsored · Learn more" strip). */
export function SponsorBar({ p }: { p: Placement }) {
  const ref = useViewLog(p.id);
  return (
    <div ref={ref} className="flex items-center gap-3 border-b border-[var(--line)] px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--paper-dim)] text-[13px] font-bold text-[var(--dim)]">{p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : p.sponsor_name.slice(0, 1)}</div>
      <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold">{p.title}</div><div className="truncate text-[11.5px] text-[var(--dim)]"><b className="text-[var(--text)]">Sponsored</b> · {p.sponsor_name}</div></div>
      {p.url && <button onClick={() => open(p)} className="shrink-0 rounded-full bg-[var(--ink)] px-4 py-2 text-[12.5px] font-semibold text-[var(--paper)] active:scale-95">{p.cta_label}</button>}
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
      {p.media_url && <div className="mt-2"><AdMedia p={p} small /></div>}
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
      {p.media_url && <div className="mt-2.5"><AdMedia p={p} /></div>}
      {p.body && <p className="mt-2 whitespace-pre-line text-[12.5px] leading-snug text-[var(--text)]">{p.body}</p>}
      {p.url && <button onClick={() => open(p)} className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-[var(--uni)] px-3.5 py-2 text-[12.5px] font-bold text-white active:scale-95">{p.cta_label === "Learn more" ? "Apply" : p.cta_label} <ExternalLink size={12} /></button>}
    </div>
  );
}

/** One sponsored card for a page (Study home, Help, Courses, under a video). Nothing shows if none is live. */
export function SlotAd({ surface, active = true }: { surface: Surface; active?: boolean }) {
  const items = usePlacements("card", surface, active);
  if (!items.length) return null;
  return <SponsoredCard p={items[0]} />;
}
