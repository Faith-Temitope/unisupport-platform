"use client";

import { Check, Cpu } from "lucide-react";
import { BRAINS, TYPICAL, brainById, modelOf, priceNgn } from "@/lib/ai/registry";
import { naira, useApp } from "./store";

export const brainName = (id: string, tier: string) => { const b = brainById(id); return `${b.brand} · ${modelOf(b, tier).label}`; };

/** Choose the AI brain (Spark / Nova / Sage) and how deep it thinks. */
export function BrainPicker() {
  const { settings, setSetting, auth, setAuthOpen, setBrainOpen } = useApp();
  const cur = brainById(settings.aiBrain);
  return (
    <div className="space-y-3">
      {auth.status !== "in" && (
        <div className="rounded-2xl bg-gradient-to-br from-[var(--ink)] to-[#2b1546] p-4 text-[var(--paper)]"><div className="disp text-[15px] font-bold">AI needs an account</div><p className="mt-1 text-[12.5px] leading-snug text-white/65">As a guest, Birdie answers from your notes with the offline engine. Sign in to use Spark, Nova or Sage. Spark is free.</p><button onClick={() => { setBrainOpen(false); setAuthOpen(true); }} className="mt-3 rounded-xl bg-[var(--birdie)] px-4 py-2 text-[13px] font-semibold text-white active:scale-95">Sign in or create an account</button></div>
      )}
      <div className="space-y-2.5">
        {BRAINS.map((b) => {
          const on = b.id === cur.id;
          const p = priceNgn(b, modelOf(b, settings.aiTier), TYPICAL.inTokens, TYPICAL.outTokens);
          return (
            <button key={b.id} onClick={() => setSetting("aiBrain", b.id)} className={`w-full rounded-2xl border-2 p-3.5 text-left transition active:scale-[0.985] ${on ? "border-[var(--birdie)] bg-[var(--birdie-soft)]" : "border-[var(--line)] bg-white"}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#C05BD6] to-[#7B2A91] text-white"><Cpu size={18} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="disp text-[16px] font-bold text-[var(--text)]">{b.brand}</span><span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${b.free ? "bg-[#DDF5EC] text-[#0a7a56]" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{b.badge}</span></div>
                  <div className="text-[11.5px] text-[var(--dim)]">Powered by {b.vendorName}</div>
                </div>
                <div className="text-right"><div className="text-[13px] font-bold text-[var(--text)]">{b.free ? "Free" : `~${naira(p.ngn)}`}</div><div className="text-[10.5px] text-[var(--dim)]">{b.free ? "always" : "per answer"}</div></div>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-white ${on ? "border-[var(--birdie)] bg-[var(--birdie)]" : "border-[var(--line)]"}`}>{on && <Check size={12} strokeWidth={3} />}</span>
              </div>
              {on && <p className="mt-2.5 text-[12px] leading-snug text-[var(--dim)]">{b.blurb}</p>}
            </button>
          );
        })}
      </div>

      <div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">How deep should {cur.brand} think?</div>
        <div className="grid grid-cols-3 gap-2">
          {cur.models.map((m) => {
            const on = m.tier === settings.aiTier;
            const p = priceNgn(cur, m, TYPICAL.inTokens, TYPICAL.outTokens);
            return (
              <button key={m.tier} onClick={() => setSetting("aiTier", m.tier)} className={`rounded-xl border-2 p-2.5 text-left transition active:scale-95 ${on ? "border-[var(--birdie)] bg-[var(--birdie-soft)]" : "border-[var(--line)] bg-white"}`}>
                <div className="text-[13px] font-bold text-[var(--text)]">{m.label}</div>
                <div className="mt-0.5 text-[10.5px] leading-tight text-[var(--dim)]">{m.vendorLabel}</div>
                <div className="mt-1 text-[11px] font-semibold text-[var(--birdie-text)]">{cur.free ? "Free" : `~${naira(p.ngn)}`}</div>
              </button>
            );
          })}
        </div>
      </div>
      <p className="rounded-xl bg-[var(--paper-dim)] p-3 text-[11.5px] leading-snug text-[var(--dim)]">
        Estimates use a typical answer (about {TYPICAL.inTokens.toLocaleString()} tokens of your notes in, {TYPICAL.outTokens} out). Paid brains are billed from your Birdie balance at the provider&apos;s cost plus a small Birdie margin. Birdie only answers from your own notes and files, and says so when something isn't in them.
      </p>
    </div>
  );
}
