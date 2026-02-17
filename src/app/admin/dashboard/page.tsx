"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ChevronLeft, CheckCircle2, Clock, AlertCircle, RefreshCw, Trash2, 
  Banknote, Check, X, Download, Loader2 
} from "lucide-react";

// UPDATE THIS to your actual admin email
const ADMIN_EMAIL = "your-admin-email@example.com"; 

export default function AdminDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [writers, setWriters] = useState<any[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  /**
   * ADMIN AUTH GUARD
   * Prevents writers from accessing this page even if logged in.
   */
  const checkAdminAuth = useCallback(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();

    // 1. If no user or wrong email, redirect
    if (error || !user || user.email !== ADMIN_EMAIL) {
      router.push("/writer/login");
      return;
    }

    // 2. Double Check: Is this user registered as a writer?
    const { data: isWriter } = await supabase
      .from("writers")
      .select("id")
      .eq("id", user.id)
      .single();

    if (isWriter) {
      await supabase.auth.signOut();
      alert("Access Denied: Writer accounts cannot access the Control Panel.");
      router.push("/writer/login");
      return;
    }

    // If passed all checks, load the data
    fetchData();
  }, [supabase, router]);

  useEffect(() => {
    checkAdminAuth();
  }, [checkAdminAuth]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: ordData } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      const { data: wrtData } = await supabase.from("writers").select("id, name, is_available");
      const { data: payData } = await supabase.from("payout_requests")
        .select("*, writers(name)")
        .eq('status', 'pending');

      setOrders(ordData || []);
      setWriters(wrtData || []);
      setPayoutRequests(payData || []);
    } catch (err) { 
      console.error("Fetch error:", err); 
    } finally { 
      setLoading(false); 
    }
  }

  const filteredOrders = useMemo(() => {
    if (filterStatus === "all") return orders;
    return orders.filter(o => o.status === filterStatus);
  }, [orders, filterStatus]);

  // ... (handleStatusUpdate, assignWriter, markAsPaid, deleteOrder functions remain the same as your provided code)
  async function handleStatusUpdate(order: any, newStatus: string) {
    try {
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
      if (error) throw error;

      if (newStatus === 'completed' && order.writer_id) {
        const writerShare = order.total_price * 0.5;
        await supabase.rpc('increment_writer_earnings', { 
          w_id: order.writer_id, 
          amount: writerShare 
        });
      }
      fetchData();
    } catch (err: any) { alert(err.message); }
  }

  async function assignWriter(orderId: string, writerId: string) {
    const { error } = await supabase.from("orders")
      .update({ writer_id: writerId, status: 'in-progress' })
      .eq("id", orderId);
    if (!error) fetchData();
  }

  async function markAsPaid(requestId: string) {
    if (!confirm("Confirm you have sent the bank transfer?")) return;
    const { error } = await supabase.from("payout_requests").update({ status: 'paid' }).eq("id", requestId);
    if (!error) {
      alert("Payout settled!");
      fetchData();
    }
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
      default: return "bg-amber-100 text-amber-700 border-amber-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-start gap-4">
            <Link 
              href="/admin" 
              className="mt-2 p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-gray-900 hover:shadow-md transition-all"
            >
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase">Expert Control</h1>
              <p className="text-gray-500 font-medium italic">Monitor assignments and approve expert settlements.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsPayoutModalOpen(true)}
              className="relative p-5 bg-white border border-gray-100 rounded-[1.5rem] hover:shadow-xl transition-all group"
            >
              <Banknote size={24} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
              {payoutRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">
                  {payoutRequests.length}
                </span>
              )}
            </button>

            <div className="bg-gray-900 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 leading-none">Platform Revenue</p>
              <span className="text-2xl text-emerald-400">₦{orders.reduce((acc, curr) => acc + (curr.total_price || 0), 0).toLocaleString()}</span>
            </div>
          </div>
        </header>

        {/* REST OF YOUR UI (Filters, Table, etc.) remains unchanged */}
        <div className="flex flex-wrap gap-3 mb-8">
          {['all', 'pending', 'in-progress', 'preview-ready', 'completed'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                filterStatus === s ? "bg-gray-900 text-white border-gray-900 shadow-lg" : "bg-white text-gray-400 border-gray-100 hover:border-emerald-500"
              }`}
            >
              {s === 'preview-ready' ? "👀 Needs Review" : s.replace('-', ' ')}
            </button>
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
                    <p className="text-xs text-gray-400 font-bold italic uppercase mt-1">{order.university}</p>
                  </td>
                  <td className="p-8">
                    <select
                      value={order.writer_id || ""}
                      onChange={(e) => assignWriter(order.id, e.target.value)}
                      className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="">⚠️ Select Expert</option>
                      {writers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </td>
                  <td className="p-8">
                    <div className="flex flex-col gap-3">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order, e.target.value)}
                        className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border outline-none ${getStatusStyle(order.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In-Progress</option>
                        <option value="preview-ready">Preview-Ready</option>
                        <option value="completed">Completed</option>
                      </select>
                      {order.status === 'preview-ready' && order.completed_file_url && (
                        <a 
                          href={order.completed_file_url} 
                          target="_blank" 
                          className="flex items-center gap-2 text-[10px] font-black uppercase text-purple-600 hover:text-purple-800 transition-colors underline decoration-2 underline-offset-4"
                        >
                          <Download size={14} /> Download Submission
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    <button onClick={() => deleteOrder(order.id)} className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYOUT MODAL */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] p-12 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setIsPayoutModalOpen(false)} className="absolute top-10 right-10 text-gray-300 hover:text-gray-900 transition-colors"><X size={32}/></button>
            <div className="mb-10">
              <h2 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase">Payout Requests</h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Financial Settlements Queue</p>
            </div>
            {payoutRequests.length === 0 ? (
              <div className="py-24 text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
                <p className="text-gray-400 font-black text-xs uppercase tracking-widest italic">No pending settlements.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {payoutRequests.map((req) => (
                  <div key={req.id} className="bg-white rounded-[2.5rem] p-8 flex flex-col lg:flex-row justify-between items-center gap-8 border border-gray-100 hover:border-emerald-200 transition-all shadow-sm">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{req.writers?.name}</p>
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">₦{req.amount.toLocaleString()}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100 text-xs uppercase font-black">
                        <div><p className="text-gray-400 text-[9px] mb-1">Bank</p>{req.bank_name}</div>
                        <div><p className="text-gray-400 text-[9px] mb-1">Account #</p>{req.account_number}</div>
                        <div><p className="text-gray-400 text-[9px] mb-1">Name</p>{req.account_name}</div>
                      </div>
                    </div>
                    <button onClick={() => markAsPaid(req.id)} className="px-10 py-6 bg-gray-900 text-white rounded-[1.5rem] font-black text-xs uppercase hover:bg-emerald-600 transition-all flex items-center gap-3">
                      <Check size={18} strokeWidth={3} /> Settle Payout
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}