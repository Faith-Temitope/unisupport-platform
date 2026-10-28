"use client";

// Me's pages, laid out like WeChat's: My Profile, My QR Code, Services (Money, Wallet and campus
// services), Wallet, Payment Settings and Money (your "Receive Money" code). Plus the pay-by-QR flow:
// scanning someone's Receive Money code (or opening /pay-me/<handle>) opens a transfer to them.
import QRCode from "qrcode";
import { Briefcase, ChevronRight, PenLine, Presentation, Printer, QrCode, ScanLine, ShieldCheck, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { TransferSheet } from "./Money";
import { ApplyVerifiedSheet, OALogo, Tick } from "./Official";
import { TutorialsSection } from "./Tutorials";
import { myManagedOfficials, searchAll, startDm, type OAManaged } from "./live/chatData";
import { useBackLayer } from "./nav";
import { naira, useApp } from "./store";
import { Badge, Cell, CellGroup, SqAvatar, WeHeader } from "./we";

/** The address inside someone's "Receive Money" code. */
export const payMeUrl = (handle: string, amount?: number) => `${window.location.origin}/pay-me/${handle}${amount ? `?amount=${amount}` : ""}`;
/** Open a transfer to a Birdie ID (from a scanned Receive Money code or a /pay-me link). */
// Kept until PayToHost is listening and you're signed in (a link can arrive before either).
let pendingPay: { handle: string; amount?: number } | null = null;
export const payTo = (handle: string, amount?: number) => { pendingPay = { handle, amount }; window.dispatchEvent(new Event("birdie-pay-to")); };

/** Listens for payTo() anywhere in the app and opens the transfer sheet. */
export function PayToHost() {
  const { flash, auth, setAuthOpen } = useApp();
  const [to, setTo] = useState<null | { thread: string; person: { id: string; name: string; handle: string | null; color: string }; amount?: number }>(null);
  useEffect(() => {
    const on = async () => {
      if (!pendingPay || auth.status === "loading") return;
      if (auth.status !== "in") { setAuthOpen(true); return; }
      const { handle, amount } = pendingPay; pendingPay = null;
      const res = await searchAll(handle);
      const p = res.people.find((x) => (x.handle ?? "").toLowerCase() === handle.toLowerCase());
      if (!p) return flash(`No one on Birdie is called @${handle}`);
      if (p.id === auth.userId) return flash("That's your own code");
      const t = await startDm(p.id);
      if (t.error || !t.data) return flash("Couldn't start the payment");
      setTo({ thread: t.data, person: p, amount });
    };
    window.addEventListener("birdie-pay-to", on);
    void on();
    return () => window.removeEventListener("birdie-pay-to", on);
  }, [auth.status, auth.userId, flash, setAuthOpen]);
  if (!to) return null;
  return <TransferSheet open onClose={() => setTo(null)} thread={to.thread} to={to.person} amount={to.amount} onSent={() => { setTo(null); flash(`Paid ${to.person.name}`); }} />;
}

async function qrWithFace(text: string, name: string, color: string) {
  const data = await QRCode.toDataURL(text, { margin: 1, width: 600, errorCorrectionLevel: "H" });
  const img = new Image(); img.src = data; await img.decode();
  const c = document.createElement("canvas"); c.width = 600; c.height = 600;
  const g = c.getContext("2d")!; g.drawImage(img, 0, 0);
  // a small square avatar in the middle, like WeChat's
  const s = 110, x = 245, y = 245;
  g.fillStyle = "#fff"; g.fillRect(x - 8, y - 8, s + 16, s + 16);
  g.fillStyle = color; g.fillRect(x, y, s, s);
  g.fillStyle = "#fff"; g.font = "bold 46px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?", x + s / 2, y + s / 2 + 2);
  return c.toDataURL("image/png");
}
function save(dataUrl: string, name: string) { const a = document.createElement("a"); a.href = dataUrl; a.download = name; a.click(); }

