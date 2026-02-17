"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, User, ArrowRight, ShieldCheck } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Where to send the user after login
  const callback = searchParams.get("callback") || "/dashboard";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
      } else {
        router.push(callback);
      }
    } else {
      // SIGNUP: We pass the full_name to user_metadata so our SQL Trigger picks it up
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });
      if (error) {
        alert(error.message);
      } else {
        alert("Account created! You can now access your vault.");
        router.push(callback);
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 pt-20">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-gray-900">
            uniSupport<span className="text-emerald-500">.</span>Vault
          </h1>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">
            End-to-End Encrypted Academic Portal
          </p>
        </div>

        <div className="bg-white p-10 md:p-12 rounded-[3.5rem] shadow-2xl border border-gray-100">
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
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-5 top-5 text-gray-300" size={18} />
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="w-full p-5 pl-14 rounded-2xl border border-gray-100 bg-gray-50/50 outline-none font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                    placeholder="John Doe" 
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
                  className="w-full p-5 pl-14 rounded-2xl border border-gray-100 bg-gray-50/50 outline-none font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                  placeholder="name@university.edu" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-5 text-gray-300" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="w-full p-5 pl-14 rounded-2xl border border-gray-100 bg-gray-50/50 outline-none font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50"
            >
              {loading ? "Verifying..." : isLogin ? "Access My Vault" : "Create My Identity"}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-center gap-2 text-gray-400 font-bold text-[9px] uppercase tracking-widest">
            <ShieldCheck size={14} className="text-emerald-500" /> AES-256 Bit Encryption Active
          </div>
        </div>
      </div>
    </main>
  );
}