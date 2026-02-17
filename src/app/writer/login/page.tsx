"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LogIn, Loader2, ShieldCheck } from "lucide-react";

export default function WriterLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Invalid credentials. Please contact Admin.");
      setLoading(false);
    } else {
      router.push("/writer/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 text-white rounded-[2rem] mb-6 shadow-xl shadow-emerald-100">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 italic tracking-tighter">Expert Portal</h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">uniSupport.pro Authentication</p>
        </div>

        <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-gray-200/50 border border-gray-100">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 ml-4 mb-2 block tracking-widest">Email Address</label>
              <input 
                type="email" required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
                placeholder="expert@unisupport.pro"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 ml-4 mb-2 block tracking-widest">Password</label>
              <input 
                type="password" required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-red-500 text-xs font-black text-center uppercase tracking-tighter">{error}</p>}

            <button 
              disabled={loading}
              className="w-full py-5 bg-gray-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><LogIn size={18} /> Enter Workspace</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}