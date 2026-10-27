"use client";

// Me: you, your wallet, Birdie Plus, your channel, the verified accounts you run, and settings.
import { BadgeCheck, ChevronRight, Crown, HelpCircle, KeyRound, Settings as Cog, ShieldCheck, Tv, Wallet } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ApplyVerifiedSheet, OALogo, Tick } from "./Official";
import { hasPin, myManagedOfficials, setPin, type OAManaged } from "./live/chatData";
import { initials } from "./PostCard";
import { naira, useApp } from "./store";
import { Avatar, Btn, Sheet } from "./ui";

function Row({ icon, label, sub, right, onClick }: { icon: ReactNode; label: string; sub?: string; right?: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-[var(--line)] px-4 py-3.5 text-left last:border-0 active:bg-[var(--paper-dim)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--paper-dim)] text-[var(--text)]">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-semibold">{label}</span>{sub && <span className="block truncate text-[12px] text-[var(--dim)]">{sub}</span>}</span>
      {right}<ChevronRight size={16} className="shrink-0 text-[var(--dim)]" />
    </button>
  );
}

export default function Me({ active }: { active: boolean }) {
  const { profile, auth, balance, plus, setWalletOpen, openPlus, setOverlay, setTourOpen, setAuthOpen, setChatView, refreshWallet } = useApp();
  const [managed, setManaged] = useState<OAManaged[]>([]);
  const [apply, setApply] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const signedIn = auth.status === "in";
  const load = useCallback(() => { if (signedIn) void myManagedOfficials().then(setManaged); }, [signedIn]);
  useEffect(() => { if (active) void Promise.resolve().then(() => { load(); if (signedIn) void refreshWallet(); }); }, [active, load]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="no-scrollbar flex h-full flex-col overflow-y-auto bg-[var(--paper-dim)] pb-28">
      <button onClick={() => (signedIn ? setOverlay({ t: "profile", id: "me" }) : setAuthOpen(true))} className="flex items-center gap-4 bg-[var(--paper)] px-5 pb-6 pt-8 text-left">
        <Avatar initials={initials(profile.name || "Me")} color="#8A2FA3" size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[20px] font-bold"><span className="truncate">{profile.name || (signedIn ? "Your profile" : "Sign in")}</span>{plus && <Crown size={16} className="shrink-0 text-[#E3A008]" aria-label="Birdie Plus" />}</div>
          <div className="truncate text-[13px] text-[var(--dim)]">{signedIn ? (profile.handle ? `Birdie ID: @${profile.handle}` : "Setting up your username...") : "Keep your work safe and chat with classmates"}</div>
          {profile.institution && <div className="truncate text-[12px] text-[var(--dim)]">{profile.institution}</div>}
        </div>
        <ChevronRight size={18} className="text-[var(--dim)]" />
      </button>

      <div className="mt-2.5 bg-[var(--paper)]">
        <Row icon={<Wallet size={18} />} label="Wallet" sub="Top up, transfers, giveaways and history" right={signedIn ? <span className="text-[14px] font-bold">{naira(balance)}</span> : undefined} onClick={() => setWalletOpen(true)} />
        {signedIn && <Row icon={<KeyRound size={18} />} label="Wallet PIN" sub="Needed to send money and giveaways" onClick={() => setPinOpen(true)} />}
        <Row icon={<Crown size={18} />} label="Birdie Plus" sub={plus ? "You're on Plus" : "ChatGPT and Claude, no ads, unlimited lessons"} onClick={() => openPlus(plus ? "You're on Birdie Plus." : "Get more from Birdie.")} />
      </div>

      {signedIn && (
        <div className="mt-2.5 bg-[var(--paper)]">
          <Row icon={<Tv size={18} />} label="My channel" sub="Your videos, posts and shared courses" onClick={() => setOverlay({ t: "profile", id: "me" })} />
          <Row icon={<BadgeCheck size={18} />} label="Verified accounts" sub="SUG, departments, companies with SIWES" onClick={() => setChatView({ k: "verified" })} />
        </div>
      )}

      {managed.length > 0 && (
        <div className="mt-2.5 bg-[var(--paper)]">
          <div className="px-4 pt-3 text-[12px] font-semibold text-[var(--dim)]">Accounts you run</div>
          {managed.map((m) => (
            <button key={m.id} onClick={() => setChatView({ k: "manage", id: m.id })} className="flex w-full items-center gap-3 border-b border-[var(--line)] px-4 py-3 text-left last:border-0 active:bg-[var(--paper-dim)]">
              <OALogo a={m} size={36} />
              <span className="min-w-0 flex-1"><span className="flex items-center gap-1 text-[14.5px] font-semibold"><span className="truncate">{m.name}</span><Tick /></span><span className="block text-[12px] text-[var(--dim)]">{m.followers} follower{m.followers === 1 ? "" : "s"}</span></span>
              {m.unread > 0 && <span className="rounded-full bg-[#E5484D] px-1.5 text-[11px] font-bold text-white">{m.unread}</span>}
              <ChevronRight size={16} className="text-[var(--dim)]" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-2.5 bg-[var(--paper)]">
        {signedIn && managed.length === 0 && <Row icon={<ShieldCheck size={18} />} label="Get a verified account" sub="For companies, SUGs and departments" onClick={() => setApply(true)} />}
        <Row icon={<HelpCircle size={18} />} label="How Birdie works" onClick={() => setTourOpen(true)} />
        <Row icon={<Cog size={18} />} label="Settings" sub="Profile, privacy, notifications, theme" onClick={() => setOverlay({ t: "settings" })} />
      </div>
      <ApplyVerifiedSheet open={apply} onClose={() => setApply(false)} />
      <ChangePin open={pinOpen} onClose={() => setPinOpen(false)} />
    </div>
  );
}

function ChangePin({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { flash } = useApp();
  const [has, setHas] = useState<boolean | null>(null);
  const [f, setF] = useState({ old: "", pin: "", again: "" });
  useEffect(() => { if (open) { void Promise.resolve().then(() => setF({ old: "", pin: "", again: "" })); void hasPin().then(setHas); } }, [open]);
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);
  async function save() {
    if (f.pin !== f.again) { flash("The new PINs don't match"); return; }
    const r = await setPin(f.pin, has ? f.old : undefined);
    if (r.ok) { flash(has ? "PIN changed" : "PIN set"); onClose(); return; }
    flash(r.error === "wrong" ? "Your current PIN is wrong" : r.error === "locked" ? "Too many wrong tries. Wait 30 minutes." : r.error === "pin_weak" ? "Pick a PIN that's harder to guess" : "Couldn't save the PIN");
  }
  const field = "w-full rounded-xl bg-[var(--paper-dim)] px-3.5 py-3 text-center text-[20px] tracking-[0.5em] outline-none";
  return (
    <Sheet open={open} onClose={onClose} title={has ? "Change wallet PIN" : "Set a wallet PIN"}>
      {has === null ? <p className="py-4 text-center text-[13px] text-[var(--dim)]">Loading...</p> : (
        <div className="space-y-2.5">
          {has && <input value={f.old} onChange={(e) => setF((x) => ({ ...x, old: digits(e.target.value) }))} inputMode="numeric" type="password" placeholder="Current PIN" className={field} />}
          <input value={f.pin} onChange={(e) => setF((x) => ({ ...x, pin: digits(e.target.value) }))} inputMode="numeric" type="password" placeholder="New PIN" className={field} />
          <input value={f.again} onChange={(e) => setF((x) => ({ ...x, again: digits(e.target.value) }))} inputMode="numeric" type="password" placeholder="New PIN again" className={field} />
          <Btn disabled={f.pin.length !== 4 || f.again.length !== 4 || (has && f.old.length !== 4)} onClick={() => void save()}>Save PIN</Btn>
          <p className="text-[11.5px] leading-snug text-[var(--dim)]">Forgot it? Message Unisupport Help in Chats and the team will reset it after checking it&apos;s you.</p>
        </div>
      )}
    </Sheet>
  );
}
