"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { Radio, Send, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

export default function BroadcastPage() {
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("This will send a notification to EVERY user in the database. Proceed?")) return;

    setLoading(true);
    setStatus(null);

    try {
      // Call the RPC function we created in SQL
      const { error } = await supabase.rpc('broadcast_notification', {
        title_input: title,
        message_input: message
      });

      if (error) throw error;

      setStatus({ type: 'success', msg: "Broadcast deployed successfully to all vaults." });
      setTitle("");
      setMessage("");
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-[#fafafa] min-h-screen font-sans">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-12">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight italic uppercase">
            Global <span className="text-emerald-600">Broadcast</span>
          </h1>
          <p className="text-gray-500 font-bold text-sm tracking-widest mt-1">
            SITEPIDE PROTOCOL • NOTIFICATION DISPATCH
          </p>
        </header>

        <div className="max-w-2xl">
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-4xl mb-8 flex gap-4 items-start">
            <AlertTriangle className="text-amber-600 shrink-0" size={24} />
            <div>
              <p className="text-amber-800 font-black uppercase text-[10px] tracking-widest mb-1">High Priority Warning</p>
              <p className="text-amber-700 text-sm font-medium leading-relaxed">
                Broadcasts are instant and irreversible. Use this for major system updates, holiday discounts, or critical security alerts.
              </p>
            </div>
          </div>

          <form onSubmit={handleBroadcast} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-2">Alert Headline</label>
                <input 
                  required
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., 20% DISCOUNT: EASTER PROMO"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-2">Message Payload</label>
                <textarea 
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter the detailed message for all users..."
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all resize-none"
                />
              </div>

              {status && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {status.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  <p className="text-xs font-black uppercase tracking-widest">{status.msg}</p>
                </div>
              )}

              <button 
                disabled={loading}
                className="w-full bg-gray-900 text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Radio size={20} />
                    Execute Broadcast
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}