"use client";

// Settings > Security and Your data. Anything someone could do damage with on your unlocked phone
// (signing your other devices out, downloading your data, deleting your account, changing your
// password or your main phone) asks for your password first. Your main phone is the one you trust:
// when these happen on any other device, your account gets a notification so your main phone sees it.
import { AlertTriangle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { myMainDevice, secureAction, thisDevice, type Secure } from "./live/verifyData";
import { naira, useApp } from "./store";
import { Page } from "./ui";

/** Asks for your password, runs the action on the server, and hands back the result. */
export function PasswordSheet({ open, action, title, sub, cta, danger, onClose, onDone }: {
  open: boolean; action: Secure; title: string; sub: string; cta: string; danger?: boolean; onClose: () => void; onDone: (r: Record<string, unknown>) => void | Promise<void>;
}) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { if (open) void Promise.resolve().then(() => { setPw(""); setErr(""); }); }, [open]);
  async function go() {
    setBusy(true); setErr("");
    const r = await secureAction(action, pw);
    if (r.error) { setBusy(false); setErr(r.error === "wrong_password" ? "That password is wrong" : r.error === "locked" ? "Too many wrong tries. Wait 30 minutes." : "Couldn't do it right now. Try again."); return; }
    await onDone(r);
    setBusy(false);
  }
  return (
    <Page open={open} onClose={onClose} title={title}>
      <p className="px-4 pb-3 pt-4 text-[14px] leading-snug text-[var(--we-sub)]">{sub}</p>
      <div className="bg-[var(--we-cell)] px-4">
        <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && pw) void go(); }} placeholder="Your Birdie password" autoComplete="current-password"
          className="w-full bg-transparent py-3.5 text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
      </div>
      {err && <p className="px-4 pt-2 text-[13.5px] text-[var(--we-red)]">{err}</p>}
      <div className="px-4 pt-5"><button disabled={!pw || busy} onClick={() => void go()} className={`w-full rounded-[6px] py-3 text-[16px] font-medium text-white disabled:opacity-40 ${danger ? "bg-[var(--we-red)]" : "bg-[var(--we-accent)]"}`}>{busy ? "Checking..." : cta}</button></div>
    </Page>
  );
}

/** Settings > Security: your main phone, password, other devices. */
export function SecurityRows({ Row }: { Row: (p: { label: string; sub?: string; onClick: () => void; danger?: boolean }) => React.ReactElement }) {
  const { flash } = useApp();
  const [main, setMain] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [ask, setAsk] = useState<null | "main" | "others" | "password">(null);
  const [newPw, setNewPw] = useState({ a: "", b: "" });
  const [pwPage, setPwPage] = useState(false);
  const me = thisDevice();
  useEffect(() => { void myMainDevice().then((d) => setMain(d ?? null)); }, []);
  const mainLabel = main === undefined ? "..." : main === null ? "Not set" : main.id === me.id ? `This phone (${main.name})` : main.name;
  return (
    <>
      <Row label="Main phone" sub={main && main.id !== me.id ? `${mainLabel}. You're on ${me.name}.` : mainLabel} onClick={() => (main?.id === me.id ? flash("This is already your main phone") : setAsk("main"))} />
      <Row label="Change password" onClick={() => setAsk("password")} />
      <Row label="Sign out of other devices" sub="Keeps you signed in here" onClick={() => setAsk("others")} />

      <PasswordSheet open={ask === "main"} action="main" title="Main Phone" cta="Make This My Main Phone"
        sub={`Your main phone is the one you trust. If someone signs out your devices, downloads your data or deletes your account from any other phone, your main phone gets told. This phone: ${me.name}.`}
        onClose={() => setAsk(null)} onDone={() => { setAsk(null); setMain(me); flash("This is now your main phone"); }} />
      <PasswordSheet open={ask === "others"} action="check" title="Sign Out Other Devices" cta="Sign Them Out"
        sub="Everywhere else you're signed in gets signed out. You stay signed in here."
        onClose={() => setAsk(null)} onDone={async () => { const { error } = await createClient().auth.signOut({ scope: "others" }); setAsk(null); flash(error ? "Couldn't sign out other devices" : "Signed out everywhere else"); }} />
      <PasswordSheet open={ask === "password"} action="verify" title="Change Password" cta="Next" sub="First, your current password."
        onClose={() => setAsk(null)} onDone={() => { setAsk(null); setNewPw({ a: "", b: "" }); setPwPage(true); }} />
      <Page open={pwPage} onClose={() => setPwPage(false)} title="New Password">
        <div className="mt-3 bg-[var(--we-cell)] px-4">
          <input type="password" autoFocus value={newPw.a} onChange={(e) => setNewPw((x) => ({ ...x, a: e.target.value }))} placeholder="New password (8 or more characters)" autoComplete="new-password" className="w-full border-b border-[var(--we-sep)] bg-transparent py-3.5 text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
          <input type="password" value={newPw.b} onChange={(e) => setNewPw((x) => ({ ...x, b: e.target.value }))} placeholder="Type it again" autoComplete="new-password" className="w-full bg-transparent py-3.5 text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
        </div>
        {newPw.b && newPw.a !== newPw.b && <p className="px-4 pt-2 text-[13.5px] text-[var(--we-red)]">They don&apos;t match</p>}
        <div className="px-4 pt-5"><button disabled={newPw.a.length < 8 || newPw.a !== newPw.b} onClick={async () => { const { error } = await createClient().auth.updateUser({ password: newPw.a }); if (error) return flash(error.message); setPwPage(false); flash("Password changed"); }} className="w-full rounded-[6px] bg-[var(--we-accent)] py-3 text-[16px] font-medium text-white disabled:opacity-40">Change Password</button></div>
      </Page>
    </>
  );
}

