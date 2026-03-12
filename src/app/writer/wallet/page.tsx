"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import WriterSidebar from "@/components/layout/WriterSidebar";
import { Wallet, Banknote, Clock, CheckCircle2, X, Loader2, AlertCircle } from "lucide-react";

export default function WriterWallet() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [writerId, setWriterId] = useState<string | null>(null);
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ bank_name: '', account_number: '', account_name: '' });

  /**
   * AUTH GUARD & DATA LOAD
   */
  const loadWalletData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/writer/login");
      return;
    }

    setWriterId(user.id);

    try {
      // Fetch writer stats
      const { data: writer } = await supabase
        .from("writers")
        .select("*")
        .eq("id", user.id)
        .single();

      // Fetch withdrawal history
      const { data: requests } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("writer_id", user.id)
        .order("created_at", { ascending: false });
      
      setProfile(writer);
      setPayouts(requests || []);
    } catch (err) {
      console.error("Wallet Load Error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  /**
   * PAYOUT REQUEST LOGIC
   */
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writerId || !profile) return;
    
    if (profile.earnings < 1000) {
      return alert("Minimum withdrawal balance required is $1,000");
    }

    setIsSubmitting(true);

    try {
      // 1. Create the request
      const { error: requestError } = await supabase.from("payout_requests").insert([{
        writer_id: writerId,
        amount: profile.earnings,
        ...formData,
        status: 'pending'
      }]);

      if (requestError) throw requestError;

      // 2. Reset local earnings in 'writers' table (Money is now "in transit")
      const { error: updateError } = await supabase
        .from("writers")
        .update({ earnings: 0 })
        .eq("id", writerId);

      if (updateError) throw updateError;

      setIsModalOpen(false);
      alert("Withdrawal request sent to Admin!");
      loadWalletData();
    } catch (err) {
      alert("Failed to process request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex bg-[#FBFBFC] min-h-screen">
      <WriterSidebar />
      
      <main className="flex-1 md:ml-64 p-8">
        <header className="mb-12">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">Financial Hub</h1>
          <p className="text-gray-500 italic text-sm font-medium">Manage your earnings and monitor settlement status.</p>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
              {/* CURRENT BALANCE CARD */}
              <div className="lg:col-span-2 bg-gray-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                <Banknote className="absolute -right-8 -bottom-8 text-white/5 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700" size={240} />
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-4">Available for Withdrawal</p>
                  <h2 className="text-6xl font-black mb-10 tracking-tighter">${profile?.earnings?.toLocaleString() || "0"}</h2>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    disabled={!profile?.earnings || profile.earnings < 1000}
                    className="px-10 py-5 bg-white text-gray-900 hover:bg-emerald-400 hover:text-white disabled:bg-gray-800 disabled:text-gray-600 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl"
                  >
                    Request Instant Payout
                  </button>
                </div>
              </div>

              {/* LIFETIME EARNINGS CARD */}
              <div className="bg-white border border-gray-100 rounded-[3rem] p-10 flex flex-col justify-center shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Lifetime Settled</p>
                <h2 className="text-4xl font-black text-gray-900 italic tracking-tighter">
                   ${profile?.total_paid_out?.toLocaleString() || 0}
                </h2>
                <div className="mt-4 flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Verified Expert</span>
                </div>
              </div>
            </div>

            {/* TRANSACTION HISTORY */}
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Withdrawal History</h3>
              <div className="h-px flex-1 bg-gray-100 ml-6"></div>
            </div>

            <div className="space-y-4">
              {payouts.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-gray-100">
                  <p className="text-gray-300 font-black uppercase text-[10px] tracking-widest italic">No transaction history found</p>
                </div>
              ) : (
                payouts.map((p) => (
                  <div key={p.id} className="bg-white border border-gray-50 rounded-[2.5rem] p-8 flex justify-between items-center hover:shadow-lg transition-all">
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        p.status === 'paid' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'
                      }`}>
                        {p.status === 'paid' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 uppercase text-xs tracking-tight">Withdrawal Request</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                          {new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-gray-900 text-xl tracking-tighter">${p.amount.toLocaleString()}</p>
                      <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${
                        p.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'
                      }`}>
                        {p.status}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>

      {/* PAYOUT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-gray-300 hover:text-gray-900 transition-colors"><X size={24}/></button>
            
            <div className="mb-8">
              <h2 className="text-3xl font-black text-gray-900 italic uppercase">Settlement</h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Enter your bank details accurately</p>
            </div>

            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 ml-4 mb-1 block tracking-widest">Bank Name</label>
                <input 
                  required 
                  placeholder="e.g. Zenith Bank" 
                  className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                  onChange={e => setFormData({...formData, bank_name: e.target.value})} 
                />
              </div>
              
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 ml-4 mb-1 block tracking-widest">Account Number</label>
                <input 
                  required 
                  maxLength={10}
                  placeholder="0123456789" 
                  className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-[0.3em] outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                  onChange={e => setFormData({...formData, account_number: e.target.value})} 
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 ml-4 mb-1 block tracking-widest">Account Name</label>
                <input 
                  required 
                  placeholder="Full Legal Name" 
                  className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                  onChange={e => setFormData({...formData, account_name: e.target.value})} 
                />
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full py-6 bg-gray-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] mt-6 shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Confirm Withdrawal"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}