"use client";
import { usePaystackPayment } from "react-paystack";
import { CreditCard, Lock } from "lucide-react";

export default function PaystackButton({ order, amount, isFinal, onSuccess, userEmail, publicKey }: any) {
  const config = {
    reference: `TRANS_${Math.floor(Math.random() * 1000000000 + 1)}`,
    email: userEmail || "",
    amount: Math.round(amount * 100),
    publicKey: publicKey || 'pk_test_placeholder', 
  };

  const initializePayment = usePaystackPayment(config);

  return (
    <button 
      onClick={() => initializePayment(onSuccess)}
      className={`w-full py-6 rounded-[1.5rem] font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${
        isFinal ? 'bg-gray-900 text-white' : 'bg-emerald-600 text-white shadow-emerald-600/20'
      }`}
    >
      {isFinal ? 'Settle Balance' : 'Pay 50% Deposit'} 
      {isFinal ? <Lock size={18} /> : <CreditCard size={18} />}
    </button>
  );
}