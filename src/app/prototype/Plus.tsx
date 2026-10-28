"use client";

import { Check, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { naira, useApp } from "./store";
import { Page } from "./ui";
import { PassPacks } from "./PassPacks";
import { usePlacements } from "./Sponsored";

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
export function PlusCard({ children, reason }: { children?: React.ReactNode; reason?: string | null }) {
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
  const until = examPassUntil ? new Date(examPassUntil).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "";
  return (
    <div>
      <div className="mx-3 mt-3 rounded-[12px] bg-gradient-to-br from-[#F7C948] to-[#E8892B] p-5 text-[#3a2208]">
        <div className="flex items-center gap-2 text-[17px] font-semibold"><Crown size={20} /> Birdie Plus</div>
        <div className="mt-6 text-[14px]">{plus ? (isRep && !until ? "Included while you're a course rep" : `Active until ${until}`) : "Not active"}</div>
      </div>
      {!plus && reason && <p className="px-5 pt-3 text-[14px] leading-snug text-[var(--we-text)]">{reason}</p>}
      {!plus && (
        <div className="mt-3 bg-[var(--we-cell)]">
          {PLUS_PERKS.map((x) => <div key={x} className="flex gap-3 border-b border-[var(--we-sep)] px-4 py-3 text-[15px] text-[var(--we-text)] last:border-0"><Check size={18} className="mt-0.5 shrink-0 text-[var(--we-accent)]" />{x}</div>)}
        </div>
      )}
      <div className="mt-2 bg-[var(--we-cell)] px-4 py-4">
        <div className="mb-3 text-[15px] text-[var(--we-text)]">{plus ? "Extend" : "Get Birdie Plus"}</div>
        <div className="grid grid-cols-2 gap-2">
          <button disabled={!!busy || !walletLive} onClick={() => void buy("month")} className="rounded-[6px] bg-[var(--we-accent)] py-3 text-center text-white disabled:opacity-50"><div className="text-[16px] font-medium">{busy === "month" ? "..." : naira(prices.month)}</div><div className="text-[12px] opacity-85">{prices.monthDays} days</div></button>
          <button disabled={!!busy || !walletLive} onClick={() => void buy("exam")} className="rounded-[6px] bg-[var(--we-bg)] py-3 text-center text-[var(--we-text)] disabled:opacity-50"><div className="text-[16px] font-medium">{busy === "exam" ? "..." : naira(prices.exam)}</div><div className="text-[12px] text-[var(--we-sub)]">Exam Pass · {prices.examDays} days</div></button>
        </div>
        <p className="mt-2 text-center text-[12.5px] text-[var(--we-sub)]">Paid from your Birdie balance</p>
      </div>
      {children}
    </div>
  );
}

/** Me > Cards & Offers (and wherever a Plus feature is tapped): your Plus status, Exam Pass for your
 *  class, and student offers with discount codes from campus businesses. */
export function PlusSheet() {
  const { plusOpen, closePlus, walletLive, setAuthOpen, flash } = useApp();
  const offers = usePlacements("deal", undefined, plusOpen !== null);
  const reason = plusOpen && !/^(Get more from Birdie\.|You're on Birdie Plus\.)$/.test(plusOpen) ? plusOpen : null;
  return (
    <Page open={plusOpen !== null} onClose={closePlus} title="Cards & Offers">
      {walletLive ? (<>
        <PlusCard reason={reason} />
        <div className="mt-2 bg-[var(--we-cell)] px-4 py-4"><div className="mb-2 text-[15px] text-[var(--we-text)]">Exam Pass for your class</div><PassPacks /></div>
        {offers.some((o) => o.discount_code) && (
          <div className="mt-2 bg-[var(--we-cell)]">
            <div className="px-4 pb-1 pt-3 text-[13px] text-[var(--we-sub)]">Student Offers</div>
            {offers.filter((o) => o.discount_code).map((o) => (
              <div key={o.id} className="flex items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 last:border-0">
                <span className="min-w-0 flex-1"><span className="block truncate text-[15px] text-[var(--we-text)]">{o.title}</span><span className="block truncate text-[12.5px] text-[var(--we-sub)]">{o.sponsor_name}</span></span>
                <button onClick={() => { void navigator.clipboard?.writeText(o.discount_code!); flash("Code copied"); }} className="rounded-[4px] border border-dashed border-[var(--we-accent)] px-2.5 py-1 font-mono text-[13px] text-[var(--we-accent)]">{o.discount_code}</button>
              </div>
            ))}
          </div>
        )}
        <div className="h-10" />
      </>) : (
        <div className="px-5 py-10 text-center">
          <p className="text-[14px] text-[var(--we-sub)]">Sign in to get Birdie Plus, Exam Pass and student offers.</p>
          <button onClick={() => { closePlus(); setAuthOpen(true); }} className="mt-4 rounded-[6px] bg-[var(--we-accent)] px-6 py-2.5 text-[15px] font-medium text-white">Sign In</button>
        </div>
      )}
    </Page>
  );
}
