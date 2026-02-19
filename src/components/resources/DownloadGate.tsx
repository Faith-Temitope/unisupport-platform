"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { X, Mail, Loader2 } from "lucide-react";

export default function DownloadGate({ template, onClose, onUnlock }: { template: any, onClose: () => void, onUnlock: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Save lead to Supabase
    const { error } = await supabase.from("leads").insert([
      { email, source_template: template.title }
    ]);

    // Even if it's a duplicate email, we let them download
    setLoading(false);
    onUnlock(); 
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[3rem] p-10 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900"><X /></button>
        
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail size={32} />
          </div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Unlock Asset</h2>
          <p className="text-gray-500 text-sm font-medium mb-8">Enter your email to receive the <span className="text-gray-900 font-bold">{template.title}</span> and join our academic elite list.</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              required 
              type="email"
              placeholder="your@email.com" 
              className="w-full bg-gray-50 border-none rounded-2xl p-5 text-center font-bold focus:ring-2 ring-emerald-500"
              onChange={(e) => setEmail(e.target.value)}
            />
            <button 
              disabled={loading}
              className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl"
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "Access Blueprint"}
            </button>
          </form>
          <p className="mt-6 text-[9px] text-gray-400 font-bold uppercase tracking-widest">Zero Spam. Just High-Value Resources.</p>
        </div>
      </div>
    </div>
  );
}