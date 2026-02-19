"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase"; 
import AdminSidebar from "@/components/layout/AdminSidebar";
import { 
  TrendingUp, Clock, CheckCircle, AlertCircle, Loader2, 
  ExternalLink, RefreshCw, Wallet, Trash2, Download,
  Search, XCircle, Banknote, ArrowUpRight, Bell, Check
} from "lucide-react";

export default function AdminOverview() {
  const [stats, setStats] = useState({
    revenue: 0, active: 0, completed: 0, pending: 0, profit: 0, pendingRefunds: 0 
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [refundOrders, setRefundOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const supabase = useMemo(() => createClient(), []);

  const getDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Orders
      const { data: allOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      
      // Fetch Admin Notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_admin', true)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(6);

      if (allOrders) {
        const validOrders = allOrders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded');
        const rev = validOrders.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
        const refundsNeeded = allOrders.filter(o => o.refund_status === 'pending');

        setStats({ 
          revenue: rev, 
          active: allOrders.filter(o => o.status === 'in-progress').length, 
          completed: allOrders.filter(o => o.status === 'completed').length, 
          pending: allOrders.filter(o => o.status === 'pending').length,
          profit: rev * 0.5,
          pendingRefunds: refundsNeeded.length
        });

        const filtered = allOrders.filter(o => 
          o.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.id.toLowerCase().includes(searchQuery.toLowerCase())
        );

        setRecentOrders(filtered.filter(o => o.refund_status !== 'pending').slice(0, 15));
        setRefundOrders(refundsNeeded);
        setNotifications(notifs || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, searchQuery]);

  useEffect(() => {
    getDashboardData();
  }, [getDashboardData]);

  async function updateOrderStatus(order: any, newStatus: string) {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
    if (!error) getDashboardData();
  }

  async function markAsRefunded(orderId: string) {
    if(!confirm("Confirm 90% refund has been sent manually?")) return;
    await supabase.from("orders").update({ status: 'refunded', refund_status: 'processed' }).eq("id", orderId);
    getDashboardData();
  }

  async function dismissNotification(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  const getStatusStyle = (status: string) => {
    const styles: any = {
      completed: "bg-emerald-100 text-emerald-700",
      "in-progress": "bg-blue-100 text-blue-700",
      pending: "bg-amber-100 text-amber-700",
      cancelled: "bg-red-100 text-red-700",
      refunded: "bg-gray-100 text-gray-700"
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="flex bg-[#fafafa] min-h-screen font-sans">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-12">
        
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight italic uppercase">Command <span className="text-emerald-600">Center</span></h1>
            <p className="text-gray-500 font-bold text-sm tracking-widest mt-1 italic">UNISUPPORT EXECUTIVE OPS</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Client..." 
                className="pl-12 pr-6 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all w-64 shadow-sm"
              />
            </div>
            <button onClick={getDashboardData} className="p-4 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-emerald-600 shadow-sm">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {/* Intelligence Feed */}
        <div className="mb-12">
          <h2 className="font-black text-sm text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Bell size={16} className="text-emerald-500" /> Live Intelligence
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {notifications.length === 0 ? (
              <div className="col-span-3 p-8 bg-white border-2 border-dashed border-gray-100 rounded-[2rem] text-center text-gray-400 font-bold text-xs uppercase italic">No new alerts</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="bg-white p-5 rounded-[2rem] border border-emerald-100 shadow-sm flex justify-between items-start animate-in fade-in slide-in-from-top-2">
                  <div>
                    <span className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md mb-2 inline-block tracking-widest">{n.type}</span>
                    <p className="text-xs font-black text-gray-900 uppercase italic leading-tight">{n.title}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{n.message}</p>
                  </div>
                  <button onClick={() => dismissNotification(n.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Check size={16}/></button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
           <StatCard label="Gross Revenue" val={`₦${stats.revenue.toLocaleString()}`} icon={<TrendingUp />} color="text-emerald-500" bg="bg-emerald-50" />
           <StatCard label="Live Jobs" val={stats.active} icon={<Clock />} color="text-blue-500" bg="bg-blue-50" />
           <StatCard label="In Review" val={stats.pending} icon={<AlertCircle />} color="text-orange-500" bg="bg-orange-50" />
           <StatCard label="Refund Queue" val={stats.pendingRefunds} icon={<Banknote />} color="text-red-500" bg="bg-red-50" />
        </div>

        {/* Refund Queue */}
        {refundOrders.length > 0 && (
          <div className="mb-12 p-8 bg-red-50/50 rounded-[3rem] border-2 border-red-50">
            <h2 className="font-black text-xl text-red-900 italic uppercase mb-6 flex items-center gap-2">
              <XCircle className="text-red-500" size={24} /> Action Required: Refunds
            </h2>
            <div className="grid gap-4">
              {refundOrders.map(order => (
                <div key={order.id} className="bg-white p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center shadow-sm border border-red-100">
                  <div className="text-center md:text-left">
                    <h4 className="font-black text-gray-900 uppercase">{order.client_name}</h4>
                    <p className="text-xs font-bold text-gray-400">ORDER ID: {order.id.slice(0, 8)}</p>
                  </div>
                  <div className="my-4 md:my-0 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payout Amount</p>
                    <p className="text-2xl font-black text-emerald-600 tracking-tighter">₦{order.refund_amount?.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={`https://wa.me/${order.client_phone?.replace(/\D/g, '')}`} target="_blank" className="p-4 bg-gray-900 text-white rounded-2xl hover:scale-105 transition-all">
                      <ExternalLink size={20} />
                    </a>
                    <button onClick={() => markAsRefunded(order.id)} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Mark Paid</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Table */}
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <h2 className="font-black text-xl text-gray-900 italic uppercase tracking-tighter">Project Logistics</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50">
                <tr>
                  <th className="px-8 py-6">Client / Project</th>
                  <th className="px-8 py-6">Timeline</th>
                  <th className="px-8 py-6">Financials</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-black text-gray-900 uppercase italic">{order.client_name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{order.service_type} • {order.university || "Private"}</p>
                    </td>
                    <td className="px-8 py-6">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order, e.target.value)}
                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-none outline-none cursor-pointer ${getStatusStyle(order.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In-Progress</option>
                        <option value="preview-ready">Preview-Ready</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </td>
                    <td className="px-8 py-6 font-black text-gray-900 italic">
                      ₦{order.amount_paid?.toLocaleString()}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button onClick={() => { if(confirm("Delete?")) supabase.from('orders').delete().eq('id', order.id).then(()=>getDashboardData()) }} className="text-gray-200 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, val, icon, color, bg }: any) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all">
      <div className={`w-12 h-12 ${bg} ${color} rounded-2xl flex items-center justify-center mb-6`}>{icon}</div>
      <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{label}</h3>
      <p className="text-3xl font-black text-gray-900 mt-2 tracking-tighter">{val}</p>
    </div>
  );
}