"use client";

// Me, laid out like WeChat's: you (name, Birdie ID, QR code), then Services (Money, Wallet, campus
// services), Favorites, My Posts, Cards & Offers, Sticker Gallery and Settings. Nothing that already
// lives in Chats or Discover.
import { ChevronRight, CreditCard, Crown, Images, QrCode, Settings as Cog, Smile, Star, Trash2, CircleCheckBig } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { favText, readFavs, writeFavs, type Fav } from "./ChatRoom";
import { chatMediaUrl, hasPin, setPin } from "./live/chatData";
import { MyProfilePage, MyQrPage, ServicesPage } from "./MeServices";
import { useBackLayer } from "./nav";
import { useApp } from "./store";
import { Btn, Sheet } from "./ui";
import { Cell, CellGroup, SqAvatar, WeHeader } from "./we";

const ic = (n: ReactNode, color: string) => <span className="flex h-6 w-6 items-center justify-center" style={{ color }}>{n}</span>;

export default function Me({ active }: { active: boolean }) {
  const { profile, auth, plus, openPlus, setOverlay, setAuthOpen, setTab, setDiscoverView, refreshWallet } = useApp();
  const [pinOpen, setPinOpen] = useState(false);
  const [sub, setSub] = useState<null | "favorites" | "stickers" | "services" | "profile" | "qr">(null);
  useBackLayer(!!sub, () => setSub(null));
  useBackLayer(sub === "qr", () => setSub("profile")); // QR code opens on top of My Profile
  const signedIn = auth.status === "in";
  const load = useCallback(() => { if (signedIn) void refreshWallet(); }, [signedIn, refreshWallet]);
  useEffect(() => { if (active) void Promise.resolve().then(load); }, [active, load]);
  const need = (f: () => void) => () => (signedIn ? f() : setAuthOpen(true));

  if (sub === "favorites") return <Favorites onBack={() => setSub(null)} />;
  if (sub === "stickers") return <Stickers onBack={() => setSub(null)} />;
  if (sub === "services") return <><ServicesPage onBack={() => setSub(null)} onPin={() => setPinOpen(true)} /><ChangePin open={pinOpen} onClose={() => setPinOpen(false)} /></>;
  if (sub === "profile") return <MyProfilePage onBack={() => setSub(null)} onQr={() => setSub("qr")} />;
  if (sub === "qr") return <MyQrPage onBack={() => setSub("profile")} />;

  return (
    <div className="no-scrollbar flex h-full flex-col overflow-y-auto bg-[var(--we-bg)] pb-28">
      <div className="flex items-center gap-4 bg-[var(--we-cell)] px-6 pb-8 pt-14">
        <button onClick={() => (signedIn ? setSub("profile") : setAuthOpen(true))} className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <SqAvatar name={profile.name || "Me"} color="#8A2FA3" size={64} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[21px] font-semibold text-[var(--we-text)]"><span className="truncate">{profile.name || (signedIn ? "Your profile" : "Sign in")}</span>{plus && <Crown size={16} className="shrink-0 text-[#E3A008]" aria-label="Birdie Plus" />}</span>
            <span className="mt-1 block truncate text-[14px] text-[var(--we-sub)]">{signedIn ? (profile.handle ? `Birdie ID: ${profile.handle}` : "Setting up your Birdie ID...") : "Keep your work safe and chat with classmates"}</span>
          </span>
        </button>
        {signedIn && <button onClick={() => setSub(profile.handle ? "qr" : "profile")} aria-label="My QR code" className="flex items-center gap-1 text-[var(--we-sub)]"><QrCode size={18} /><ChevronRight size={18} className="text-[var(--we-hint)]" /></button>}
      </div>

      <CellGroup>
        <Cell icon={ic(<CircleCheckBig size={22} />, "#2AAE67")} label="Services" onClick={() => setSub("services")} />
      </CellGroup>
      <CellGroup>
        <Cell icon={ic(<Star size={22} />, "#F5A623")} label="Favorites" onClick={() => setSub("favorites")} />
        <Cell icon={ic(<Images size={22} />, "#3D83F7")} label="My Posts" onClick={need(() => { setTab("explore"); setDiscoverView(auth.userId ? { k: "userMoments", id: auth.userId } : { k: "moments" }); })} />
        <Cell icon={ic(<CreditCard size={22} />, "#1B8A85")} label="Cards & Offers" sub={plus ? "Birdie Plus is on" : "Birdie Plus, Exam Pass and student offers"} onClick={() => openPlus(plus ? "You're on Birdie Plus." : "Get more from Birdie.")} />
        <Cell icon={ic(<Smile size={22} />, "#F5C518")} label="Sticker Gallery" onClick={() => setSub("stickers")} />
      </CellGroup>
      <CellGroup>
        <Cell icon={ic(<Cog size={22} />, "#3D83F7")} label="Settings" onClick={() => setOverlay({ t: "settings" })} />
      </CellGroup>
      <ChangePin open={pinOpen} onClose={() => setPinOpen(false)} />
    </div>
  );
}

function Favorites({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<Fav[]>(() => readFavs());
  const del = (id: string) => { const next = items.filter((f) => f.id !== id); setItems(next); writeFavs(next); };
  return (
    <div className="flex h-full flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="Favorites" />
      <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-24 pt-2">
        {items.length === 0 ? <p className="px-8 py-16 text-center text-[14px] text-[var(--we-sub)]">Hold a message in any chat and tap Favorite to keep it here.</p>
          : items.map((f) => (
            <div key={f.id} className="flex gap-3 rounded-[6px] bg-[var(--we-cell)] p-3.5">
              <div className="min-w-0 flex-1"><p className="line-clamp-4 whitespace-pre-line break-words text-[15px] text-[var(--we-text)]">{favText(f)}</p><p className="mt-2 text-[12px] text-[var(--we-hint)]">{f.from} · {new Date(f.at).toLocaleDateString()}</p></div>
              <button onClick={() => del(f.id)} aria-label="Remove" className="self-start text-[var(--we-hint)]"><Trash2 size={16} /></button>
            </div>
          ))}
      </div>
    </div>
  );
}

const readStickers = (): string[] => { try { return JSON.parse(localStorage.getItem("birdie-stickers") ?? "[]"); } catch { return []; } };

function Stickers({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<string[]>(readStickers);
  const del = (p: string) => { const next = items.filter((x) => x !== p); setItems(next); try { localStorage.setItem("birdie-stickers", JSON.stringify(next)); } catch { /* ignore */ } };
  return (
    <div className="flex h-full flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="My Stickers" />
      <p className="px-4 pb-2 pt-3 text-[13px] text-[var(--we-sub)]">Add stickers from the emoji panel in any chat. Tap one to remove it.</p>
      <div className="grid grid-cols-4 gap-2 bg-[var(--we-cell)] p-3">
        {items.length === 0 ? <p className="col-span-4 py-8 text-center text-[14px] text-[var(--we-hint)]">No stickers yet</p>
          : items.map((p) => <button key={p} onClick={() => confirm("Remove this sticker?") && del(p)} className="aspect-square overflow-hidden rounded-[4px] bg-[var(--we-bg)]"><StickerImg path={p} /></button>)}
      </div>
    </div>
  );
}

function StickerImg({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let on = true; void chatMediaUrl(path).then((u) => { if (on) setUrl(u); }); return () => { on = false; }; }, [path]);
  return url ? <img src={url} alt="" className="h-full w-full object-contain" /> : null;
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
