"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { BirdieMark } from "@/components/brand/Bot";
import { ClimbSplash, SPLASH_BG, Wordmark } from "@/components/brand/Splash";
import { useApp } from "./store";

type Mode = "welcome" | "signup" | "signin" | "forgot" | "sent" | "reset-sent";

export default function Entry() {
  const { boot, setBoot, auth, authOpen, settings } = useApp();
  const showAuth = boot === "done" && (auth.status === "out" || authOpen);
  const skip = settings.reduceMotion;
  // Rendered inline (not portalled) so the cover is part of the server HTML and the app never flashes before it.
  return (
    <>
      <AnimatePresence>
        {boot !== "done" && (
          <motion.div key="boot" className="absolute inset-0 z-[120] flex flex-col items-center justify-center" style={{ background: SPLASH_BG }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
            onClick={() => setBoot(boot === "splash" ? "word" : "done")}>
            {boot === "splash" ? (skip ? <SkipNow onDone={() => setBoot("word")} /> : <ClimbSplash onDone={() => setBoot("word")} scale={1.05} />) : skip ? <SkipNow onDone={() => setBoot("done")} /> : <Wordmark onDone={() => setBoot("done")} />}
            <div className="absolute bottom-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25">Tap to skip</div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{showAuth && <AuthScreen key="auth" />}</AnimatePresence>
      {boot === "done" && auth.status === "loading" && <div className="absolute inset-0 z-[110]" style={{ background: SPLASH_BG }} />}
    </>
  );
}

function SkipNow({ onDone }: { onDone: () => void }) { useEffect(() => { const t = setTimeout(onDone, 50); return () => clearTimeout(t); }, [onDone]); return null; }

function Field({ label, type = "text", value, onChange, placeholder, right }: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; right?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50">{label}</span>
      <div className="relative">
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={type === "password" ? "current-password" : type === "email" ? "email" : "name"}
          className="w-full rounded-2xl border-2 border-white/15 bg-white/5 px-4 py-3.5 text-[15px] text-white outline-none transition placeholder:text-white/30 focus:border-[#C05BD6]" />
        {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
    </label>
  );
}

function AuthScreen() {
  const { signUp, signIn, resetPassword, continueAsGuest, auth, setAuthOpen, flash, setTourOpen } = useApp();
  const upgrading = auth.status === "guest";
  const [mode, setMode] = useState<Mode>("welcome");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  async function submit() {
    setErr(""); setBusy(true);
    if (mode === "signup") {
      const r = await signUp(name.trim(), email.trim(), pw);
      if (r.error) setErr(r.error); else if (r.needsConfirm) setMode("sent");
    } else if (mode === "signin") {
      const r = await signIn(email.trim(), pw); if (r.error) setErr(r.error);
    } else if (mode === "forgot") {
      const r = await resetPassword(email.trim()); if (r.error) setErr(r.error); else setMode("reset-sent");
    }
    setBusy(false);
  }
  const can = mode === "signup" ? name.trim().length > 1 && validEmail && pw.length >= 8 : mode === "signin" ? validEmail && pw.length >= 1 : validEmail;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[110] flex flex-col overflow-y-auto no-scrollbar" style={{ background: SPLASH_BG }}>
      <div className="flex-1 px-7 pb-8 pt-16">
        {mode !== "welcome" && mode !== "sent" && mode !== "reset-sent" && (
          <button onClick={() => { setMode("welcome"); setErr(""); }} aria-label="Back" className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white active:scale-90"><ArrowLeft size={17} /></button>
        )}
        {mode === "welcome" && (
          <div className="flex h-full flex-col">
            <div className="mt-6 flex flex-col items-center text-center">
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 12 }}><BirdieMark size={92} /></motion.div>
              <h1 className="disp mt-6 text-[30px] font-bold leading-tight text-white">{upgrading ? "Keep your work safe" : "Welcome to Birdie"}</h1>
              <p className="mt-2 max-w-[280px] text-[14.5px] leading-relaxed text-white/60">{upgrading ? "Create an account so your courses, notes and streak follow you to any device." : "Your courses, your notes, your study partner. All in one place."}</p>
            </div>
            <div className="mt-auto space-y-3 pt-10">
              <button onClick={() => setMode("signup")} className="w-full rounded-2xl bg-[#A63FBD] py-4 text-[15px] font-semibold text-white shadow-[0_12px_26px_-10px_rgba(166,63,189,0.9)] active:scale-[0.97]">Create an account</button>
              <button onClick={() => setMode("signin")} className="w-full rounded-2xl border-2 border-white/20 py-3.5 text-[15px] font-semibold text-white active:scale-[0.97]">I already have an account</button>
              {upgrading ? <button onClick={() => setAuthOpen(false)} className="w-full py-3 text-[14px] font-semibold text-white/50">Not now</button>
                : <button onClick={continueAsGuest} className="w-full py-3 text-[14px] font-semibold text-white/60 underline decoration-white/20 underline-offset-4">Continue as guest</button>}
              <button onClick={() => setTourOpen(true)} className="mt-1 w-full rounded-2xl bg-white/10 py-3 text-[14px] font-semibold text-white">See how Birdie works</button>
              <p className="pt-1 text-center text-[11.5px] leading-snug text-white/35">{upgrading ? "" : "As a guest your work stays on this device. You can create an account any time."}</p>
            </div>
          </div>
        )}

        {(mode === "signup" || mode === "signin" || mode === "forgot") && (
          <div>
            <h1 className="disp text-[26px] font-bold text-white">{mode === "signup" ? "Create your account" : mode === "signin" ? "Welcome back" : "Reset your password"}</h1>
            <p className="mb-6 mt-1.5 text-[14px] text-white/55">{mode === "signup" ? "It takes a minute." : mode === "signin" ? "Sign in to pick up where you left off." : "We'll email you a link to set a new one."}</p>
            <div className="space-y-4">
              {mode === "signup" && <Field label="Your name" value={name} onChange={setName} placeholder="What should we call you?" />}
              <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" />
              {mode !== "forgot" && <Field label="Password" type={show ? "text" : "password"} value={pw} onChange={setPw} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} right={<button type="button" onClick={() => setShow((s) => !s)} aria-label="Show password" className="text-white/50">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>} />}
            </div>
            {err && <div role="alert" className="mt-4 rounded-xl bg-[#FF6F59]/15 px-3.5 py-2.5 text-[13px] leading-snug text-[#FFB1A3]">{err}</div>}
            <button onClick={submit} disabled={!can || busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#A63FBD] py-4 text-[15px] font-semibold text-white transition active:scale-[0.97] disabled:opacity-40">
              {busy && <Loader2 size={17} className="animate-spin" />}{mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : "Send reset link"}
            </button>
            {mode === "signin" && <button onClick={() => { setMode("forgot"); setErr(""); }} className="mt-4 w-full text-center text-[13.5px] font-semibold text-[#E2B3F0]">Forgot your password?</button>}
            <div className="mt-6 text-center text-[13.5px] text-white/50">
              {mode === "signup" ? <>Already have an account? <button onClick={() => { setMode("signin"); setErr(""); }} className="font-semibold text-[#E2B3F0]">Sign in</button></> : mode === "signin" ? <>New here? <button onClick={() => { setMode("signup"); setErr(""); }} className="font-semibold text-[#E2B3F0]">Create an account</button></> : null}
            </div>
            {mode === "signup" && <p className="mt-5 text-center text-[11.5px] leading-snug text-white/35">By continuing you agree to Birdie&apos;s Terms and Privacy Policy.</p>}
          </div>
        )}

        {(mode === "sent" || mode === "reset-sent") && (
          <div className="flex flex-col items-center pt-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#A63FBD]/25 text-[#E2B3F0]"><Mail size={34} /></div>
            <h1 className="disp mt-6 text-[26px] font-bold text-white">Check your email</h1>
            <p className="mt-2 max-w-[280px] text-[14.5px] leading-relaxed text-white/60">{mode === "sent" ? <>We sent a confirmation link to <b className="text-white">{email}</b>. Tap it, then come back and sign in.</> : <>If <b className="text-white">{email}</b> has an account, a reset link is on its way.</>}</p>
            <button onClick={() => { setMode("signin"); setErr(""); flash("Sign in once you've confirmed"); }} className="mt-8 w-full rounded-2xl bg-[#A63FBD] py-4 text-[15px] font-semibold text-white active:scale-[0.97]">Go to sign in</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
