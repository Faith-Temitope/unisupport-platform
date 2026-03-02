"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  Users, 
  ChevronLeft,
  Fingerprint
} from "lucide-react";

function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // URL Parameters for Referrals and Redirects
  const referralCode = searchParams.get("ref");
  const callback = searchParams.get("callback") || "/dashboard";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      // --- LOGIN LOGIC ---
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { 
        alert(error.message); 
        setLoading(false);
      } else { 
        router.push(callback); 
      }
    } else {
      // --- SIGNUP LOGIC ---
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: fullName,
            referred_by_code: referralCode 
          }
        }
      });

      if (error) {
        alert(error.message);
        setLoading(false);
      } else {
        // If Supabase is configured to require email confirmation, session will be null
        if (data.user && !data.session) {
          setIsSubmitted(true);
        } else {
          router.push(callback);
        }
      }
    }
  };

  // --- STATE 1: VERIFICATION UI (Shown after 'Join') ---
  if (isSubmitted) {
    return (
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
        <div className="bg-white p-10 md:p-12 rounded-[3.5rem] shadow-2xl border-2 border-emerald-500/10 text-center relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
          
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 mx-auto mb-8 shadow-inner">
            <Mail size={40} strokeWidth={1.5} />
          </div>

          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-gray-900 mb-4">
            Verify <span className="text-emerald-600">Protocol.</span>
          </h2>
          
          <div className="space-y-4 mb-10">
            <p className="text-gray-500 font-bold italic text-sm leading-relaxed">
              We have dispatched a secure activation link to:
            </p>
            <div className="bg-gray-50 py-3 px-4 rounded-2xl border border-gray-100 inline-block">
              <span className="text-gray-900 font-black text-sm">{email}</span>
            </div>
            <p className="text-gray-400 font-medium text-[11px] leading-relaxed px-6">
              Please check your inbox and spam folder. You must confirm your identity before accessing the Vault.
            </p>
          </div>

          <button 
            onClick={() => setIsSubmitted(false)}
            className="flex items-center justify-center gap-2 mx-auto text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-emerald-600 transition-colors"
          >
            <ChevronLeft size={14} /> Back to Authentication
          </button>
        </div>
      </div>
    );
  }

  // --- STATE 2: AUTH FORM UI ---
  return (
    <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Brand Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-900 text-emerald-500 rounded-2xl mb-4 shadow-xl">
             <Fingerprint size={28} />
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-gray-900">
            uniSupport<span className="text-emerald-500">.xyz</span>
          </h1>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">
            Secure Academic Intelligence Portal
          </p>
        </div>

        <div className="bg-white p-10 md:p-12 rounded-[3.5rem] shadow-2xl border border-gray-100 relative">
          {/* Referral Badge */}
          {referralCode && !isLogin && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
              <Users className="text-emerald-600" size={16} />
              <p className="text-[10px] font-black uppercase text-emerald-700">Agent Referral Active: {referralCode}</p>
            </div>
          )}

          {/* Tab Switcher */}
          <div className="flex gap-4 mb-10 p-2 bg-gray-50 rounded-2xl">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLogin ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400'}`}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isLogin ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400'}`}
            >
              Join
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Full Identity Name</label>
                <div className="relative">
                  <User className="absolute left-5 top-5 text-gray-300" size={18} />
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="w-full p-5 pl-14 rounded-2xl border border-gray-100 bg-gray-50/50 outline-none font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm" 
                    placeholder="e.g. Samuel Adekunle" 
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Academic Email</label>
              <div className="relative">
                <Mail className="absolute left-5 top-5 text-gray-300" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="w-full p-5 pl-14 rounded-2xl border border-gray-100 bg-gray-50/50 outline-none font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm" 
                  placeholder="name@university.edu" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Vault Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-5 text-gray-300" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="w-full p-5 pl-14 rounded-2xl border border-gray-100 bg-gray-50/50 outline-none font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50"
            >
              {loading ? "Processing..." : isLogin ? "Access My Vault" : "Initialize Identity"}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-center gap-2 text-gray-400 font-bold text-[9px] uppercase tracking-widest">
            <ShieldCheck size={14} className="text-emerald-500" /> AES-256 Bit Encryption Active
          </div>
        </div>
    </div>
  );
}

// --- MAIN EXPORT WITH SUSPENSE BOUNDARY ---
export default function AuthPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-20">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Vault...</p>
        </div>
      }>
        <AuthForm />
      </Suspense>
    </main>
  );
}