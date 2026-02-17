"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { 
  Clock, 
  Download, 
  Loader2, 
  Eye, 
  Lock, 
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

// Dynamic import to prevent "window is not defined" error from Paystack
const PaystackButton = dynamic(() => import("@/components/PaystackButton"), { 
  ssr: false,
  loading: () => <div className="h-14 w-full bg-gray-100 animate-pulse rounded-2xl" />
});

export default function UserDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  const router = useRouter();

  // Fetch orders and user session
  const getDashboardData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      return router.push("/auth");
    }
    
    setUser(authUser);

    // Fetch orders with writer details
    const { data, error } = await supabase
      .from("orders")
      .select(`*, writers!orders_writer_id_fkey (name)`)
      .eq("user_id", authUser.id)
      .order('created_at', { ascending: false });

    if (!error) {
      setOrders(data || []);
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    getDashboardData();
  }, [getDashboardData]);

  // Handle successful Paystack transactions
  const handlePaymentSuccess = async (order: any, amountPaid: number, isFinal: boolean) => {
    const newPaidTotal = (order.amount_paid || 0) + amountPaid;
    
    // Status Logic: 
    // 1. First 50% paid -> Move to 'in-progress'
    // 2. Final 50% paid -> Move to 'completed'
    const newStatus = isFinal ? 'completed' : 'in-progress';

    const { error } = await supabase
      .from("orders")
      .update({ 
        amount_paid: newPaidTotal, 
        status: newStatus 
      })
      .eq("id", order.id);

    if (!error) {
      getDashboardData(); // Refresh UI
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="font-black uppercase tracking-[0.2em] text-[10px] italic">Accessing Vault...</p>
      </div>
    );
  }

  return (
    <main className="pt-32 pb-20 px-4 min-h-screen bg-white">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Secure Scholar Portal</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none">
              Your <span className="text-emerald-600">Vault.</span>
            </h1>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 hidden md:block">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Authenticated User</p>
            <p className="text-sm font-bold text-gray-900">{user?.email}</p>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid gap-8">
          {orders.length === 0 ? (
            <div className="py-32 border-2 border-dashed border-gray-100 rounded-[4rem] text-center">
              <AlertCircle className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-gray-400 font-bold italic uppercase tracking-widest text-sm">No active academic projects found.</p>
              <button 
                onClick={() => router.push('/order')}
                className="mt-6 text-emerald-600 font-black uppercase text-xs hover:underline"
              >
                Deploy your first project →
              </button>
            </div>
          ) : (
            orders.map((order) => {
              const depositNeeded = order.total_price * 0.5;
              const amountPaid = order.amount_paid || 0;
              const isDepositPaid = amountPaid >= depositNeeded;
              const isFullyPaid = amountPaid >= order.total_price;
              const balanceRemaining = order.total_price - amountPaid;

              return (
                <div key={order.id} className="group relative bg-white border border-gray-100 p-8 md:p-12 rounded-[3.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden">
                  
                  <div className="flex flex-col lg:flex-row justify-between gap-12 items-start lg:items-center relative z-10">
                    
                    {/* Project Metadata */}
                    <div className="space-y-4 grow">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          isFullyPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-orange-50 text-orange-700 border border-orange-100'
                        }`}>
                          {order.status?.replace('-', ' ')}
                        </span>
                        {order.writers?.name && (
                          <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                             <span className="text-[9px] font-black text-gray-500 uppercase italic">Writer: {order.writers.name}</span>
                          </div>
                        )}
                      </div>

                      <h3 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none group-hover:text-emerald-600 transition-colors">
                        {order.service_type}
                      </h3>

                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Contract Total</p>
                          <p className="text-xl font-black italic text-gray-900">₦{order.total_price?.toLocaleString()}</p>
                        </div>
                        <div className="h-8 w-px bg-gray-100" />
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Settled</p>
                          <p className="text-xl font-black italic text-emerald-600">₦{amountPaid.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Logic-Driven Action Panel */}
                    <div className="w-full lg:w-80 space-y-4">
                      
                      {/* 1. Custom Price Logic */}
                      {order.status === 'awaiting-quote' && (
                        <div className="p-8 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 text-center">
                          <Clock className="mx-auto text-orange-400 mb-2 animate-spin-slow" size={24} />
                          <p className="text-[10px] font-black uppercase text-gray-500 tracking-tighter leading-tight">
                            Analyzing Brief... <br /> Quote ready in ~2h
                          </p>
                        </div>
                      )}

                      {/* 2. Initial Deposit Logic */}
                      {order.status !== 'awaiting-quote' && !isDepositPaid && (
                        <div className="space-y-3">
                          <PaystackButton 
                            order={order} 
                            amount={depositNeeded} 
                            isFinal={false} 
                            userEmail={user?.email || ""} 
                            publicKey={process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!} 
                            onSuccess={() => handlePaymentSuccess(order, depositNeeded, false)} 
                          />
                          <p className="text-[9px] text-center font-bold text-gray-400 uppercase tracking-widest italic">50% Commitment Required to Start</p>
                        </div>
                      )}

                      {/* 3. In Progress Logic */}
                      {isDepositPaid && !isFullyPaid && order.status === 'in-progress' && (
                        <div className="p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100 text-center">
                           <Loader2 className="mx-auto text-emerald-500 mb-2 animate-spin" size={24} />
                           <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest italic">Research Deployment in Progress</p>
                        </div>
                      )}

                      {/* 4. Preview & Balance Logic */}
                      {order.status === 'preview-ready' && !isFullyPaid && (
                        <div className="space-y-3">
                          <button className="w-full py-4 border-2 border-gray-900 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase hover:bg-gray-900 hover:text-white transition-all group/btn">
                             <Eye size={14} className="group-hover/btn:scale-110 transition-transform" /> View Unlocked Preview
                          </button>
                          <PaystackButton 
                            order={order} 
                            amount={balanceRemaining} 
                            isFinal={true} 
                            userEmail={user?.email || ""} 
                            publicKey={process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!} 
                            onSuccess={() => handlePaymentSuccess(order, balanceRemaining, true)} 
                          />
                        </div>
                      )}

                      {/* 5. Completed & Download Logic */}
                      {isFullyPaid && (
                        <button className="w-full py-6 bg-emerald-600 text-white rounded-[1.8rem] font-black uppercase text-xs flex items-center justify-center gap-3 shadow-2xl shadow-emerald-600/30 hover:-translate-y-1 transition-all">
                           <Download size={20} /> Download Final Asset
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Decorative background element */}
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                    <Lock size={120} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}