export function MyQrPage({ onBack }: { onBack: () => void }) {
  const { profile, setTab, setDiscoverView } = useApp();
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => { if (profile.handle) void qrWithFace(`${window.location.origin}/u/${profile.handle}`, profile.name || "Me", "#8A2FA3").then(setImg); }, [profile.handle, profile.name]);
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} />
      <div className="flex flex-1 flex-col items-center px-8 pt-6">
        <div className="w-full max-w-[320px] rounded-[8px] bg-white p-6 text-[#191919]">
          <div className="flex items-center gap-3"><SqAvatar name={profile.name || "Me"} color="#8A2FA3" size={48} /><div className="min-w-0"><div className="truncate text-[17px] font-semibold">{profile.name}</div><div className="truncate text-[13px] text-[#7F7F7F]">{profile.institution || (profile.handle ? `@${profile.handle}` : "")}</div></div></div>
          {img ? <img src={img} alt="My Birdie QR code" className="mx-auto mt-5 w-full" /> : <div className="mt-5 aspect-square w-full bg-[#F2F2F2]" />}
          <p className="mt-4 text-center text-[12.5px] text-[#B2B2B2]">Scan the QR code to add me as a friend</p>
        </div>
      </div>
      <div className="flex justify-center gap-10 pb-10 text-[15px] text-[var(--we-link)]">
        <button onClick={() => { setTab("explore"); setDiscoverView({ k: "scan" }); }}>Scan</button>
        <button disabled={!img} onClick={() => img && save(img, `birdie-${profile.handle}.png`)}>Save Image</button>
      </div>
    </div>
  );
}

/** Your Receive Money code: classmates or campus vendors scan it to pay you from their Birdie balance. */
function MoneyPage({ onBack }: { onBack: () => void }) {
  const { profile, setTab, setDiscoverView, flash } = useApp();
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => { if (profile.handle) void qrWithFace(payMeUrl(profile.handle, amount), profile.name || "Me", "#07C160").then(setImg); }, [profile.handle, profile.name, amount]);
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#2AAE67]">
      <div className="text-white"><WeHeader onBack={onBack} title="Money" transparent /></div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-10">
        <div className="rounded-[8px] bg-white p-5 text-[#191919]">
          <div className="flex items-center gap-2 text-[15px] text-[#2AAE67]"><QrCode size={18} /> Receive Money</div>
          <p className="mt-1 text-[12.5px] leading-snug text-[#7F7F7F]">Classmates and campus vendors scan this in Birdie to pay you from their Birdie balance.</p>
          {img ? <img src={img} alt="My Receive Money code" className="mx-auto mt-4 w-[78%]" /> : <div className="mx-auto mt-4 aspect-square w-[78%] bg-[#F2F2F2]" />}
          {amount ? <div className="mt-3 text-center text-[22px] font-semibold">{naira(amount)}</div> : null}
          <div className="mt-4 flex justify-center gap-8 text-[14.5px] text-[#576B95]">
            <button onClick={() => { const v = prompt("Amount to receive (₦)", amount ? String(amount) : ""); if (v === null) return; const n = Math.round(Number(v.replace(/[^\d]/g, ""))); setAmount(n > 0 ? Math.min(n, 500000) : undefined); }}>{amount ? "Change Amount" : "Set Amount"}</button>
            {amount ? <button onClick={() => setAmount(undefined)}>Clear Amount</button> : null}
            <button disabled={!img} onClick={() => { if (img) { save(img, `birdie-pay-${profile.handle}.png`); flash("Saved. Print it for your stand or share it."); } }}>Save Image</button>
          </div>
        </div>
        <div className="mt-3 overflow-hidden rounded-[8px] bg-white/15 text-white">
          <button onClick={() => { setTab("explore"); setDiscoverView({ k: "scan" }); }} className="flex w-full items-center gap-3 px-4 py-4 text-left text-[16px] active:bg-white/10"><ScanLine size={20} /><span className="flex-1">Pay Someone</span><ChevronRight size={18} className="opacity-60" /></button>
        </div>
      </div>
    </div>
  );
}

