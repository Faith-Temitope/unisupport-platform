"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { CheckCircle2, Clock, Download, Loader2, LayoutDashboard, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

// Import the button dynamically to kill the "window is not defined" error
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

  const getDashboardData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return router.push("/auth");
    setUser(authUser);
    const { data } = await supabase.from("orders").select(`*, writers!orders_writer_id_fkey (name)`).eq("user_id", authUser.id);
    setOrders(data || []);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { getDashboardData(); }, [getDashboardData]);

  const handlePaymentSuccess = async (order: any, amount: number, isFinal: boolean) => {
    const newPaid = (order.amount_paid || 0) + amount;
    await supabase.from("orders").update({ amount_paid: newPaid, status: isFinal ? 'completed' : order.status }).eq("id", order.id);
    getDashboardData();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Syncing Vault...</div>;

  return (
    <main className="pt-32 pb-20 px-4 min-h-screen bg-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-7xl font-black uppercase italic tracking-tighter mb-10">Active <span className="text-emerald-600">Vault.</span></h1>
        <div className="grid gap-8">
          {orders.map((order) => {
            const deposit = order.total_price * 0.5;
            const balance = order.total_price - (order.amount_paid || 0);
            const isDepositPaid = (order.amount_paid || 0) >= deposit;
            const isFullyPaid = (order.amount_paid || 0) >= order.total_price;

            return (
              <div key={order.id} className="p-10 border border-gray-100 rounded-[3rem] flex flex-col md:flex-row gap-10 items-center bg-white shadow-sm">
                <div className="grow">
                   <h3 className="text-4xl font-black uppercase italic leading-none">{order.service_type}</h3>
                   <p className="text-sm font-bold text-gray-400 mt-2">₦{order.amount_paid?.toLocaleString()} / ₦{order.total_price?.toLocaleString()}</p>
                </div>

                <div className="w-full md:w-72">
                  {!isDepositPaid && (
                    <PaystackButton 
                      order={order} 
                      amount={deposit} 
                      isFinal={false} 
                      userEmail={user?.email} 
                      onSuccess={() => handlePaymentSuccess(order, deposit, false)} 
                    />
                  )}
                  {order.status === 'preview-ready' && !isFullyPaid && (
                     <PaystackButton 
                       order={order} 
                       amount={balance} 
                       isFinal={true} 
                       userEmail={user?.email} 
                       onSuccess={() => handlePaymentSuccess(order, balance, true)} 
                     />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}