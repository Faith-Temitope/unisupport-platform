"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail, X } from "lucide-react";
import { useEffect, useState } from "react";
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
    <label className="flex items-center gap-3 border-b border-[#E5E5E5] py-3.5 focus-within:border-[#A63FBD]">
      <span className="w-20 shrink-0 text-[16px] text-[#191919]">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={type === "password" ? "current-password" : type === "email" ? "email" : "name"}
        className="min-w-0 flex-1 bg-transparent text-[16px] text-[#191919] outline-none placeholder:text-[#B2B2B2]" />
      {right}
    </label>
  );
}

/** The welcome picture: a student under a big sky, looking at a planet (Birdie's take on WeChat's). */
function Sky() {
  return (
    <svg viewBox="0 0 390 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0B0614" /><stop offset=".7" stopColor="#1E0F2E" /><stop offset="1" stopColor="#2A1240" /></linearGradient>
        <radialGradient id="planet" cx=".38" cy=".35" r=".75"><stop offset="0" stopColor="#E9C8F2" /><stop offset=".45" stopColor="#A63FBD" /><stop offset="1" stopColor="#3B1650" /></radialGradient>
        <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#C05BD6" stopOpacity=".45" /><stop offset="1" stopColor="#C05BD6" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="390" height="600" fill="url(#sky)" />
      {Array.from({ length: 40 }, (_, k) => <circle key={k} cx={(k * 97) % 390} cy={(k * 53) % 330} r={k % 5 === 0 ? 1.4 : 0.8} fill="#fff" opacity={0.35 + (k % 4) * 0.15} />)}
      <circle cx="195" cy="250" r="190" fill="url(#glow)" />
      <circle cx="195" cy="250" r="118" fill="url(#planet)" />
      <path d="M110 230 q40 -30 80 -10 t90 0" stroke="#fff" strokeOpacity=".18" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M-20 470 Q195 410 410 470 L410 600 L-20 600 Z" fill="#120A1C" />
      {/* the student, with a backpack */}
      <g transform="translate(188 386)" fill="#060309">
        <circle cx="7" cy="6" r="6" /><rect x="1" y="12" width="12" height="20" rx="4" /><rect x="-4" y="14" width="6" height="13" rx="2" />
        <rect x="2" y="31" width="4" height="16" rx="2" /><rect x="8" y="31" width="4" height="16" rx="2" />
      </g>
    </svg>
  );
}

