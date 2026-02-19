"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { 
  Clock, Download, Loader2, Lock, 
  ShieldCheck, AlertCircle, Edit3, User, Phone,
  CheckCircle, XCircle, RotateCcw
} from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

const PaystackButton = dynamic(() => import("@/components/PaystackButton"), { 
  ssr: false,
  loading: () => <div className="h-14 w-full bg-gray-100 animate-pulse rounded-2xl" />
});

export default function UserDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");

  const getDashboardData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return router.push("/auth");
    setUser(authUser);

    const [profileRes, ordersRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", authUser.id).single(),
      supabase.from("orders")
        .select(`*, writers!orders_writer_id_fkey (name)`)
        .eq("user_id", authUser.id)
        .order('created_at', { ascending: false })
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data);
      setNewName(profileRes.data.full_name || "");
      setNewWhatsapp(profileRes.data.whatsapp_number || "");
    }
    setOrders(ordersRes.data || []);
    setLoading(false);
  }, [supabase, router]);

  // --- REALTIME & INITIAL LOAD ---
  useEffect(() => {
    getDashboardData();

    // Listen for status changes (e.g., when writer uploads work)
    const channel = supabase
      .channel('user-updates')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'orders' }, 
        () => getDashboardData()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [getDashboardData, supabase]);

  // --- SECURE DOWNLOAD HANDLER ---
  const handleDownload = async (filePath: string, serviceType: string) => {
    try {
      // 1. Generate a signed URL for the private file (expires in 60s)
      const { data, error } = await supabase.storage
        .from('submissions')
        .createSignedUrl(filePath, 60);

      if (error) throw error;

      // 2. Force download in browser
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.setAttribute('download', `${serviceType.replace(/\s+/g, '-')}-Final.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Security Error: Could not verify file access.");
    }
  };

  const handleCancelOrder = async (order: any) => {
    const refundAmount = order.amount_paid * 0.9;
    const isConfirmed = confirm(
      `Terminate Order?\n\nYou're eligible for a 90% refund (₦${refundAmount.toLocaleString()}). Proceed?`
    );

    if (isConfirmed) {
      const { error } = await supabase
        .from("orders")
        .update({ status: 'cancelled', refund_status: 'pending', refund_amount: refundAmount })
        .eq("id", order.id);

      if (!error) getDashboardData();
    }
  };

  const handlePaymentSuccess = async (order: any, amountPaid: number, isFinal: boolean) => {
    const newPaidTotal = (order.amount_paid || 0) + amountPaid;
    const newStatus = isFinal ? 'completed' : 'in-progress';
    
    const { error } = await supabase
      .from("orders")
      .update({ amount_paid: newPaidTotal, status: newStatus })
      .eq("id", order.id);

    if (!error) getDashboardData();
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <Loader2 className="animate-spin text-emerald-600" size={40} />
      <p className="font-black uppercase tracking-[0.2em] text-[10px] italic">Accessing Vault...</p>
    </div>
  );

  return (
    <main className="pt-32 pb-20 px-4 min-h-screen bg-white font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-8">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Secure Scholar Portal</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none">
              Your <span className="text-emerald-600">Vault.</span>
            </h1>
          </div>

          <div className="w-full md:w-80 bg-gray-950 text-white p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center"><User size={24} /></div>
                <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Edit3 size={18} /></button>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-1">Scholar Identity</p>
              <h2 className="text-2xl font-black uppercase italic tracking-tight truncate">{profile?.full_name || "Unidentified"}</h2>
              <p className="text-[10px] text-gray-400 font-bold mt-2 flex items-center gap-2"><Phone size={10} /> {profile?.whatsapp_number || "Add Number"}</p>
            </div>
            <Lock className="absolute -bottom-4 -right-4 text-white/5" size={120} />
          </div>
        </div>

        {/* Orders Stack */}
        <div className="grid gap-8">
          {orders.length === 0 ? (
            <div className="py-32 border-2 border-dashed border-gray-100 rounded-[4rem] text-center">
              <AlertCircle className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-gray-400 font-bold italic uppercase tracking-widest text-sm">Vault is currently empty.</p>
              <button onClick={() => router.push('/order')} className="mt-6 text-emerald-600 font-black uppercase text-xs hover:underline">Deploy your first project →</button>
            </div>
          ) : (
            orders.map((order) => {
              const depositNeeded = order.total_price * 0.5;
              const amountPaid = order.amount_paid || 0;
              const isDepositPaid = amountPaid >= depositNeeded;
              const isFullyPaid = amountPaid >= order.total_price;
              const balanceRemaining = order.total_price - amountPaid;

              return (
                <div key={order.id} className="group relative bg-white border border-gray-100 p-8 md:p-12 rounded-[3.5rem] shadow-sm hover:shadow-2xl transition-all duration-500">
                  <div className="flex flex-col lg:flex-row justify-between gap-12 items-start lg:items-center relative z-10">
                    <div className="space-y-4 grow">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          order.status === 'cancelled' ? 'bg-red-50 text-red-700' : 
                          order.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                        }`}>
                          {order.status?.replace('-', ' ')}
                        </span>
                        {order.refund_status === 'pending' && (
                          <span className="px-4 py-1.5 bg-purple-50 text-purple-700 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
                            90% Refund Processing
                          </span>
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

                      {order.status !== 'cancelled' && order.status !== 'completed' && (
                        <button onClick={() => handleCancelOrder(order)} className="text-[10px] font-black uppercase text-red-400 hover:text-red-600 flex items-center gap-1">
                          <XCircle size={12} /> Terminate Order & Request 90% Refund
                        </button>
                      )}
                    </div>

                    <div className="w-full lg:w-80 space-y-4">
                      {order.status === 'cancelled' ? (
                         <div className="p-8 bg-gray-50 rounded-[2rem] text-center border border-gray-100">
                            <RotateCcw className="mx-auto text-gray-400 mb-2" size={24} />
                            <p className="text-[10px] font-black uppercase text-gray-400 italic">Order Terminated</p>
                         </div>
                      ) : (
                        <>
                          {order.status === 'awaiting-quote' && (
                            <div className="p-8 bg-gray-50 rounded-[2rem] text-center animate-pulse">
                              <Clock className="mx-auto text-orange-400 mb-2" size={24} />
                              <p className="text-[10px] font-black uppercase text-gray-500">Awaiting Analysis</p>
                            </div>
                          )}
                          
                          {order.status !== 'awaiting-quote' && !isDepositPaid && (
                            <PaystackButton 
                              order={order} amount={depositNeeded} isFinal={false} 
                              userEmail={user?.email} publicKey={process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!} 
                              onSuccess={() => handlePaymentSuccess(order, depositNeeded, false)} 
                            />
                          )}

                          {isDepositPaid && !isFullyPaid && order.status === 'in-progress' && (
                            <div className="p-8 bg-emerald-50 rounded-[2rem] text-center">
                              <Loader2 className="animate-spin text-emerald-600 mx-auto mb-2" size={24} />
                              <p className="text-[10px] font-black uppercase text-emerald-700">Writing in Progress</p>
                            </div>
                          )}

                          {order.status === 'preview-ready' && !isFullyPaid && (
                            <div className="space-y-4">
                                <div className="bg-purple-50 p-4 rounded-2xl flex items-center gap-3 border border-purple-100">
                                    <CheckCircle className="text-purple-600" size={18} />
                                    <p className="text-[10px] font-black text-purple-700 uppercase">Expert has uploaded work!</p>
                                </div>
                                <PaystackButton 
                                  order={order} amount={balanceRemaining} isFinal={true} 
                                  userEmail={user?.email} publicKey={process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!} 
                                  onSuccess={() => handlePaymentSuccess(order, balanceRemaining, true)} 
                                />
                            </div>
                          )}

                          {isFullyPaid && (
                            <button 
                                onClick={() => handleDownload(order.completed_file_url, order.service_type)}
                                className="w-full py-6 bg-emerald-600 text-white rounded-[1.8rem] font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl hover:bg-emerald-700 transition-all active:scale-95"
                            >
                              <Download size={20} /> Download Final Asset
                            </button>
                          )}
                        </>
                      )}
                    </div>
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