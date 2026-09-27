"use client";

import { CreditCard, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { naira, useApp } from "./store";
import { Btn, Screen, Sheet, TextField } from "./ui";
import { BrainPicker } from "./BrainPicker";

const LEVELS = ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Year 1", "Year 2", "Year 3", "Year 4", "Postgraduate"];
const detectCountry = () => { try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; if (tz.includes("Lagos")) return "Nigeria"; if (tz.includes("Accra")) return "Ghana"; if (tz.includes("Nairobi")) return "Kenya"; if (tz.startsWith("America")) return "United States"; if (tz.includes("London")) return "United Kingdom"; } catch { /* ignore */ } return ""; };

export default function Sheets() {
  const { walletOpen, setWalletOpen, brainOpen, setBrainOpen, balance, txs, topUp, topUpLive, flash, profile, setProfile, ready, walletLive } = useApp();
  const [amt, setAmt] = useState(20000);
  const [payBusy, setPayBusy] = useState(false);
  async function payWithPaystack() {
    setPayBusy(true);
    const url = await topUpLive(amt);
    setPayBusy(false);
    if (url) window.location.href = url;
  }
  const [f, setF] = useState({ name: "", level: "", program: "", country: "" });
  const [detected, setDetected] = useState("");
  useEffect(() => { const c = detectCountry(); setDetected(c); setF((x) => ({ ...x, country: c })); }, []);
  useEffect(() => { if (profile.name) setF((x) => (x.name ? x : { ...x, name: profile.name })); }, [profile.name]);

  function finish() {
    const handle = f.name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "");
    setProfile({ name: f.name.trim(), handle, level: f.level, program: f.program.trim(), country: f.country.trim(), onboarded: true });
  }

  return (
    <>
      <Sheet open={walletOpen} onClose={() => setWalletOpen(false)} title="Your Birdie balance">
        <div className="rounded-[20px] bg-[var(--ink)] p-4 text-[var(--paper)]"><div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Available</div><div className="disp text-[30px] font-bold">{naira(balance)}</div></div>
        {walletLive ? (<>
          <div className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Top up with Paystack</div>
          <div className="mb-3 flex gap-2">{[2000, 5000, 10000, 20000].map((a) => (<button key={a} onClick={() => setAmt(a)} className={`flex-1 rounded-xl border-2 py-2.5 text-[12.5px] font-bold transition active:scale-95 ${amt === a ? "border-[var(--birdie)] bg-[var(--birdie-soft)] text-[var(--birdie-text)]" : "border-[var(--line)] text-[var(--dim)]"}`}>{naira(a)}</button>))}</div>
          <Btn variant="birdie" disabled={payBusy} onClick={payWithPaystack}><span className="inline-flex items-center gap-2"><CreditCard size={16} /> {payBusy ? "Starting..." : `Pay ${naira(amt)} with Paystack`}</span></Btn>
          <p className="mt-2 text-center text-[11.5px] text-[var(--dim)]">This is your real balance. It pays for paid AI brains, session fees and writer work.</p>
        </>) : (<>
          <div className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Top up</div>
          <div className="mb-3 flex gap-2">{[5000, 10000, 20000, 50000].map((a) => (<button key={a} onClick={() => setAmt(a)} className={`flex-1 rounded-xl border-2 py-2.5 text-[12.5px] font-bold transition active:scale-95 ${amt === a ? "border-[var(--birdie)] bg-[var(--birdie-soft)] text-[var(--birdie-text)]" : "border-[var(--line)] text-[var(--dim)]"}`}>{naira(a)}</button>))}</div>
          <Btn variant="birdie" onClick={() => { topUp(amt); setWalletOpen(false); flash(`Loaded ${naira(amt)}`); }}><span className="inline-flex items-center gap-2"><CreditCard size={16} /> Add {naira(amt)} (demo)</span></Btn>
          <p className="mt-2 text-center text-[11.5px] text-[var(--dim)]">Guest mode uses demo money. Create an account for a real balance.</p>
        </>)}
        <div className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Activity</div>
        <div className="space-y-2">{txs.length === 0 && <div className="text-[13px] text-[var(--dim)]">No transactions yet.</div>}{txs.map((t) => (<div key={t.id} className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-[var(--line)]"><div><div className="text-[13px] font-semibold">{t.label}</div><div className="text-[11px] text-[var(--dim)]">{t.t}</div></div><div className={`text-[13.5px] font-bold ${t.amount > 0 ? "text-[var(--uni-deep)]" : ""}`}>{t.amount > 0 ? "+" : "-"}{naira(Math.abs(t.amount))}</div></div>))}</div>
      </Sheet>

      <Sheet open={brainOpen} onClose={() => setBrainOpen(false)} title="Birdie's brain"><BrainPicker /></Sheet>

      {/* first run: a real profile instead of a made-up one */}
      <Screen open={ready && !profile.onboarded} z={90}>
        <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-6 pb-8 pt-4">
          <div><div className="disp flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C05BD6] to-[#8A2FA3] text-[26px] font-bold text-white">B</div><h1 className="disp mt-4 text-[26px] font-bold leading-tight text-[var(--text)]">Welcome to Birdie</h1><p className="mt-1.5 text-[14px] leading-snug text-[var(--dim)]">A study partner that knows your courses. Tell us a little about you.</p></div>
          <div className="space-y-3">
            <TextField value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="What should we call you?" />
            <div><div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Your level</div><div className="flex flex-wrap gap-2">{LEVELS.map((l) => (<button key={l} onClick={() => setF({ ...f, level: l })} className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition active:scale-95 ${f.level === l ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{l}</button>))}</div></div>
            <TextField value={f.program} onChange={(v) => setF({ ...f, program: v })} placeholder="What do you study? (optional)" />
            <TextField value={f.country} onChange={(v) => setF({ ...f, country: v })} placeholder="Country" />
            {detected && f.country === detected && <div className="flex items-center gap-2 rounded-xl bg-[var(--birdie-soft)] px-3 py-2 text-[12px] text-[var(--birdie-text)]"><MapPin size={14} /> Detected from your device. Change it if it's wrong.</div>}
          </div>
          <Btn disabled={!f.name.trim() || !f.level} onClick={finish}>Get started</Btn>
        </div>
      </Screen>
    </>
  );
}
