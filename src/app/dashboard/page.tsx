"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { 
  Clock, Download, Loader2, ShieldCheck, AlertCircle, Edit3, User, Phone,
  CheckCircle, Copy, Share2, Save, X, Percent, Tag
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
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");

  const getDashboardData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return router.push("/auth");
    setUser(authUser);

    // Fetch Profile, Orders, and count successful referrals
    const [profileRes, ordersRes, referralCountRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", authUser.id).single(),
      supabase.from("orders")
        .select(`*, writers!orders_writer_id_fkey (name)`)
        .eq("user_id", authUser.id)
        .order('created_at', { ascending: false }),
      supabase.from("referrals")
        .select('*', { count: 'exact', head: true })
        .eq("referrer_id", authUser.id)
        .eq("status", "completed") 
    ]);

    if (profileRes.data) {
      setProfile({
        ...profileRes.data,
        referral_count: referralCountRes.count || 0
      });
      setNewName(profileRes.data.full_name || "");
      setNewWhatsapp(profileRes.data.whatsapp_number || "");
    }
    setOrders(ordersRes.data || []);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    getDashboardData();
    
    const profileChannel = supabase
      .channel('profile-updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles', 
        filter: `id=eq.${user?.id}` 
      }, () => getDashboardData())
      .subscribe();

    const orderChannel = supabase
      .channel('order-updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders' 
      }, () => getDashboardData())
      .subscribe();

    return () => { 
      supabase.removeChannel(profileChannel); 
      supabase.removeChannel(orderChannel);
    };
  }, [getDashboardData, supabase, user?.id]);

  const handleUpdateProfile = async () => {
    setUpdating(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: newName,
        whatsapp_number: newWhatsapp
      })
      .eq("id", user.id);

    if (error) {
      alert("Update failed: " + error.message);
    } else {
      await getDashboardData();
      setIsEditing(false);
    }
    setUpdating(false);
  };

  const copyReferral = () => {
    const link = `https://getunisupport.xyz/auth?ref=${profile?.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (filePath: string, serviceType: string) => {
    try {
      const { data, error } = await supabase.storage.from('submissions').createSignedUrl(filePath, 60);
      if (error) throw error;
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.setAttribute('download', `${serviceType.replace(/\s+/g, '-')}-Final.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) { alert("Security Error: Could not verify file access."); }
  };

  const handlePaymentSuccess = async (order: any, amountPaid: number, isFinal: boolean) => {
    const newPaidTotal = (order.amount_paid || 0) + amountPaid;
    const newStatus = isFinal ? 'completed' : 'in-progress';
    const { error } = await supabase.from("orders").update({ amount_paid: newPaidTotal, status: newStatus }).eq("id", order.id);
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Secure Scholar Portal</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none mb-8">
              Your <span className="text-emerald-600">Vault.</span>
            </h1>
            
            {isEditing ? (
              <div className="bg-gray-50 p-6 md:p-8 rounded-[2rem] md:rounded-[3.5rem] border-2 border-emerald-500/20 space-y-4 max-w-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Full Name</label>
                    <input 
                      type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                      className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-2">WhatsApp Number</label>
                    <input 
                      type="text" value={newWhatsapp} onChange={(e) => setNewWhatsapp(e.target.value)}
                      className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm"
                      placeholder="080XXXXXXXX"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleUpdateProfile} disabled={updating} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">
                    {updating ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Save Changes
                  </button>
                  <button onClick={() => setIsEditing(false)} className="px-6 bg-white border border-gray-200 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-all"><X size={14}/></button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-4">
                <div className="group bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 flex items-center justify-between md:justify-start gap-4 flex-1">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center shrink-0"><User size={20}/></div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-gray-400">Identity</p>
                      <p className="font-black italic text-sm truncate max-w-[150px]">{profile?.full_name || "New User"}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsEditing(true)} className="p-3 bg-white border border-gray-100 rounded-2xl text-emerald-600 md:opacity-0 group-hover:opacity-90 transition-all shadow-sm">
                    <Edit3 size={16} />
                  </button>
                </div>
                <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0"><Phone size={20}/></div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-gray-400">WhatsApp</p>
                    <p className="font-black italic text-sm">{profile?.whatsapp_number || "Add Number"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DISCOUNT & REFERRAL CARD - STACKED PERCENTAGE SYSTEM */}
          <div className="bg-gray-900 text-white p-8 rounded-[3.5rem] relative overflow-hidden shadow-2xl flex flex-col justify-between border border-white/5">
             <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Loyalty Rewards</p>
                  <div className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter italic">Active</div>
                </div>
                <h3 className="text-2xl font-black uppercase italic leading-[1.1] mb-6">
                  { (profile?.referral_count || 0) > 0 
                    ? `You've Stacked ${(profile?.referral_count || 0) * 10}% Off.`
                    : "Stack 10% Off Next Project."
                  }
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-black uppercase opacity-50 mb-2 text-white/70">Share Referral Link</p>
                    <button 
                      onClick={copyReferral}
                      className={`w-full ${copied ? 'bg-emerald-600 border-emerald-500' : 'bg-white/5 hover:bg-white/10 border-white/10'} border p-4 rounded-2xl flex items-center justify-between transition-all group`}
                    >
                      <span className="text-[10px] font-bold truncate pr-4 opacity-80">
                        {copied ? "LINK COPIED" : `ref=${profile?.referral_code}`}
                      </span>
                      {copied ? <CheckCircle size={14} /> : <Copy size={14} className="text-emerald-400 group-hover:scale-110 transition-transform" />}
                    </button>
                  </div>
                  
                  <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                    <div>
                      <p className="text-[9px] font-black uppercase opacity-50 text-white/60">Stacked Discount</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-4xl font-black italic text-emerald-400">{(profile?.referral_count || 0) * 10}</p>
                        <span className="text-xl font-black text-emerald-400">%</span>
                      </div>
                    </div>
                    <div className="bg-emerald-600/10 p-3 rounded-2xl border border-emerald-500/20">
                      <Percent size={20} className="text-emerald-400" />
                    </div>
                  </div>
                </div>
             </div>
             <Share2 className="absolute -bottom-6 -right-6 text-white/5" size={140} />
          </div>
        </div>

        <div className="grid gap-8">
          {orders.length === 0 ? (
            <div className="py-32 border-2 border-dashed border-gray-100 rounded-[4rem] text-center bg-gray-50/50">
              <AlertCircle className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-gray-400 font-bold italic uppercase tracking-widest text-sm">Vault is currently empty.</p>
              <button onClick={() => router.push('/order')} className="mt-6 bg-gray-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all">Deploy first project</button>
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
                  <div className={`absolute top-0 left-0 w-full h-1.5 ${
                    order.status === 'completed' ? 'bg-emerald-500' : 
                    order.status === 'cancelled' ? 'bg-red-500' : 'bg-orange-400'
                  }`} />

                  <div className="flex flex-col lg:flex-row justify-between gap-12 items-start lg:items-center relative z-10">
                    <div className="space-y-4 grow">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' : 
                          order.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                        }`}>
                          {order.status?.replace('-', ' ')}
                        </span>
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">ID: {order.id.slice(0, 8)}</span>
                      </div>

                      <h3 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-[0.9] group-hover:text-emerald-600 transition-colors">
                        {order.service_type}
                      </h3>

                      <div className="flex items-center gap-6 pt-2">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Fee</p>
                          <p className="text-xl font-black italic text-gray-900">${(order.total_price || 0).toFixed(2)}</p>
                        </div>
                        <div className="h-8 w-px bg-gray-100" />
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Settled</p>
                          <p className="text-xl font-black italic text-emerald-600">${amountPaid.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full lg:w-80 space-y-4">
                        {order.status === 'awaiting-quote' && (
                            <div className="p-8 bg-gray-50 rounded-[2.5rem] text-center border border-gray-100 italic">
                              <Clock className="mx-auto text-orange-400 mb-2 animate-pulse" size={24} />
                              <p className="text-[10px] font-black uppercase text-gray-500">Awaiting Price Quote</p>
                            </div>
                        )}
                        
                        {order.status !== 'awaiting-quote' && !isDepositPaid && order.status !== 'cancelled' && (
                          <div className="space-y-3">
                            <p className="text-[9px] font-black uppercase text-center text-gray-400">Required: 50% Deposit</p>
                            <PaystackButton 
                              order={order} amount={depositNeeded} isFinal={false} 
                              userEmail={user?.email} publicKey={process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!} 
                              onSuccess={() => handlePaymentSuccess(order, depositNeeded, false)} 
                            />
                          </div>
                        )}

                        {isDepositPaid && !isFullyPaid && (order.status === 'in-progress' || order.status === 'pending') && (
                          <div className="p-8 bg-emerald-50 rounded-[2.5rem] text-center border border-emerald-100/50">
                            <Loader2 className="animate-spin text-emerald-600 mx-auto mb-2" size={24} />
                            <p className="text-[10px] font-black uppercase text-emerald-700 italic">Processing Brief</p>
                          </div>
                        )}

                        {order.status === 'preview-ready' && !isFullyPaid && (
                          <div className="space-y-3">
                            <div className="bg-orange-50 p-4 rounded-2xl flex items-center gap-3 border border-orange-100 mb-4">
                              <AlertCircle className="text-orange-500 shrink-0" size={18} />
                              <p className="text-[10px] font-bold text-orange-800 leading-tight uppercase">Settle balance to download final asset.</p>
                            </div>
                            <PaystackButton 
                              order={order} amount={balanceRemaining} isFinal={true} 
                              userEmail={user?.email} publicKey={process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!} 
                              onSuccess={() => handlePaymentSuccess(order, balanceRemaining, true)} 
                            />
                          </div>
                        )}

                        {isFullyPaid && order.status === 'completed' && (
                          <button 
                              onClick={() => handleDownload(order.completed_file_url, order.service_type)}
                              className="w-full py-6 bg-gray-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-emerald-600 transition-all active:scale-95 group"
                          >
                            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" /> Download Asset
                          </button>
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