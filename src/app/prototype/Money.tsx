"use client";

// Money in chats: transfers (one-to-one) and giveaways (money or airtime, in one-to-one or group
// chats), both protected by a 4-digit wallet PIN. The money stays inside Birdie (closed loop).
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, Delete, Gift, Lock, Phone, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { claimAirtime, claimGiveaway, createGiveaway, giveawayInfo, hasPin, moneyError, sendMoney, setPin, type ChatMsg, type GiveawayInfo, type Scope } from "./live/chatData";
import { initials } from "./PostCard";
import { naira, useApp } from "./store";
import { Avatar, Btn, Segmented, Sheet } from "./ui";

// ---------------------------------------------------------------- PIN

function Keypad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) => k === "" ? <span key={i} /> : (
        <button key={k} onClick={() => onKey(k)} aria-label={k === "del" ? "Delete" : k} className="flex h-14 items-center justify-center rounded-2xl bg-[var(--paper-dim)] text-[22px] font-semibold text-[var(--text)] active:scale-95">
          {k === "del" ? <Delete size={20} /> : k}
        </button>
      ))}
    </div>
  );
}

/**
 * Ask for the wallet PIN, or set one up first. `onPin` runs the money action and returns an error
 * message (shown, and the PIN is cleared) or null on success.
 */
