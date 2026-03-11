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
    reference: `VAULT_${Math.floor(Math.random() * 1000000000 + 1)}`,
    email: userEmail || "",
    amount: Math.round(amount * 100), // Converted to Cents for USD
    publicKey: publicKey,
    currency: "USD", // Explicitly set to USD for global transactions
    metadata: {
      custom_fields: [
        {
          display_name: "Order ID",
          variable_name: "order_id",
          value: order.id,
        },
        {
          display_name: "Service Type",
          variable_name: "service_type",
          value: order.service_type,
        },
        {
          display_name: "Platform",
          variable_name: "platform",
          value: "uniSupport_xyz",
        }
      ]
    }
  };

  // Prevent hook initialization if config is invalid
  const initializePayment = usePaystackPayment(config);

  // Error check for missing API Key or User Email
  if (!publicKey || publicKey === "" || !userEmail) {
    return (
      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-2 text-red-600">
        <AlertTriangle size={16} />
        <span className="text-[10px] font-black uppercase tracking-tighter">
          {!publicKey ? "Missing API Key" : "User Identity Required"}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button 
        type="button"
        onClick={() => {
          initializePayment({
            onSuccess: (reference: any) => {
              onSuccess(reference.reference);
            },
            onClose: () => console.log("Vault: Payment session terminated by user.")
          });
        }}
        className={`w-full py-5 rounded-[1.8rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 hover:brightness-110 disabled:opacity-50 ${
          isFinal 
            ? 'bg-gray-900 text-white shadow-gray-900/20' 
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
      
      <div className="flex items-center justify-center gap-1.5 mt-4 opacity-40">
        <ShieldCheck size={10} className="text-emerald-600" />
        <span className="text-[7px] font-black uppercase tracking-[0.25em] text-gray-500">
          Secure Global USD Transaction • PCI-DSS
        </span>
      </div>
    </div>
  );
}