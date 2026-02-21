"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ChevronLeft, CheckCircle2, Clock, AlertCircle, RefreshCw, Trash2, 
  Banknote, Check, X, Download, Loader2, FileText, Paperclip, 
  RotateCcw, ShieldAlert, Search, ExternalLink, Bell 
} from "lucide-react";

const ADMIN_EMAIL = "vault@getunisupport.xyz"; 

export default function AdminDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [writers, setWriters] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ordData } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      const { data: wrtData } = await supabase.from("writers").select("id, name");
      const { data: payData } = await supabase.from("payout_requests").select("*, writers(name)").eq('status', 'pending');
      const { data: notifData } = await supabase.from("notifications")
        .select("*").eq('is_admin', true).eq('is_read', false).order("created_at", { ascending: false }).limit(5);

      setOrders(ordData || []);
      setWriters(wrtData || []);
      setPayoutRequests(payData || []);
      setNotifications(notifData || []);
    } catch (err) { console.error("Fetch error:", err); } 
    finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email !== ADMIN_EMAIL) router.push("/writer/login");
      else fetchData();
    };
    checkAuth();
  }, [supabase, router, fetchData]);

  // --- FILTERS ---
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = o.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) || o.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === 'all' || o.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [orders, filterStatus, searchQuery]);

  // --- ACTIONS ---
  async function handleStatusUpdate(order: any, newStatus: string) {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
    if (newStatus === 'completed' && order.writer_id) {
      const share = (order.amount_paid || 0) * 0.5;
      await supabase.rpc('increment_writer_earnings', { row_id: order.writer_id, amount: share });
    }
    fetchData();
  }

  async function assignWriter(orderId: string, writerId: string) {
    await supabase.from("orders").update({ writer_id: writerId, status: 'in-progress' }).eq("id", orderId);
    fetchData();
  }

  async function dismissNotif(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  const getStatusStyle = (status: string) => {
    const styles: any = {
      completed: "bg-emerald-100 text-emerald-700",
      "in-progress": "bg-blue-100 text-blue-700",
      "preview-ready": "bg-purple-100 text-purple-700 animate-pulse",
      cancelled: "bg-red-50 text-red-700",
      refunded: "bg-gray-100 text-gray-500"
    };
    return styles[status] || "bg-amber-100 text-amber-700";
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase">Control <span className="text-emerald-600">Center</span></h1>
            <p className="text-gray-500 font-bold text-xs tracking-widest uppercase">Admin Ops • Intelligence Archive</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Client..."
                className="pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl text-xs font-black uppercase shadow-sm w-64 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all"
              />
            </div>
            <button onClick={() => setIsPayoutModalOpen(true)} className="relative p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-all">
              <Banknote size={24} className="text-gray-400" />
              {payoutRequests.length > 0 && <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">{payoutRequests.length}</span>}
            </button>
          </div>
        </header>

        {/* INTELLIGENCE FEED */}
        {notifications.length > 0 && (
          <div className="mb-10">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Bell size={14} className="text-emerald-500" /> Live Intelligence
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {notifications.map(n => (
                <div key={n.id} className="bg-white p-5 rounded-[2rem] border border-emerald-100 shadow-sm flex justify-between items-start animate-in fade-in slide-in-from-top-2">
                  <div>
                    <span className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded mb-2 inline-block tracking-tighter">{n.type}</span>
                    <p className="text-xs font-black text-gray-900 uppercase italic leading-tight">{n.title}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{n.message}</p>
                  </div>
                  <button onClick={() => dismissNotif(n.id)} className="p-1 text-gray-200 hover:text-emerald-500"><Check size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOGISTICS TABLE */}
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex gap-2 overflow-x-auto no-scrollbar">
            {['all', 'pending', 'in-progress', 'preview-ready', 'completed', 'cancelled', 'refunded'].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? "bg-gray-900 text-white shadow-lg" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}>{s}</button>
            ))}
          </div>
          
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
              <tr>
                <th className="p-8">Identification</th>
                <th className="p-8">Expert Assigned</th>
                <th className="p-8">Lifecycle</th>
                <th className="p-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/20 transition-all group">
                  <td className="p-8">
                    <p className="font-black text-gray-900 uppercase italic leading-none">{order.client_name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-2">{order.service_type} • ₦{order.amount_paid?.toLocaleString()}</p>
                  </td>
                  <td className="p-8">
                    <select 
                      disabled={order.status === 'cancelled' || order.status === 'refunded'}
                      value={order.writer_id || ""} 
                      onChange={(e) => assignWriter(order.id, e.target.value)} 
                      className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-30"
                    >
                      <option value="">Select Expert</option>
                      {writers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </td>
                  <td className="p-8">
                    <div className="flex flex-col gap-2">
                      <select value={order.status} onChange={(e) => handleStatusUpdate(order, e.target.value)} className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border-none outline-none ${getStatusStyle(order.status)}`}>
                        {['pending', 'in-progress', 'preview-ready', 'completed', 'cancelled', 'refunded'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      {order.refund_status === 'pending' && <p className="text-[8px] font-black text-red-500 uppercase animate-pulse">⚠️ Refund Required</p>}
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    <div className="flex justify-end gap-2">
                      <a href={`https://wa.me/${order.client_phone?.replace(/\D/g, '')}`} target="_blank" className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                        <ExternalLink size={16} />
                      </a>
                      <button onClick={() => { if(confirm("Delete?")) supabase.from('orders').delete().eq('id', order.id).then(()=>fetchData()) }} className="p-3 text-gray-200 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}