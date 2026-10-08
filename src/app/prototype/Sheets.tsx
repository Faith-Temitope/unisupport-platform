"use client";

import { Copy, CreditCard, Heart, MapPin, Share2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { naira, useApp } from "./store";
import { Btn, Screen, Sheet, TextField } from "./ui";
import { BrainPicker } from "./BrainPicker";
import { PassPacks } from "./PassPacks";
import { PrintOrders } from "./PrintOrders";

const LEVELS = ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Year 1", "Year 2", "Year 3", "Year 4", "Postgraduate"];

// IANA time zone -> country, just for a sensible onboarding default. Students can always correct it.
const TZ_COUNTRY: Record<string, string> = {
  "Africa/Lagos": "Nigeria", "Africa/Abuja": "Nigeria", "Africa/Accra": "Ghana", "Africa/Nairobi": "Kenya",
  "Africa/Johannesburg": "South Africa", "Africa/Cairo": "Egypt", "Africa/Casablanca": "Morocco",
  "Africa/Algiers": "Algeria", "Africa/Tunis": "Tunisia", "Africa/Addis_Ababa": "Ethiopia", "Africa/Kampala": "Uganda",
  "Africa/Dar_es_Salaam": "Tanzania", "Africa/Kigali": "Rwanda", "Africa/Khartoum": "Sudan", "Africa/Harare": "Zimbabwe",
  "Africa/Lusaka": "Zambia", "Africa/Maputo": "Mozambique", "Africa/Dakar": "Senegal", "Africa/Abidjan": "Ivory Coast",
  "Africa/Freetown": "Sierra Leone", "Africa/Monrovia": "Liberia", "Africa/Bamako": "Mali", "Africa/Niamey": "Niger",
  "Africa/Douala": "Cameroon", "Africa/Libreville": "Gabon", "Africa/Kinshasa": "DR Congo", "Africa/Windhoek": "Namibia",
  "Africa/Gaborone": "Botswana", "Africa/Maseru": "Lesotho", "Africa/Mbabane": "Eswatini", "Africa/Tripoli": "Libya",
  "Europe/London": "United Kingdom", "Europe/Dublin": "Ireland", "Europe/Paris": "France", "Europe/Berlin": "Germany",
  "Europe/Madrid": "Spain", "Europe/Rome": "Italy", "Europe/Amsterdam": "Netherlands", "Europe/Brussels": "Belgium",
  "Europe/Lisbon": "Portugal", "Europe/Zurich": "Switzerland", "Europe/Vienna": "Austria", "Europe/Stockholm": "Sweden",
  "Europe/Oslo": "Norway", "Europe/Copenhagen": "Denmark", "Europe/Helsinki": "Finland", "Europe/Warsaw": "Poland",
  "Europe/Athens": "Greece", "Europe/Istanbul": "Turkey", "Europe/Moscow": "Russia", "Europe/Kyiv": "Ukraine",
  "America/New_York": "United States", "America/Chicago": "United States", "America/Denver": "United States",
  "America/Los_Angeles": "United States", "America/Anchorage": "United States", "America/Phoenix": "United States",
  "America/Toronto": "Canada", "America/Vancouver": "Canada", "America/Mexico_City": "Mexico",
  "America/Sao_Paulo": "Brazil", "America/Bogota": "Colombia", "America/Lima": "Peru", "America/Santiago": "Chile",
  "America/Buenos_Aires": "Argentina", "America/Jamaica": "Jamaica", "America/Port_of_Spain": "Trinidad and Tobago",
  "Asia/Dubai": "United Arab Emirates", "Asia/Riyadh": "Saudi Arabia", "Asia/Qatar": "Qatar", "Asia/Kuwait": "Kuwait",
  "Asia/Karachi": "Pakistan", "Asia/Kolkata": "India", "Asia/Dhaka": "Bangladesh", "Asia/Kathmandu": "Nepal",
  "Asia/Colombo": "Sri Lanka", "Asia/Bangkok": "Thailand", "Asia/Jakarta": "Indonesia", "Asia/Manila": "Philippines",
  "Asia/Kuala_Lumpur": "Malaysia", "Asia/Singapore": "Singapore", "Asia/Hong_Kong": "Hong Kong", "Asia/Shanghai": "China",
  "Asia/Tokyo": "Japan", "Asia/Seoul": "South Korea", "Asia/Ho_Chi_Minh": "Vietnam",
  "Australia/Sydney": "Australia", "Australia/Melbourne": "Australia", "Australia/Perth": "Australia",
  "Pacific/Auckland": "New Zealand",
};
const detectCountry = () => { try { return TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? ""; } catch { return ""; } };

export default function Sheets() {
  const { walletOpen, setWalletOpen, brainOpen, setBrainOpen, balance, txs, topUp, topUpLive, flash, profile, setProfile, ready, walletLive, examPassUntil, buyExamPass, isRep } = useApp();
  const [amt, setAmt] = useState(20000);
  const [payBusy, setPayBusy] = useState(false);
  async function payWithPaystack() {
    setPayBusy(true);
    const url = await topUpLive(amt);
    setPayBusy(false);
    if (url) window.location.href = url;
  }
  const [passCfg, setPassCfg] = useState({ price: 1000, days: 14 });
  const [passBusy, setPassBusy] = useState(false);
  useEffect(() => {
    if (!walletOpen || !walletLive) return;
    void createClient().from("app_config").select("key,value").in("key", ["exam_pass_price_ngn", "exam_pass_days"]).then(({ data }) => {
      const row = (k: string) => (data ?? []).find((x) => x.key === k)?.value;
      setPassCfg({ price: Number(row("exam_pass_price_ngn") ?? 1000), days: Number(row("exam_pass_days") ?? 14) });
    });
  }, [walletOpen, walletLive]);
  // Parent top-up: a private link a parent can pay into without an account.
  const [payLink, setPayLink] = useState<string | null>(null);
  useEffect(() => {
    if (!walletOpen || !walletLive || payLink) return;
    void createClient().rpc("my_topup_link").then(({ data }) => { if (data) setPayLink(`${window.location.origin}/pay/${data}`); });
  }, [walletOpen, walletLive, payLink]);
  async function sharePayLink() {
    if (!payLink) return;
    const text = `Hi, could you top up my Birdie study balance? It's only spent on study tools (AI study help, Exam Pass, course materials). You can pay here with Paystack: ${payLink}`;
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); flash("Message and link copied"); } } catch { /* cancelled */ }
  }
  async function resetPayLink() {
    const { data } = await createClient().rpc("reset_topup_link");
    if (data) { setPayLink(`${window.location.origin}/pay/${data}`); flash("New link made. The old one no longer works."); }
  }
  const passActive = !!examPassUntil && new Date(examPassUntil) > new Date();
  const repPerk = isRep && !passActive;
  async function buyPass() {
    setPassBusy(true);
    const r = await buyExamPass();
    setPassBusy(false);
    if (!r.ok) { flash(/insufficient_funds/.test(r.error ?? "") ? "Top up first, then get your Exam Pass" : (r.error ?? "Couldn't buy the Exam Pass")); return; }
    flash(`Exam Pass active for ${passCfg.days} days -- unlimited Birdie AI`);
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
        {walletLive && (
          <div className={`mt-4 rounded-2xl border-2 p-4 ${passActive || repPerk ?"border-[var(--birdie)] bg-[var(--birdie-soft)]" : "border-[var(--line)]"}`}>
            <div className="flex items-center gap-2 text-[13.5px] font-bold"><Zap size={16} className="text-[var(--birdie-text)]" /> Exam Pass</div>
            {repPerk ? (
              <p className="mt-1 text-[12.5px] text-[var(--birdie-text)]">Included free while you&apos;re a course rep. Unlimited Birdie AI, every brain, no charges.</p>
            ) : passActive ? (
              <p className="mt-1 text-[12.5px] text-[var(--birdie-text)]">Active until {new Date(examPassUntil!).toLocaleDateString([], { month: "short", day: "numeric" })}. Unlimited Birdie AI, every brain, no charges.</p>
            ) : (
              <>
                <p className="mt-1 text-[12.5px] leading-snug text-[var(--dim)]">{naira(passCfg.price)} for {passCfg.days} days of unlimited Birdie AI, in test and exam mode too. Pays from your balance above.</p>
                <Btn variant="birdie" disabled={passBusy} onClick={() => void buyPass()}><span className="inline-flex items-center gap-2"><Zap size={16} /> {passBusy ? "Activating..." : `Get Exam Pass -- ${naira(passCfg.price)}`}</span></Btn>
              </>
            )}
            <PassPacks />
          </div>
        )}
        {walletLive && (
          <div className="mt-3 rounded-2xl border-2 border-[var(--line)] p-4">
            <div className="flex items-center gap-2 text-[13.5px] font-bold"><Heart size={16} className="text-[var(--birdie-text)]" /> Ask a parent to pay</div>
            <p className="mt-1 text-[12.5px] leading-snug text-[var(--dim)]">Send this link to a parent or sponsor. They pay with Paystack, no account needed, and it lands in your balance. It can only be spent on Birdie, so they know where it goes.</p>
            <div className="mt-3 flex gap-2">
              <Btn variant="birdie" disabled={!payLink} onClick={() => void sharePayLink()}><span className="inline-flex items-center gap-2"><Share2 size={15} /> Send link</span></Btn>
              <button disabled={!payLink} onClick={() => { void navigator.clipboard.writeText(payLink ?? ""); flash("Link copied"); }} className="shrink-0 rounded-2xl bg-[var(--paper-dim)] px-4 text-[13px] font-semibold active:scale-95"><Copy size={15} /></button>
            </div>
            <button onClick={() => void resetPayLink()} className="mt-2 text-[11.5px] font-semibold text-[var(--dim)] underline">Make a new link (stops the old one)</button>
          </div>
        )}
        <div className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Activity</div>
        <div className="space-y-2">{txs.length === 0 && <div className="text-[13px] text-[var(--dim)]">No transactions yet.</div>}{txs.map((t) => (<div key={t.id} className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-[var(--line)]"><div><div className="text-[13px] font-semibold">{t.label}</div><div className="text-[11px] text-[var(--dim)]">{t.t}</div></div><div className={`text-[13.5px] font-bold ${t.amount > 0 ? "text-[var(--uni-deep)]" : ""}`}>{t.amount > 0 ? "+" : "-"}{naira(Math.abs(t.amount))}</div></div>))}</div>
      </Sheet>

      <Sheet open={brainOpen} onClose={() => setBrainOpen(false)} title="Birdie's brain"><BrainPicker /></Sheet>
      <PrintOrders />

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
