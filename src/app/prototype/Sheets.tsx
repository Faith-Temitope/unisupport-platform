"use client";

import { CountryPicker, RegionPicker, SchoolPicker } from "./PlacePicker";
import { PlusSheet } from "./Plus";
import { Copy, Heart, MapPin, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { naira, useApp } from "./store";
import { Btn, Page, Screen, Sheet, TextField } from "./ui";
import { BrainPicker } from "./BrainPicker";
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
  const { walletOpen, setWalletOpen, brainOpen, setBrainOpen, balance, txs, topUp, topUpLive, flash, profile, setProfile, ready, walletLive } = useApp();
  const [amt, setAmt] = useState(20000);
  const [payBusy, setPayBusy] = useState(false);
  async function payWithPaystack() {
    setPayBusy(true);
    const url = await topUpLive(amt);
    setPayBusy(false);
    if (url) window.location.href = url;
  }
  // Parent top-up: a private link a parent can pay into without an account.
  const [payLink, setPayLink] = useState<string | null>(null);
  useEffect(() => {
    if (!walletOpen || !walletLive || payLink) return;
    void createClient().rpc("my_topup_link").then(({ data }) => { if (data) setPayLink(`${window.location.origin}/pay/${data}`); });
  }, [walletOpen, walletLive, payLink]);
  async function sharePayLink() {
    if (!payLink) return;
    const text = `Hi, could you top up my Birdie study balance? It's only spent on study tools (AI study help, Exam Pass, course materials). You can pay here: ${payLink}`;
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); flash("Message and link copied"); } } catch { /* cancelled */ }
  }
  async function resetPayLink() {
    const { data } = await createClient().rpc("reset_topup_link");
    if (data) { setPayLink(`${window.location.origin}/pay/${data}`); flash("New link made. The old one no longer works."); }
  }
  const [f, setF] = useState({ name: "", level: "", program: "", country: "", region: "", institution: "" });
  const [detected, setDetected] = useState("");
  useEffect(() => { const c = detectCountry(); setDetected(c); setF((x) => ({ ...x, country: c })); }, []);
  useEffect(() => { if (profile.name) setF((x) => (x.name ? x : { ...x, name: profile.name })); }, [profile.name]);

  function finish() {
    const handle = f.name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "");
    setProfile({ name: f.name.trim(), handle, level: f.level, program: f.program.trim(), country: f.country.trim(), region: f.region, institution: f.institution, onboarded: true });
  }

  return (
    <>
      <PlusSheet />
      <Page open={walletOpen} onClose={() => setWalletOpen(false)} title="Balance">
        <div className="flex flex-col items-center bg-[var(--we-cell)] px-6 pb-7 pt-6">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF3D6] text-[26px] font-semibold text-[#F5A623]">₦</span>
          <div className="mt-3 text-[14px] text-[var(--we-sub)]">Balance</div>
          <div className="mt-1 text-[34px] font-semibold tracking-tight text-[var(--we-text)]">{naira(balance)}</div>
        </div>

        <div className="mt-2 bg-[var(--we-cell)] px-4 pb-5 pt-4">
          <div className="mb-3 text-[15px] text-[var(--we-text)]">Top Up</div>
          <div className="grid grid-cols-4 gap-2">{(walletLive ? [2000, 5000, 10000, 20000] : [5000, 10000, 20000, 50000]).map((a) => (
            <button key={a} onClick={() => setAmt(a)} className={`rounded-[6px] py-2.5 text-[14px] ${amt === a ? "bg-[var(--we-accent)] text-white" : "bg-[var(--we-bg)] text-[var(--we-text)]"}`}>{naira(a)}</button>
          ))}</div>
          <button disabled={payBusy} onClick={() => (walletLive ? void payWithPaystack() : (topUp(amt), setWalletOpen(false), flash(`Loaded ${naira(amt)}`)))}
            className="mt-4 w-full rounded-[6px] bg-[var(--we-accent)] py-3 text-[16px] font-medium text-white disabled:opacity-50">{payBusy ? "Opening..." : `Top Up ${naira(amt)}`}</button>
          <p className="mt-2 text-center text-[12.5px] text-[var(--we-sub)]">{walletLive ? "Card, bank transfer or USSD" : "Guest mode uses practice money. Sign up for a balance."}</p>
        </div>

        {walletLive && (
          <div className="mt-2 bg-[var(--we-cell)] px-4 py-4">
            <div className="flex items-center gap-2 text-[15px] text-[var(--we-text)]"><Heart size={17} className="text-[var(--we-red)]" /> Ask a Parent to Pay</div>
            <p className="mt-1 text-[13px] leading-snug text-[var(--we-sub)]">Send them a link. They pay without an account and it lands here.</p>
            <div className="mt-3 flex gap-2">
              <button disabled={!payLink} onClick={() => void sharePayLink()} className="flex flex-1 items-center justify-center gap-2 rounded-[6px] bg-[var(--we-bg)] py-2.5 text-[14.5px] text-[var(--we-text)] disabled:opacity-50"><Share2 size={16} /> Send Link</button>
              <button disabled={!payLink} onClick={() => { void navigator.clipboard.writeText(payLink ?? ""); flash("Link copied"); }} className="flex flex-1 items-center justify-center gap-2 rounded-[6px] bg-[var(--we-bg)] py-2.5 text-[14.5px] text-[var(--we-text)] disabled:opacity-50"><Copy size={16} /> Copy Link</button>
            </div>
            <button onClick={() => void resetPayLink()} className="mt-2.5 text-[12.5px] text-[var(--we-link)]">Make a new link (the old one stops working)</button>
          </div>
        )}

        <div className="mt-2 bg-[var(--we-cell)]">
          <div className="px-4 pb-1 pt-3 text-[13px] text-[var(--we-sub)]">Recent</div>
          {txs.length === 0 ? <p className="px-4 pb-4 pt-2 text-[14px] text-[var(--we-hint)]">No transactions yet</p> : txs.slice(0, 30).map((t) => (
            <div key={t.id} className="flex items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 last:border-0">
              <span className="min-w-0 flex-1"><span className="block truncate text-[15px] text-[var(--we-text)]">{t.label}</span><span className="block text-[12px] text-[var(--we-hint)]">{t.t}</span></span>
              <span className={`text-[15.5px] ${t.amount > 0 ? "text-[#2AAE67]" : "text-[var(--we-text)]"}`}>{t.amount > 0 ? "+" : "-"}{naira(Math.abs(t.amount))}</span>
            </div>
          ))}
        </div>
        <div className="h-10" />
      </Page>

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
            <CountryPicker value={f.country} onChange={(v) => setF({ ...f, country: v, region: v === f.country ? f.region : "" })} />
            {detected && f.country === detected && <div className="flex items-center gap-2 rounded-xl bg-[var(--birdie-soft)] px-3 py-2 text-[12px] text-[var(--birdie-text)]"><MapPin size={14} /> Detected from your device. Change it if it's wrong.</div>}
            {f.country && <RegionPicker country={f.country} value={f.region} onChange={(v) => setF({ ...f, region: v })} />}
            {f.country && <SchoolPicker country={f.country} region={f.region} value={f.institution} onChange={(v) => setF({ ...f, institution: v })} />}
          </div>
          <Btn disabled={!f.name.trim() || !f.level} onClick={finish}>Get started</Btn>
        </div>
      </Screen>
    </>
  );
}