/** Settings > Your data: download, and delete (three warnings, then your password). */
export function DataRows({ Row }: { Row: (p: { label: string; sub?: string; onClick: () => void; danger?: boolean }) => React.ReactElement }) {
  const { flash, profile, settings, folders, courses, balance, signOut, resetAll, setOverlay } = useApp();
  const [ask, setAsk] = useState<null | "export" | "delete">(null);
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState("");
  function download(server: Record<string, unknown>) {
    const local = { profile, settings, folders, courses: courses.map((c) => ({ ...c, files: c.files.map(({ url, ...f }) => { void url; return f; }), recs: c.recs.map(({ url, ...r }) => { void url; return r; }) })) };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ ...server, on_this_phone: local }, null, 2)], { type: "application/json" }));
    a.download = `birdie-data-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setAsk(null); flash("Your data was downloaded");
  }
  const lose = [
    balance > 0 ? `Your balance of ${naira(balance)}. Withdraw it first.` : null,
    `${courses.length} course${courses.length === 1 ? "" : "s"}, with every note, file and recording in them`,
    "Your chats, groups, Moments, posts and channel",
    "Your Birdie ID, followers, friends and badges",
    "Any verified tick or rep role",
  ].filter(Boolean) as string[];
  return (
    <>
      <Row label="Download my data" sub="Everything Birdie has on you, as a file" onClick={() => setAsk("export")} />
      <Row label="Delete my account" danger onClick={() => { setStep(1); setTyped(""); }} />
      <PasswordSheet open={ask === "export"} action="export" title="Download My Data" cta="Download" sub="Your profile, courses, messages, posts, wallet history and notifications, in one file."
        onClose={() => setAsk(null)} onDone={(r) => download(r)} />

      {/* Warning 1: what goes */}
      <Page open={step === 1} onClose={() => setStep(0)} title="Delete Account">
        <div className="flex flex-col items-center px-6 pb-4 pt-8 text-center"><AlertTriangle size={44} className="text-[var(--we-red)]" /><p className="mt-3 text-[18px] font-medium text-[var(--we-text)]">This deletes everything</p><p className="mt-1 text-[14px] text-[var(--we-sub)]">You lose all of this, on every device:</p></div>
        <div className="bg-[var(--we-cell)]">{lose.map((l) => <div key={l} className="border-b border-[var(--we-sep)] px-4 py-3 text-[15px] text-[var(--we-text)] last:border-0">{l}</div>)}</div>
        <div className="space-y-2 px-4 pt-6">
          <button onClick={() => setStep(2)} className="w-full rounded-[6px] bg-[var(--we-cell)] py-3 text-[16px] font-medium text-[var(--we-red)]">Continue</button>
          <button onClick={() => { setStep(0); setAsk("export"); }} className="w-full py-2 text-[15px] text-[var(--we-link)]">Download my data first</button>
        </div>
      </Page>
      {/* Warning 2: no undo */}
      <Page open={step === 2} onClose={() => setStep(1)} title="Delete Account">
        <div className="px-6 pb-4 pt-8 text-center"><p className="text-[18px] font-medium text-[var(--we-text)]">There&apos;s no undo</p><p className="mt-2 text-[14px] leading-snug text-[var(--we-sub)]">Birdie can&apos;t bring any of it back, not even if you ask Unisupport Help. If you just need a break, log out instead.</p></div>
        <div className="space-y-2 px-4 pt-2">
          <button onClick={() => setStep(3)} className="w-full rounded-[6px] bg-[var(--we-cell)] py-3 text-[16px] font-medium text-[var(--we-red)]">I understand, continue</button>
          <button onClick={() => { setStep(0); setOverlay(null); }} className="w-full py-2 text-[15px] text-[var(--we-link)]">Keep my account</button>
        </div>
      </Page>
      {/* Warning 3: type it */}
      <Page open={step === 3} onClose={() => setStep(2)} title="Delete Account">
        <p className="px-4 pb-3 pt-6 text-[14px] text-[var(--we-sub)]">Last check. Type DELETE to confirm.</p>
        <div className="bg-[var(--we-cell)] px-4"><input value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} placeholder="DELETE" className="w-full bg-transparent py-3.5 text-[16px] tracking-widest text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" /></div>
        <div className="px-4 pt-5"><button disabled={typed !== "DELETE"} onClick={() => { setStep(0); setAsk("delete"); }} className="w-full rounded-[6px] bg-[var(--we-red)] py-3 text-[16px] font-medium text-white disabled:opacity-40"><span className="inline-flex items-center gap-2"><Trash2 size={17} /> Delete My Account</span></button></div>
      </Page>
      <PasswordSheet open={ask === "delete"} action="delete" danger title="Delete Account" cta="Delete Forever" sub="Your password, and your account is gone."
        onClose={() => setAsk(null)} onDone={async () => { setAsk(null); setOverlay(null); flash("Your account was deleted"); await signOut(); resetAll(); }} />
    </>
  );
}

