"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ChevronLeft, CheckCircle2, Clock, AlertCircle, RefreshCw, Trash2, 
  Banknote, Check, X, Download, Loader2, FileText, Paperclip, 
  RotateCcw, ShieldAlert
} from "lucide-react";

const ADMIN_EMAIL = "nationaldevs@gmail.com"; 

export default function AdminDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [writers, setWriters] = useState<any[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  // --- DOWNLOAD LOGIC ---
  const handleDownload = async (path: string, bucket: string = 'order-files') => {
    try {
      const { data, error } = await supabase.storage.from(bucket).download(path);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', path.split('/').pop() || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Error downloading file.");
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ordData } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      const { data: wrtData } = await supabase.from("writers").select("id, name, is_available");
      const { data: payData } = await supabase.from("payout_requests").select("*, writers(name)").eq('status', 'pending');

      setOrders(ordData || []);
      setWriters(wrtData || []);
      setPayoutRequests(payData || []);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  }, [supabase]);

  // --- NEW: PROCESS 90% REFUND ---
  async function processRefund(order: any) {
    if (!confirm(`Confirm 90% Refund (₦${order.refund_amount}) has been sent to ${order.client_name}?`)) return;
    
    const { error } = await supabase
      .from("orders")
      .update({ 
        status: 'refunded', 
        refund_status: 'processed' 
      })
      .eq("id", order.id);

    if (!error) fetchData();
  }

  // --- AUTH CHECK ---
  const checkAdminAuth = useCallback(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || user.email !== ADMIN_EMAIL) {
      router.push("/writer/login");
      return;
    }
    fetchData();
  }, [supabase, router, fetchData]);

  useEffect(() => { checkAdminAuth(); }, [checkAdminAuth]);

  const filteredOrders = useMemo(() => {
    if (filterStatus === "all") return orders;
    return orders.filter(o => o.status === filterStatus);
  }, [orders, filterStatus]);

  // Financial Stats logic
  const platformStats = useMemo(() => {
    const totalRev = orders.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
    const pendingRefunds = orders.filter(o => o.refund_status === 'pending').length;
    return { totalRev, pendingRefunds };
  }, [orders]);

  async function handleStatusUpdate(order: any, newStatus: string) {
    try {
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
      if (error) throw error;
      if (newStatus === 'completed' && order.writer_id) {
        const writerShare = order.total_price * 0.5;
        await supabase.rpc('increment_writer_earnings', { w_id: order.writer_id, amount: writerShare });
      }
      fetchData();
    } catch (err: any) { alert(err.message); }
  }

  async function assignWriter(orderId: string, writerId: string) {
    const { error } = await supabase.from("orders").update({ writer_id: writerId, status: 'in-progress' }).eq("id", orderId);
    if (!error) fetchData();
  }

  async function markAsPaid(requestId: string) {
    if (!confirm("Confirm payout?")) return;
    const { error } = await supabase.from("payout_requests").update({ status: 'paid' }).eq("id", requestId);
    if (!error) fetchData();
  }

  async function deleteOrder(orderId: string) {
    if (!confirm("Delete permanently?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (!error) fetchData();
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "in-progress": return "bg-blue-100 text-blue-700 border-blue-200";
      case "preview-ready": return "bg-purple-100 text-purple-700 border-purple-200 animate-pulse";
      case "cancelled": return "bg-red-50 text-red-700 border-red-100";
      case "refunded": return "bg-gray-100 text-gray-400 border-gray-200";
      default: return "bg-amber-100 text-amber-700 border-amber-200";
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
      <Loader2 className="animate-spin text-emerald-500 mb-4" size={48} />
      <p className="text-xs font-black uppercase tracking-widest text-gray-400">Securing Connection...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-start gap-4">
            <Link href="/admin" className="mt-2 p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-gray-900 shadow-sm transition-all"><ChevronLeft size={20} /></Link>
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase">Expert Control</h1>
              <p className="text-gray-500 font-medium italic">Monitor assignments and approve expert settlements.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsPayoutModalOpen(true)} className="relative p-5 bg-white border border-gray-100 rounded-[1.5rem] hover:shadow-xl transition-all">
              <Banknote size={24} className="text-gray-400" />
              {payoutRequests.length > 0 && <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">{payoutRequests.length}</span>}
            </button>
            <div className="bg-gray-900 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 leading-none">Net Bank Balance</p>
              <span className="text-2xl text-emerald-400">₦{platformStats.totalRev.toLocaleString()}</span>
            </div>
          </div>
        </header>

        {/* REFUND QUEUE ALERT */}
        {platformStats.pendingRefunds > 0 && (
            <div className="mb-8 p-6 bg-red-50 border-2 border-red-100 rounded-[2rem] flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <ShieldAlert className="text-red-500" size={32} />
                    <div>
                        <h3 className="font-black uppercase text-red-900 leading-none">Refunds Pending</h3>
                        <p className="text-xs font-bold text-red-600 mt-1">{platformStats.pendingRefunds} students are awaiting 90% reimbursement.</p>
                    </div>
                </div>
                <button 
                  onClick={() => setFilterStatus('cancelled')}
                  className="px-6 py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200"
                >
                  Review Queue
                </button>
            </div>
        )}

        <div className="flex flex-wrap gap-3 mb-8">
          {['all', 'pending', 'in-progress', 'preview-ready', 'completed', 'cancelled', 'refunded'].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${filterStatus === s ? "bg-gray-900 text-white border-gray-900 shadow-lg" : "bg-white text-gray-400 border-gray-100 hover:border-emerald-500"}`}>{s.replace('-', ' ')}</button>
          ))}
        </div>

        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 uppercase text-[10px] font-black text-gray-400 tracking-widest">
                <th className="p-8">Project Details</th>
                <th className="p-8">Assigned Expert</th>
                <th className="p-8">Work Status</th>
                <th className="p-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/30 transition-all">
                  <td className="p-8">
                    <p className="font-black text-gray-900 text-lg leading-tight">{order.service_type}</p>
                    <p className="text-xs text-gray-400 font-bold italic uppercase mt-1">{order.client_name} • {order.university}</p>
                  </td>
                  <td className="p-8">
                    {order.status === 'cancelled' ? (
                        <div className="text-red-400 text-[10px] font-black uppercase tracking-widest">Access Revoked</div>
                    ) : (
                        <select value={order.writer_id || ""} onChange={(e) => assignWriter(order.id, e.target.value)} className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500 transition-all">
                            <option value="">⚠️ Select Expert</option>
                            {writers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    )}
                  </td>
                  <td className="p-8">
                    <div className="flex flex-col gap-3">
                        <select value={order.status} onChange={(e) => handleStatusUpdate(order, e.target.value)} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border outline-none ${getStatusStyle(order.status)}`}>
                            <option value="pending">Pending</option>
                            <option value="in-progress">In-Progress</option>
                            <option value="preview-ready">Preview-Ready</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="refunded">Refunded</option>
                        </select>
                        {order.refund_status === 'pending' && (
                            <button onClick={() => processRefund(order)} className="flex items-center gap-2 text-[10px] font-black text-emerald-600 hover:underline uppercase">
                                <RotateCcw size={14} /> Mark 90% Refund as Paid
                            </button>
                        )}
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    <button onClick={() => deleteOrder(order.id)} className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYOUT MODAL OMITTED FOR BREVITY - KEEP YOUR EXISTING MODAL CODE */}
    </div>
  );
}