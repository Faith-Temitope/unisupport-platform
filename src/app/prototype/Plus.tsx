"use client";

import { Check, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { naira, useApp } from "./store";
import { Btn, Sheet } from "./ui";

export const PLUS_PERKS = [
  "Post videos to Explore (and grow a channel)",
  "ChatGPT and Claude brains (pay per answer from your balance)",
  "Unlimited video lessons and Just Do It",
  "No ads",
  "Bird, Spider and Me buddies, the sign board and accent colours",
  "A gold Birdie Plus badge on your profile",
];

function usePlusPrices(enabled: boolean) {
  const [p, setP] = useState({ month: 1500, monthDays: 30, exam: 800, examDays: 14 });
  useEffect(() => {
    if (!enabled) return;
    void createClient().from("app_config").select("key,value").in("key", ["plus_month_price_ngn", "plus_month_days", "exam_pass_price_ngn", "exam_pass_days"]).then(({ data }) => {
      const v = (k: string, d: number) => Number((data ?? []).find((x) => x.key === k)?.value ?? d);
      setP({ month: v("plus_month_price_ngn", 1500), monthDays: v("plus_month_days", 30), exam: v("exam_pass_price_ngn", 800), examDays: v("exam_pass_days", 14) });
    });
  }, [enabled]);
  return p;
}

/** Plus status and the two ways to buy it: monthly, or the cheaper 14-day Exam Pass. */
export function PlusCard({ children }: { children?: React.ReactNode }) {
  const { plus, isRep, examPassUntil, buyPlus, flash, setWalletOpen, walletLive } = useApp();
  const prices = usePlusPrices(walletLive);
  const [busy, setBusy] = useState<"month" | "exam" | null>(null);
  async function buy(plan: "month" | "exam") {
    setBusy(plan);
    const r = await buyPlus(plan);
    setBusy(null);
    if (!r.ok) { flash(/insufficient_funds/.test(r.error ?? "") ? "Top up your balance first" : (r.error ?? "Couldn't activate Plus")); setWalletOpen(true); return; }
    flash("Birdie Plus is on. Enjoy!");
  }
  const until = examPassUntil ? new Date(examPassUntil).toLocaleDateString([], { month: "short", day: "numeric" }) : "";
  return (
    <div className={`rounded-2xl border-2 p-4 ${plus ? "border-[#E8B23A] bg-[#FFF6DD] text-[#3a2a0a]" : "border-[var(--line)]"}`}>
      <div className="flex items-center gap-2 text-[14px] font-bold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#F7C948] to-[#E8892B] text-white"><Crown size={13} /></span> Birdie Plus</div>
      {plus ? (
        <p className="mt-1 text-[12.5px]">{isRep && !until ? "Included while you're a course rep." : `Active until ${until}.`} You can extend it any time below.</p>
      ) : (
        <ul className="mt-2 space-y-1">{PLUS_PERKS.map((x) => (<li key={x} className="flex gap-2 text-[12.5px] leading-snug text-[var(--dim)]"><Check size={13} className="mt-0.5 shrink-0 text-[var(--birdie)]" strokeWidth={3} />{x}</li>))}</ul>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button disabled={!!busy} onClick={() => void buy("month")} className="rounded-xl bg-[var(--ink)] px-2 py-2.5 text-center text-[var(--paper)] active:scale-95 disabled:opacity-50"><div className="text-[13.5px] font-bold">{busy === "month" ? "..." : naira(prices.month)}</div><div className="text-[11px] opacity-75">per month</div></button>
        <button disabled={!!busy} onClick={() => void buy("exam")} className="rounded-xl bg-[var(--birdie-soft)] px-2 py-2.5 text-center text-[var(--birdie-text)] active:scale-95 disabled:opacity-50"><div className="text-[13.5px] font-bold">{busy === "exam" ? "..." : naira(prices.exam)}</div><div className="text-[11px] opacity-80">Exam Pass · {prices.examDays} days</div></button>
      </div>
      <p className="mt-2 text-center text-[11px] text-[var(--dim)]">Paid from your Birdie balance. Spark (Gemini) and downloads stay free for everyone.</p>
      {children}
    </div>
  );
}

/** Shown when someone taps a Plus feature. */
export function PlusSheet() {
  const { plusOpen, closePlus, walletLive, setAuthOpen } = useApp();
  return (
    <Sheet open={!!plusOpen} onClose={closePlus} title="That's a Birdie Plus feature">
      {plusOpen && <p className="mb-3 text-[13.5px] leading-snug text-[var(--dim)]">{plusOpen}</p>}
      {walletLive ? <PlusCard /> : <Btn onClick={() => { closePlus(); setAuthOpen(true); }}>Sign in to get Birdie Plus</Btn>}
    </Sheet>
  );
}