export function PinSheet({ open, title, sub, onClose, onPin }: { open: boolean; title: string; sub?: string; onClose: () => void; onPin: (pin: string) => Promise<string | null> }) {
  const [stage, setStage] = useState<"loading" | "enter" | "new" | "confirm">("loading");
  const [pin, setPinDigits] = useState("");
  const [first, setFirst] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    void Promise.resolve().then(() => { setPinDigits(""); setFirst(""); setErr(""); setStage("loading"); });
    void hasPin().then((h) => setStage(h ? "enter" : "new"));
  }, [open]);

  async function complete(p: string) {
    if (stage === "new") { setFirst(p); setPinDigits(""); setStage("confirm"); return; }
    if (stage === "confirm") {
      if (p !== first) { setErr("The PINs didn't match. Start again."); setStage("new"); setPinDigits(""); return; }
      setBusy(true);
      const r = await setPin(p);
      if (!r.ok) { setBusy(false); setErr(r.error === "pin_weak" ? "That PIN is too easy to guess. Pick another." : "Couldn't save your PIN"); setStage("new"); setPinDigits(""); return; }
    } else setBusy(true);
    const e = await onPin(p);
    setBusy(false);
    if (e) { setErr(e); setPinDigits(""); if (stage === "confirm") setStage("enter"); }
  }
  function key(k: string) {
    if (busy) return;
    setErr("");
    if (k === "del") { setPinDigits((x) => x.slice(0, -1)); return; }
    const next = (pin + k).slice(0, 4);
    setPinDigits(next);
    if (next.length === 4) void complete(next);
  }
  const heading = stage === "new" ? "Create a wallet PIN" : stage === "confirm" ? "Enter it again" : title;
  const hint = stage === "new" ? "4 digits. You'll use it every time you send money. Don't share it with anyone." : stage === "confirm" ? "Just to be sure." : sub;
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="space-y-4 pb-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--uni-soft)] text-[var(--uni-deep)]"><Lock size={20} /></div>
        <div><div className="disp text-[18px] font-bold">{heading}</div>{hint && <p className="mt-1 text-[13px] text-[var(--dim)]">{hint}</p>}</div>
        <div className="flex justify-center gap-3">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-3.5 w-3.5 rounded-full ${i < pin.length ? "bg-[var(--ink)]" : "bg-[var(--line)]"}`} />)}</div>
        <div className="min-h-[18px] text-[12.5px] font-semibold text-[var(--help)]">{busy ? <span className="text-[var(--dim)]">Working...</span> : err}</div>
        {stage !== "loading" && <Keypad onKey={key} />}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- transfer

export function TransferSheet({ open, onClose, thread, to, onSent, amount: preset }: { open: boolean; onClose: () => void; thread: string; to: { name: string; handle: string | null; color: string }; onSent: (m: ChatMsg) => void; amount?: number }) {
  const { balance, refreshWallet, setWalletOpen, flash } = useApp();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPinOpen] = useState(false);
  useEffect(() => { if (open) void Promise.resolve().then(() => { setAmount(preset ? String(preset) : ""); setNote(""); void refreshWallet(); }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = Number(amount || 0);
  function key(k: string) { setAmount((a) => (k === "del" ? a.slice(0, -1) : (a + k).replace(/^0+/, "").slice(0, 6))); }
  return (
    <>
      <Sheet open={open && !pin} onClose={onClose}>
        <div className="space-y-4">
          <div className="flex items-center gap-3"><Avatar initials={initials(to.name)} color={to.color} size={44} /><div><div className="text-[13px] text-[var(--dim)]">Transfer to</div><div className="text-[16px] font-bold">{to.name}{to.handle ? <span className="font-normal text-[var(--dim)]"> @{to.handle}</span> : null}</div></div></div>
          <div className="rounded-2xl bg-[var(--paper-dim)] px-4 py-3"><div className="text-[12px] font-semibold text-[var(--dim)]">Amount</div><div className="disp flex items-baseline gap-1 text-[36px] font-bold"><span className="text-[24px]">₦</span>{n ? n.toLocaleString() : <span className="text-[var(--line)]">0</span>}</div></div>
          <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 60))} placeholder="Add a note (optional)" className="w-full rounded-xl bg-[var(--paper-dim)] px-3.5 py-3 text-[14px] outline-none" />
          <div className="flex items-center justify-between text-[12.5px] text-[var(--dim)]"><span>Wallet: <b className="text-[var(--text)]">{naira(balance)}</b></span><button onClick={() => { onClose(); setWalletOpen(true); }} className="font-bold text-[var(--uni-deep)]">Top up</button></div>
          <Keypad onKey={key} />
          <Btn disabled={n < 50} onClick={() => { if (n > balance) { flash("Not enough in your wallet. Top up first."); return; } setPinOpen(true); }}>{n >= 50 ? `Send ${naira(n)}` : "Minimum ₦50"}</Btn>
          <p className="text-center text-[11.5px] leading-snug text-[var(--dim)]">Money arrives instantly and can be spent anywhere in Birdie. Only send to people you know.</p>
        </div>
      </Sheet>
      <PinSheet open={pin} title={`Send ${naira(n)}`} sub={`To ${to.name}`} onClose={() => setPinOpen(false)} onPin={async (p) => {
        const r = await sendMoney(thread, n, note, p);
        if (!r.ok) return moneyError(r.error, r);
        void refreshWallet(); setPinOpen(false); onClose(); flash(`${naira(n)} sent`);
        if (r.message) onSent(r.message);
        return null;
      }} />
    </>
  );
}

export function TransferCard({ msg, otherName }: { msg: ChatMsg; otherName: string }) {
  const amt = Number((msg.meta as { amount?: number }).amount ?? 0);
  return (
    <div className="w-[230px] overflow-hidden rounded-2xl bg-[#F59E3B] text-white shadow-sm">
      <div className="flex items-center gap-3 px-3.5 py-3"><span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80"><ArrowLeftRight size={18} /></span>
        <div className="min-w-0"><div className="disp text-[18px] font-bold leading-tight">{naira(amt)}</div><div className="truncate text-[12px] text-white/85">{msg.body || (msg.mine ? `Sent to ${otherName}` : "Received")}</div></div></div>
      <div className="bg-white px-3.5 py-1.5 text-[11px] font-semibold text-[#B86B16]">{msg.mine ? "Transfer · sent" : "Transfer · in your wallet"}</div>
    </div>
  );
}

// ---------------------------------------------------------------- giveaways

export function GiveawaySheet({ open, onClose, scope, target, members, onSent }: { open: boolean; onClose: () => void; scope: Scope; target: string; members?: number; onSent: (m: ChatMsg) => void }) {
  const { balance, refreshWallet, setWalletOpen, flash } = useApp();
  const [kind, setKind] = useState<"money" | "airtime">("money");
  const [mode, setMode] = useState<"random" | "equal">("random");
  const [count, setCount] = useState("1");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPinOpen] = useState(false);
  useEffect(() => { if (open) void Promise.resolve().then(() => { setAmount(""); setNote(""); setCount(scope === "dm" ? "1" : String(Math.min(5, Math.max(1, members ?? 1)))); void refreshWallet(); }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const cnt = scope === "dm" ? 1 : Math.max(1, Number(count || 0));
  const eachMode = kind === "airtime" || mode === "equal";
  const total = eachMode ? Number(amount || 0) * cnt : Number(amount || 0);
  const valid = total > 0 && (kind === "airtime" ? Number(amount) >= 50 && Number(amount) <= 2000 : total >= 10 * cnt);
  return (
    <>
      <Sheet open={open && !pin} onClose={onClose} title={scope === "dm" ? "Send a giveaway" : "Drop a giveaway"}>
        <div className="space-y-3">
          <Segmented value={kind} onChange={setKind} options={[{ id: "money", label: "Money" }, { id: "airtime", label: "Airtime" }]} />
          {scope === "group" && kind === "money" && <Segmented value={mode} onChange={setMode} options={[{ id: "random", label: "Lucky draw (random)" }, { id: "equal", label: "Same for all" }]} />}
          {scope === "group" && (
            <label className="flex items-center justify-between rounded-xl bg-[var(--paper-dim)] px-3.5 py-3 text-[14px]"><span className="font-semibold">How many people</span>
              <input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, "").slice(0, 3))} className="w-20 bg-transparent text-right text-[15px] font-bold outline-none" /></label>
          )}
          <label className="flex items-center justify-between rounded-xl bg-[var(--paper-dim)] px-3.5 py-3 text-[14px]"><span className="font-semibold">{eachMode && scope === "group" ? "Amount each" : kind === "airtime" ? "Airtime amount" : "Total amount"}</span>
            <span className="flex items-center gap-1"><span className="text-[var(--dim)]">₦</span><input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="0" className="w-24 bg-transparent text-right text-[15px] font-bold outline-none" /></span></label>
          <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 60))} placeholder="Best wishes" className="w-full rounded-xl bg-[var(--paper-dim)] px-3.5 py-3 text-[14px] outline-none" />
          <div className="disp py-2 text-center text-[38px] font-bold">{naira(total)}</div>
          <p className="text-center text-[12px] leading-snug text-[var(--dim)]">
            {kind === "airtime" ? "First come, first served: whoever opens it first types their number and gets the airtime." : scope === "dm" ? "They see the amount when they open it." : mode === "random" ? "Everyone who opens one gets a random amount. First come, first served." : "Everyone who opens one gets the same amount."}
            {" "}Unclaimed money comes back to you after 24 hours.
          </p>
          <div className="flex items-center justify-between text-[12.5px] text-[var(--dim)]"><span>Wallet: <b className="text-[var(--text)]">{naira(balance)}</b></span><button onClick={() => { onClose(); setWalletOpen(true); }} className="font-bold text-[var(--uni-deep)]">Top up</button></div>
          <button disabled={!valid} onClick={() => { if (total > balance) { flash("Not enough in your wallet. Top up first."); return; } setPinOpen(true); }} className="w-full rounded-2xl bg-[#E5484D] px-5 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.97] disabled:opacity-40">Prepare giveaway</button>
        </div>
      </Sheet>
      <PinSheet open={pin} title={`Give away ${naira(total)}`} sub={kind === "airtime" ? "Airtime giveaway" : undefined} onClose={() => setPinOpen(false)} onPin={async (p) => {
        const r = await createGiveaway(scope, target, { kind, total, count: cnt, mode: kind === "airtime" ? "equal" : mode, note }, p);
        if (!r.ok) return moneyError(r.error, r);
        void refreshWallet(); setPinOpen(false); onClose(); flash("Giveaway sent");
        if (r.message) onSent(r.message);
        return null;
      }} />
    </>
  );
}

export function PacketCard({ msg, opened, onOpen }: { msg: ChatMsg; opened: boolean; onOpen: () => void }) {
  const airtime = (msg.meta as { kind?: string }).kind === "airtime";
  return (
    <button onClick={onOpen} className={`block w-[230px] overflow-hidden rounded-2xl text-left text-white shadow-sm transition active:scale-[0.98] ${opened ? "bg-[#F2A0A2]" : "bg-[#E5484D]"}`}>
      <div className="flex items-center gap-3 px-3.5 py-3">
        <span className="flex h-11 w-9 items-center justify-center rounded-md bg-[#FFC94D] text-[#B3262B]">{airtime ? <Smartphone size={17} /> : <Gift size={17} />}</span>
        <div className="min-w-0"><div className="truncate text-[14.5px] font-bold">{msg.body || (airtime ? "Airtime for you!" : "Best wishes")}</div><div className="text-[12px] text-white/85">{opened ? "Opened" : "Tap to open"}</div></div>
      </div>
      <div className="bg-white px-3.5 py-1.5 text-[11px] font-semibold text-[#B3262B]">{airtime ? "Birdie airtime giveaway" : "Birdie giveaway"}</div>
    </button>
  );
}

/** Opening a giveaway: the envelope, the amount you got, and who else got what. */
export function GiveawayOpen({ id, onClose, onOpened }: { id: string | null; onClose: () => void; onOpened: (id: string) => void }) {
  const { refreshWallet, flash, phone: phoneEl } = useApp();
  const [info, setInfo] = useState<GiveawayInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [got, setGot] = useState<number | null>(null);
  const [num, setNum] = useState(""); const [net, setNet] = useState("mtn");
  const load = (gid: string) => giveawayInfo(gid).then((i) => { setInfo(i); if (i?.mine) { setGot(Number(i.mine.amount)); onOpened(gid); } });
  useEffect(() => { if (!id) return; void Promise.resolve().then(() => { setInfo(null); setGot(null); setNum(""); }); void load(id); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function open() {
    if (!info || busy) return;
    setBusy(true);
    const r = info.kind === "airtime" ? await claimAirtime(info.id, num, net) : await claimGiveaway(info.id);
    setBusy(false);
    if (r.ok) { setGot(Number(r.amount)); onOpened(info.id); void refreshWallet(); void load(info.id); return; }
    if (r.error === "claimed") { void load(info.id); return; }
    flash(r.error === "provider" ? "The airtime didn't go through. Try again in a moment." : r.error === "airtime_off" ? "Airtime giveaways switch on soon." : moneyError(r.error));
    void load(info.id);
  }
  const canOpen = info && !info.mine && !info.expired && info.claimed < info.count && !(info.mine_sent && info.count === 1);
  const best = info && info.mode === "random" && info.claimed === info.count ? Math.max(...info.claims.map((c) => Number(c.amount))) : null;
  if (!phoneEl) return null;
  return (
    <Sheet open={!!id} onClose={onClose}>
      {!info ? <div className="py-10 text-center text-[13px] text-[var(--dim)]">Opening...</div> : (
        <div className="space-y-4">
          <div className="-mx-5 -mt-3 rounded-b-[40px] bg-[#E5484D] px-5 pb-8 pt-6 text-center text-white">
            <div className="mx-auto w-fit"><Avatar initials={initials(info.sender.name)} color={info.sender.color} size={48} /></div>
            <div className="mt-2 text-[14px] font-semibold">{info.mine_sent ? "Your giveaway" : `From ${info.sender.name}`}</div>
            <div className="text-[13px] text-white/85">{info.note || (info.kind === "airtime" ? "Airtime for you!" : "Best wishes")}</div>
            <AnimatePresence mode="wait">
              {got !== null ? (
                <motion.div key="got" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="disp mt-3 text-[40px] font-bold text-[#FFE08A]">{naira(got)}{info.kind === "airtime" && <span className="block text-[13px] font-semibold text-white/90">airtime sent to your phone</span>}</motion.div>
              ) : canOpen ? (
                <motion.div key="open" exit={{ rotateY: 90 }} className="mt-4 space-y-2">
                  {info.kind === "airtime" && (
                    <div className="mx-auto max-w-[260px] space-y-2 text-left">
                      <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2"><Phone size={15} /><input value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, "").slice(0, 11))} inputMode="tel" placeholder="080..." className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/60" /></div>
                      <div className="grid grid-cols-4 gap-1">{["mtn", "glo", "airtel", "etisalat"].map((n) => <button key={n} onClick={() => setNet(n)} className={`rounded-lg py-1.5 text-[11.5px] font-bold uppercase ${net === n ? "bg-white text-[#B3262B]" : "bg-white/15"}`}>{n === "etisalat" ? "9mobile" : n}</button>)}</div>
                    </div>
                  )}
                  <button onClick={() => void open()} disabled={busy || (info.kind === "airtime" && num.length !== 11)} className="disp mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FFC94D] text-[24px] font-bold text-[#B3262B] shadow-lg transition active:scale-90 disabled:opacity-60">{busy ? "..." : "Open"}</button>
                </motion.div>
              ) : (
                <div className="mt-3 text-[14px] font-semibold text-white/90">{info.expired ? "This giveaway has expired." : info.mine_sent ? (info.claimed < info.count ? "Waiting for people to open it." : "Everyone has opened it.") : "All gone! Better luck next time."}</div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-between text-[12.5px] text-[var(--dim)]"><span>{info.claimed} of {info.count} opened{info.mine_sent ? ` · ${naira(Number(info.total))} total` : ""}</span>{info.expired && info.mine_sent && <span>Unclaimed money returned</span>}</div>
          <div className="space-y-1">{info.claims.map((c) => (
            <div key={c.person.id} className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
              <Avatar initials={initials(c.person.name)} color={c.person.color} size={32} />
              <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold">{c.person.name}</div><div className="text-[11px] text-[var(--dim)]">{new Date(c.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{best !== null && Number(c.amount) === best ? " · luckiest" : ""}</div></div>
              <div className="text-[13.5px] font-bold">{naira(Number(c.amount))}{c.status === "pending" ? " ..." : ""}</div>
            </div>
          ))}</div>
        </div>
      )}
    </Sheet>
  );
}