function AuthScreen() {
  const { signUp, signIn, resetPassword, continueAsGuest, auth, setAuthOpen, flash, setTourOpen } = useApp();
  const upgrading = auth.status === "guest";
  const [mode, setMode] = useState<Mode>("welcome");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [agreed, setAgreed] = useState(false);

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
  const can = mode === "signup" ? name.trim().length > 1 && validEmail && pw.length >= 8 && agreed : mode === "signin" ? validEmail && pw.length >= 1 : validEmail;
  const go = (m: Mode) => { setMode(m); setErr(""); };

  if (mode === "welcome") return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[110] flex flex-col overflow-hidden bg-black">
      <Sky />
      <div className="relative flex justify-end px-5 pt-12">
        <button onClick={() => setTourOpen(true)} className="text-[14px] text-white/85">How Birdie works</button>
      </div>
      <div className="relative mt-auto px-6 pb-10">
        <p className="mb-6 text-center text-[14.5px] leading-snug text-white/70">{upgrading ? "Create an account so your courses, notes and chats follow you to any device." : "Your courses, classmates and campus in one app."}</p>
        <div className="flex justify-between gap-4">
          <button onClick={() => go("signin")} className="w-[42%] rounded-[6px] bg-[#A63FBD] py-3 text-[16px] font-medium text-white active:opacity-80">Log In</button>
          <button onClick={() => go("signup")} className="w-[42%] rounded-[6px] bg-white py-3 text-[16px] font-medium text-[#A63FBD] active:opacity-80">Sign Up</button>
        </div>
        {upgrading ? <button onClick={() => setAuthOpen(false)} className="mt-5 w-full text-center text-[14px] text-white/60">Not now</button>
          : <button onClick={continueAsGuest} className="mt-5 w-full text-center text-[14px] text-white/60">Continue as guest</button>}
      </div>
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[110] flex flex-col overflow-y-auto bg-white no-scrollbar">
      <div className="flex-1 px-6 pb-8 pt-12">
        {mode !== "sent" && mode !== "reset-sent" && <button onClick={() => go("welcome")} aria-label="Close" className="-ml-1 flex h-9 w-9 items-center justify-center text-[#191919]"><X size={24} /></button>}

        {(mode === "signup" || mode === "signin" || mode === "forgot") && (
          <div className="pt-6">
            <h1 className="text-[24px] font-semibold text-[#191919]">{mode === "signup" ? "Sign up with email" : mode === "signin" ? "Log in with email" : "Reset your password"}</h1>
            {mode === "forgot" && <p className="mt-1.5 text-[14px] text-[#7F7F7F]">We&apos;ll email you a link to set a new one.</p>}
            <div className="mt-8">
              {mode === "signup" && <Field label="Name" value={name} onChange={setName} placeholder="Your full name" />}
              <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" />
              {mode !== "forgot" && <Field label="Password" type={show ? "text" : "password"} value={pw} onChange={setPw} placeholder={mode === "signup" ? "At least 8 characters" : "Enter password"}
                right={<button type="button" onClick={() => setShow((x) => !x)} aria-label="Show password" className="text-[#B2B2B2]">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>} />}
            </div>
            {mode === "signup" && (
              <label className="mt-5 flex items-center justify-center gap-2 text-[13px] text-[#7F7F7F]">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="h-4 w-4 accent-[#A63FBD]" />
                <span>I agree to the <a href="/terms" target="_blank" className="text-[#576B95]">Terms of Service</a> and <a href="/privacy" target="_blank" className="text-[#576B95]">Privacy Policy</a></span>
              </label>
            )}
            {err && <div role="alert" className="mt-4 rounded-[6px] bg-[#FFF0EE] px-3.5 py-2.5 text-[13px] leading-snug text-[#E2553F]">{err}</div>}
            <button onClick={submit} disabled={!can || busy} className="mt-8 flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#A63FBD] py-3.5 text-[16px] font-medium text-white disabled:opacity-40">
              {busy && <Loader2 size={17} className="animate-spin" />}{mode === "signup" ? "Agree and Sign Up" : mode === "signin" ? "Log In" : "Send Reset Link"}
            </button>
            <div className="mt-6 flex justify-center gap-6 text-[14px] text-[#576B95]">
              {mode === "signin" && <button onClick={() => go("forgot")}>Forgot password?</button>}
              {mode === "signin" ? <button onClick={() => go("signup")}>Sign up</button> : mode === "signup" ? <button onClick={() => go("signin")}>Log in instead</button> : <button onClick={() => go("signin")}>Back to log in</button>}
            </div>
          </div>
        )}

        {(mode === "sent" || mode === "reset-sent") && (
          <div className="flex flex-col items-center pt-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F6EAFB] text-[#A63FBD]"><Mail size={34} /></div>
            <h1 className="mt-6 text-[22px] font-semibold text-[#191919]">Check your email</h1>
            <p className="mt-2 max-w-[280px] text-[14.5px] leading-relaxed text-[#7F7F7F]">{mode === "sent" ? <>We sent a confirmation link to <b className="text-[#191919]">{email}</b>. Tap it, then come back and log in.</> : <>If <b className="text-[#191919]">{email}</b> has an account, a reset link is on its way.</>}</p>
            <button onClick={() => { go("signin"); flash("Log in once you've confirmed"); }} className="mt-8 w-full rounded-[6px] bg-[#A63FBD] py-3.5 text-[16px] font-medium text-white">Go to Log In</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
