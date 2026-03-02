"use client";

import { useState } from "react";
import { X, Landmark, Send, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function WithdrawalModal({ 
  isOpen, 
  onClose, 
  balance, 
  userId,
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  balance: number; 
  userId: string;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accNum, setAccNum] = useState("");
  const [accName, setAccName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const supabase = createClient();

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(amount) < 2000) return alert("Minimum withdrawal is ₦2,000");
    if (Number(amount) > balance) return alert("Insufficient balance");

    setLoading(true);
    const { error } = await supabase.from("withdrawals").insert({
      user_id: userId,
      amount: Number(amount),
      bank_name: bankName,
      account_number: accNum,
      account_name: accName
    });

    if (error) {
      alert(error.message);
    } else {
      setSent(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSent(false);
      }, 3000);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 relative shadow-2xl overflow-hidden">
        {sent ? (
          <div className="py-10 text-center animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Request Filed.</h2>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Processing usually takes 24-48 hours.</p>
          </div>
        ) : (
          <>
            <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-black transition-colors">
              <X size={24} />
            </button>

            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <Landmark size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Capital Distribution</span>
            </div>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-8">Withdraw <span className="text-emerald-600">Funds.</span></h2>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-6">
                <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Available Capital</p>
                <p className="text-3xl font-black italic text-gray-900">₦{balance.toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Amount (₦)</label>
                  <input required type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none font-bold text-sm focus:ring-2 focus:ring-emerald-500" placeholder="Min 2000" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Bank Name</label>
                  <input required type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none font-bold text-sm focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Kuda" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Account Number</label>
                <input required type="text" value={accNum} onChange={(e) => setAccNum(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none font-bold text-sm focus:ring-2 focus:ring-emerald-500" placeholder="0123456789" />
              </div>

              <div className="space-y-1 pb-4">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Account Name</label>
                <input required type="text" value={accName} onChange={(e) => setAccName(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none font-bold text-sm focus:ring-2 focus:ring-emerald-500" placeholder="Full Name on Account" />
              </div>

              <button disabled={loading} type="submit" className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all active:scale-95 shadow-xl">
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                {loading ? "Transmitting..." : "Initialize Withdrawal"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}