function PaymentSettings({ onBack, onPin }: { onBack: () => void; onPin: () => void }) {
  const { goHelp } = useApp();
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="Payment Settings" />
      <CellGroup gap={false}>
        <Cell label="Change Wallet PIN" onClick={onPin} />
        <Cell label="Forgot Wallet PIN" onClick={() => goHelp({ mode: "full", courseId: null })} />
      </CellGroup>
      <p className="px-4 pt-2 text-[12.5px] leading-snug text-[var(--we-sub)]">Forgot it? The Unisupport help desk resets it after checking it&apos;s you.</p>
    </div>
  );
}

function Transactions({ onBack }: { onBack: () => void }) {
  const { txs } = useApp();
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="Transactions" />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[var(--we-cell)]">
        {txs.length === 0 ? <p className="py-16 text-center text-[14px] text-[var(--we-sub)]">No transactions yet</p> : txs.map((t) => (
          <div key={t.id} className="flex items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3">
            <span className="min-w-0 flex-1"><span className="block truncate text-[15.5px] text-[var(--we-text)]">{t.label}</span><span className="block text-[12.5px] text-[var(--we-hint)]">{t.t}</span></span>
            <span className={`text-[16px] ${t.amount > 0 ? "text-[#2AAE67]" : "text-[var(--we-text)]"}`}>{t.amount > 0 ? "+" : ""}{naira(t.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type Sub = null | "money" | "wallet" | "tx" | "pay" | "tutorials";

/** Me > Services: Money and Wallet up top, then the campus services Birdie runs. */
export function ServicesPage({ onBack, onPin }: { onBack: () => void; onPin: () => void }) {
  const { balance, setWalletOpen, openPrint, auth, setAuthOpen, setChatView, setTab, refreshWallet } = useApp();
  const [sub, setSub] = useState<Sub>(null);
  const [managed, setManaged] = useState<OAManaged[]>([]);
  const [apply, setApply] = useState(false);
  useBackLayer(!!sub, () => setSub(null));
  useBackLayer(sub === "tx" || sub === "pay", () => setSub("wallet")); // these open on top of Wallet
  const signedIn = auth.status === "in";
  useEffect(() => { if (signedIn) { void myManagedOfficials().then(setManaged); void refreshWallet(); } }, [signedIn]); // eslint-disable-line react-hooks/exhaustive-deps
  const need = (f: () => void) => () => (signedIn ? f() : setAuthOpen(true));

  if (sub === "money") return <MoneyPage onBack={() => setSub(null)} />;
  if (sub === "tx") return <Transactions onBack={() => setSub("wallet")} />;
  if (sub === "pay") return <PaymentSettings onBack={() => setSub("wallet")} onPin={onPin} />;
  if (sub === "tutorials") return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--paper)]">
      <WeHeader onBack={() => setSub(null)} title="Tutorials" />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-2"><TutorialsSection active /></div>
    </div>
  );
  if (sub === "wallet") return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={() => setSub(null)} title="Wallet" right={<button onClick={() => setSub("tx")} className="mr-3 text-[15px]">Transactions</button>} />
      <CellGroup gap={false}>
        <Cell icon={<span className="text-[20px] text-[#F5A623]">₦</span>} label="Balance" value={naira(balance)} onClick={() => setWalletOpen(true)} />
        <Cell icon={<Wallet size={20} className="text-[#3D83F7]" />} label="Top Up" sub="Pay with Paystack, or ask a parent to pay" onClick={() => setWalletOpen(true)} />
      </CellGroup>
      <CellGroup>
        <Cell icon={<ShieldCheck size={20} className="text-[#3D83F7]" />} label="Payment Settings" onClick={() => setSub("pay")} />
      </CellGroup>
    </div>
  );

  const tile = (label: string, Icon: typeof Printer, color: string, run: () => void) => (
    <button key={label} onClick={run} className="flex flex-col items-center gap-2 py-2 active:opacity-70">
      <Icon size={26} strokeWidth={1.6} style={{ color }} /><span className="text-center text-[13px] leading-tight text-[var(--we-text)]">{label}</span>
    </button>
  );
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="Services" />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-10">
        <div className="grid grid-cols-2 rounded-[8px] bg-[#2AAE67] py-6 text-white">
          <button onClick={need(() => setSub("money"))} className="flex flex-col items-center gap-2"><QrCode size={30} strokeWidth={1.5} /><span className="text-[16px]">Money</span></button>
          <button onClick={need(() => setSub("wallet"))} className="flex flex-col items-center gap-2"><Wallet size={30} strokeWidth={1.5} /><span className="text-[16px]">Wallet</span><span className="text-[12.5px] text-white/80">{naira(balance)}</span></button>
        </div>
        <div className="mt-3 rounded-[8px] bg-[var(--we-cell)] px-3 pb-3 pt-3">
          <div className="px-1 pb-2 text-[13.5px] text-[var(--we-sub)]">Campus Services</div>
          <div className="grid grid-cols-4 gap-y-2">
            {tile("Print & Deliver", Printer, "#3D83F7", need(() => openPrint({ kind: "print" })))}
            {tile("Handwriting", PenLine, "#E2553F", need(() => openPrint({ kind: "handwrite" })))}
            {tile("My Print Orders", Printer, "#F5A623", need(() => openPrint({ kind: "orders" })))}
            {tile("Tutorials", Presentation, "#1B8A85", () => setSub("tutorials"))}
          </div>
        </div>
        {signedIn && (
          <div className="mt-3 overflow-hidden rounded-[8px] bg-[var(--we-cell)]">
            <div className="px-4 pb-1 pt-3 text-[13.5px] text-[var(--we-sub)]">Verified Accounts</div>
            {managed.map((m) => (
              <Cell key={m.id} icon={<OALogo a={m} size={24} />} label={<span className="flex items-center gap-1"><span className="truncate">{m.name}</span><Tick /></span>}
                right={m.unread > 0 ? <Badge n={m.unread} /> : undefined} onClick={() => { setTab("chats"); setChatView({ k: "manage", id: m.id }); }} />
            ))}
            {managed.length === 0 && <Cell icon={<Briefcase size={20} className="text-[#2AAE67]" />} label="Get a Verified Account" sub="For SUGs, departments and companies with SIWES" onClick={() => setApply(true)} />}
          </div>
        )}
      </div>
      <ApplyVerifiedSheet open={apply} onClose={() => setApply(false)} />
    </div>
  );
}

/** Me > (your name): your profile, the WeChat way. */
export function MyProfilePage({ onBack, onQr }: { onBack: () => void; onQr: () => void }) {
  const { profile, setOverlay } = useApp();
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="My Profile" />
      <CellGroup gap={false}>
        <Cell label="Name" value={profile.name || "Not set"} onClick={() => setOverlay({ t: "settings" })} />
        <Cell label="Birdie ID" value={profile.handle || "Not set"} chevron={false} />
        <Cell label="My QR Code" right={<QrCode size={18} className="text-[var(--we-sub)]" />} onClick={onQr} />
        <Cell label="More Info" value={[profile.level && `${profile.level}L`, profile.institution].filter(Boolean).join(" · ") || undefined} onClick={() => setOverlay({ t: "settings" })} />
      </CellGroup>
      <CellGroup>
        <Cell label="My Channel" sub="Your videos, posts and shared courses" onClick={() => setOverlay({ t: "profile", id: "me" })} />
      </CellGroup>
    </div>
  );
}
