"use client";

import { Copy, Share2, Ticket, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { naira, useApp } from "./store";
import { Btn, Sheet, TextField } from "./ui";

type Quote = { seats: number; unit: number; pct: number; full: number; total: number };
type MyPack = { code: string; seats: number; claimed: number; price_paid: number; created_at: string };
const rpcMsg = (e: { message?: string } | null) => (e?.message ?? "").replace(/^.*?exception:\s*/i, "");
const CLAIM_ERRORS: Record<string, string> = {
  invalid_code: "That code doesn't exist. Check it and try again.",
  already_claimed: "You've already used this code.",
  pack_full: "All the passes in this pack have been claimed.",
  code_expired: "This code has expired.",
  wrong_school: "This pass is only for students at another school. Check your school in Settings > Edit profile.",
};

/** Under the Exam Pass card: buy a discounted pack for your class, or claim a pass with a code. */
export function PassPacks() {
  const { flash, refreshWallet, refreshExamPass, setWalletOpen } = useApp();
  const [sheet, setSheet] = useState<null | "buy" | "claim">(null);
  const [seats, setSeats] = useState("10");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [mine, setMine] = useState<MyPack[]>([]);
  const [code, setCode] = useState(""); const [bought, setBought] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const n = Math.max(0, Math.round(Number(seats) || 0));

  useEffect(() => {
    if (sheet !== "buy") return;
    void createClient().rpc("my_pass_packs").then(({ data }) => setMine((data ?? []) as MyPack[]));
  }, [sheet, bought]);
  useEffect(() => {
    if (sheet !== "buy" || n < 5 || n > 500) return;
    const t = setTimeout(() => { void createClient().rpc("pass_pack_quote", { p_seats: n }).then(({ data }) => setQuote(data as Quote)); }, 250);
    return () => clearTimeout(t);
  }, [sheet, n]);
  const q = n >= 5 && n <= 500 && quote?.seats === n ? quote : null;

  async function buy() {
    setBusy(true);
    const { data, error } = await createClient().rpc("buy_pass_pack", { p_seats: n });
    setBusy(false);
    if (error) {
      if (/insufficient_funds/.test(error.message)) { flash(`Top up first. This pack is ${q ? naira(q.total) : "more than your balance"}`); setSheet(null); setWalletOpen(true); }
      else flash("Couldn't buy the pack. Try again.");
      return;
    }
    setBought(data as string); void refreshWallet();
  }
  async function claim() {
    setBusy(true);
    const { data, error } = await createClient().rpc("claim_pass_pack", { p_code: code });
    setBusy(false);
    if (error) return flash(CLAIM_ERRORS[rpcMsg(error)] ?? "Couldn't use that code. Try again.");
    const r = data as { until: string; sponsor: string | null };
    flash(`Exam Pass active until ${new Date(r.until).toLocaleDateString([], { day: "numeric", month: "short" })}${r.sponsor ? `, courtesy of ${r.sponsor}` : ""}`);
    setCode(""); setSheet(null); void refreshExamPass();
  }
  const shareText = (c: string, s: number) => `I got Birdie Exam Passes for our class: unlimited Birdie AI for exams. Open Birdie > Wallet > "Have a pass code?" and enter ${c}. ${s} passes, first come first served.`;
  async function share(c: string, s: number) {
    try { if (navigator.share) await navigator.share({ text: shareText(c, s) }); else { await navigator.clipboard.writeText(shareText(c, s)); flash("Message copied"); } } catch { /* cancelled */ }
  }

  return (
    <>
      <div className="mt-2 flex gap-4">
        <button onClick={() => { setBought(null); setSheet("buy"); }} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--birdie-text)]"><Users size={14} /> Buy for your group</button>
        <button onClick={() => setSheet("claim")} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--birdie-text)]"><Ticket size={14} /> Have a pass code?</button>
      </div>

      <Sheet open={sheet === "claim"} onClose={() => setSheet(null)} title="Use a pass code">
        <div className="space-y-3">
          <TextField value={code} onChange={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))} placeholder="e.g. EP44D0E3" />
          <Btn variant="birdie" disabled={busy || code.length < 6} onClick={() => void claim()}>{busy ? "Checking..." : "Activate my Exam Pass"}</Btn>
          <p className="text-[11.5px] leading-snug text-[var(--dim)]">Codes come from classmates who bought a pack, or from sponsors. One pass per person per code.</p>
        </div>
      </Sheet>

      <Sheet open={sheet === "buy"} onClose={() => setSheet(null)} title="Exam Passes for your group">
        {bought ? (
          <div className="space-y-3">
            <div className="rounded-[20px] bg-[var(--ink)] p-4 text-[var(--paper)]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Your class code</div>
              <div className="disp text-[30px] font-bold tracking-widest">{bought}</div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => { void navigator.clipboard.writeText(bought); flash("Code copied"); }} className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-[12.5px] font-semibold"><Copy size={14} /> Copy</button>
                <button onClick={() => void share(bought, n)} className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-[12.5px] font-semibold"><Share2 size={14} /> Share in the group</button>
              </div>
            </div>
            <p className="text-[12.5px] leading-snug text-[var(--dim)]">Anyone with the code can claim one pass until all {n} are used, including you. Use it yourself with &quot;Have a pass code?&quot;.</p>
            <Btn variant="ghost" onClick={() => setBought(null)}>Buy another pack</Btn>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] leading-snug text-[var(--dim)]">Pool money with your class and buy passes together. The bigger the pack, the cheaper each pass.</p>
            <div className="flex gap-2">{[5, 20, 50, 100].map((s) => (<button key={s} onClick={() => setSeats(String(s))} className={`flex-1 rounded-xl border-2 py-2.5 text-[12.5px] font-bold transition active:scale-95 ${n === s ? "border-[var(--birdie)] bg-[var(--birdie-soft)] text-[var(--birdie-text)]" : "border-[var(--line)] text-[var(--dim)]"}`}>{s}</button>))}</div>
            <TextField value={seats} onChange={(v) => setSeats(v.replace(/[^\d]/g, "").slice(0, 3))} placeholder="How many passes (5 to 500)" />
            {n > 0 && n < 5 && <p className="text-[12px] text-[var(--help)]">Packs start at 5 passes.</p>}
            {q && (
              <div className="rounded-xl bg-[var(--paper-dim)] p-3 text-[13px]">
                <div className="flex justify-between"><span>{q.seats} passes × {naira(q.unit)}</span><span className="text-[var(--dim)] line-through">{naira(q.full)}</span></div>
                <div className="mt-1 flex justify-between font-bold"><span>You pay {q.pct ? `(${q.pct}% off)` : ""}</span><span>{naira(q.total)}</span></div>
                <div className="mt-1 text-[11.5px] text-[var(--dim)]">That&apos;s {naira(Math.round(q.total / q.seats))} per student. Split it however your group likes.</div>
              </div>
            )}
            <Btn variant="birdie" disabled={busy || !q} onClick={() => void buy()}>{busy ? "Buying..." : q ? `Buy ${q.seats} passes for ${naira(q.total)}` : "Buy"}</Btn>
            {mine.length > 0 && (
              <div>
                <div className="mb-1.5 mt-2 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Packs you bought</div>
                <div className="space-y-1.5">{mine.map((p) => (
                  <div key={p.code} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[13px] ring-1 ring-[var(--line)]">
                    <span className="font-mono font-bold">{p.code}</span><span className="text-[var(--dim)]">{p.claimed}/{p.seats} used</span>
                    <button onClick={() => void share(p.code, p.seats)} className="text-[12px] font-bold text-[var(--birdie-text)]">Share</button>
                  </div>
                ))}</div>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
