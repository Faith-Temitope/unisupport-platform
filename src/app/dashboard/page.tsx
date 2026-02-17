"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { 
  CheckCircle2, Clock, CreditCard, Download, Loader2, 
  LayoutDashboard, Eye, Lock 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePaystackPayment } from "react-paystack";
import dynamicImport from 'next/dynamic'; // Added for the SSR fix

// Internal Component Logic
function UserDashboardContent() {
  const [orders, setOrders] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  const router = useRouter();

  const getDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return router.push("/auth");
      setUser(authUser);

      const { data, error } = await supabase
        .from("orders")
        .select(`*, writers!orders_writer_id_fkey (name, specialization)`)
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false });

      if (!error) setOrders(data || []);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    getDashboardData();
    const channel = supabase.channel('vault-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => getDashboardData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [getDashboardData, supabase]);

  const handlePreview = async (path: string) => {
    const { data } = await supabase.storage.from('submissions').createSignedUrl(path, 60);
    if (data) window.open(data.signedUrl, '_blank');
  };

  const handleDownload = async (path: string) => {
    const { data } = await supabase.storage.from('submissions').download(path);
    if (data) {
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = "Project_Final_Deliverable.pdf";
      a.click();
    }
  };

  const PayButton = ({ order, amount, isFinal }: { order: any, amount: number, isFinal: boolean }) => {
    const config = {
      reference: `TRANS_${Math.floor(Math.random() * 1000000000 + 1)}`,
      email: user?.email || "",
      amount: Math.round(amount * 100), 
      publicKey: 'YOUR_PAYSTACK_PUBLIC_KEY', // REPLACE THIS WITH YOUR KEY
    };

    const initializePayment = usePaystackPayment(config);

    const onSuccess = async () => {
      const newPaid = (order.amount_paid || 0) + amount;
      await supabase
        .from("orders")
        .update({ 
          amount_paid: newPaid,
          status: isFinal ? 'completed' : order.status 
        })
        .eq("id", order.id);
      
      getDashboardData();
    };

    return (
      <button 
        onClick={() => initializePayment(onSuccess as any)}
        className={`w-full py-6 rounded-[1.5rem] font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${
          isFinal ? 'bg-gray-900 text-white' : 'bg-emerald-600 text-white shadow-emerald-600/20'
        }`}
      >
        {isFinal ? 'Settle Balance' : 'Pay 50% Deposit'} 
        {isFinal ? <Lock size={18} /> : <CreditCard size={18} />}
      </button>
    );
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white italic font-black text-emerald-600 uppercase tracking-widest">
       <Loader2 className="animate-spin mr-3" /> Syncing Vault
    </div>
  );

  return (
    <main className="pt-32 pb-20 px-4 min-h-screen bg-white font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 mb-2 font-black uppercase text-[10px] tracking-widest">
              <LayoutDashboard size={18} /> Research Portal
            </div>
            <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-[0.8]">
              Active <span className="text-emerald-600">Vault.</span>
            </h1>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="text-[10px] font-black uppercase tracking-widest border-2 border-gray-100 px-8 py-4 rounded-2xl hover:bg-gray-50">
            Sign Out
          </button>
        </header>

        <div className="grid gap-8">
          {orders.map((order) => {
            const depositAmount = order.total_price * 0.5;
            const balanceAmount = order.total_price - (order.amount_paid || 0);
            const isDepositPaid = (order.amount_paid || 0) >= depositAmount;
            const isFullyPaid = (order.amount_paid || 0) >= order.total_price;

            return (
              <div key={order.id} className="group bg-white rounded-[3rem] p-8 md:p-12 border border-gray-100 flex flex-col md:flex-row gap-10 items-center hover:shadow-2xl transition-all duration-500">
                <div className="flex flex-col items-center gap-4 shrink-0">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isFullyPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                    {isFullyPaid ? <CheckCircle2 size={48} /> : <Clock size={48} />}
                  </div>
                  <span className="text-[9px] font-black uppercase bg-gray-900 text-white px-5 py-2 rounded-full tracking-widest">{order.status}</span>
                </div>

                <div className="grow space-y-4 text-center md:text-left">
                  <h3 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">{order.service_type}</h3>
                  <div className="text-sm font-bold text-gray-900 uppercase">
                    ₦{order.amount_paid?.toLocaleString()} / <span className="text-emerald-600">₦{order.total_price?.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-72">
                  {!isDepositPaid && <PayButton order={order} amount={depositAmount} isFinal={false} />}

                  {order.status === 'preview-ready' && isDepositPaid && (
                    <button onClick={() => handlePreview(order.completed_file_url)} className="w-full bg-white border-2 border-emerald-600 text-emerald-600 py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 hover:bg-emerald-50 transition-all">
                      View Preview <Eye size={18} />
                    </button>
                  )}

                  {order.status === 'preview-ready' && !isFullyPaid && <PayButton order={order} amount={balanceAmount} isFinal={true} />}

                  {isFullyPaid && order.completed_file_url && (
                    <button onClick={() => handleDownload(order.completed_file_url)} className="w-full bg-emerald-600 text-white py-6 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl">
                      Download Final <Download size={18} />
                    </button>
                  )}

                  {isDepositPaid && order.status === 'in-progress' && (
                    <div className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 text-center italic font-black uppercase text-[9px] text-gray-400">
                      Crafting project in progress...
                    </div>
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

// THE DEPLOYMENT FIX:
// This forces the entire dashboard to only load in the browser,
// preventing the "window is not defined" error during build.
export default dynamicImport(() => Promise.resolve(UserDashboardContent), {
  ssr: false,
});