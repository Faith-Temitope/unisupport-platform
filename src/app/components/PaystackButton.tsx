"use client";

import React from "react";
import { usePaystackPayment } from "react-paystack";
import { CreditCard, Lock, ShieldCheck, AlertTriangle } from "lucide-react";

interface PaystackButtonProps {
  order: any;
  amount: number;
  isFinal: boolean;
  userEmail: string;
  publicKey: string;
  onSuccess: (reference: string) => void;
}

export default function PaystackButton({ 
  order, 
  amount, 
  isFinal, 
  onSuccess, 
  userEmail, 
  publicKey 
}: PaystackButtonProps) {

  const config = {
    reference: `TRANS_${Math.floor(Math.random() * 1000000000 + 1)}`,
    email: userEmail || "",
    amount: Math.round(amount * 100), // Kobo conversion
    publicKey: publicKey,
    metadata: {
      custom_fields: [
        {
          display_name: "Order ID",
          variable_name: "order_id",
          value: order.id,
        }
      ]
    }
  };

  const initializePayment = usePaystackPayment(config);

  // Error check for missing API Key
  if (!publicKey || publicKey === "") {
    return (
      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-2 text-red-600">
        <AlertTriangle size={16} />
        <span className="text-[10px] font-black uppercase tracking-tighter">Missing API Key</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button 
        type="button"
        onClick={() => {
          if (!userEmail) {
            alert("Security Error: No user email found.");
            return;
          }
          // The fix: Passing as a single object with named keys
          initializePayment({
            onSuccess: (reference: any) => onSuccess(reference.reference),
            onClose: () => console.log("Vault: Payment window closed.")
          });
        }}
        className={`w-full py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.15em] flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 hover:brightness-110 ${
          isFinal 
            ? 'bg-gray-900 text-white shadow-gray-900/10' 
            : 'bg-emerald-600 text-white shadow-emerald-600/20'
        }`}
      >
        {isFinal ? (
          <>
            Settle Balance <Lock size={14} className="mb-0.5 text-emerald-400" />
          </>
        ) : (
          <>
            Pay 50% Deposit <CreditCard size={14} className="mb-0.5" />
          </>
        )}
      </button>
      
      <div className="flex items-center justify-center gap-1.5 mt-3 opacity-30">
        <ShieldCheck size={10} className="text-emerald-600" />
        <span className="text-[8px] font-bold uppercase tracking-widest">
          PCI-DSS Compliant Encryption
        </span>
      </div>
    </div>
  );
}