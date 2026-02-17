"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase"; 
import AdminSidebar from "@/components/layout/AdminSidebar";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  RefreshCw, 
  Wallet, 
  Trash2,
  Download,
  FileIcon,
  Search
} from "lucide-react";
import Link from "next/link";

export default function AdminOverview() {
  const [stats, setStats] = useState({
    revenue: 0, active: 0, completed: 0, pending: 0, profit: 0 
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const supabase = useMemo(() => createClient(), []);

  async function getDashboardData() {
    setLoading(true);
    try {
      const { data: allOrders, error } = await supabase.from('orders').select('*');
      if (error) throw error;

      if (allOrders) {
        const validOrders = allOrders.filter(o => o.status !== 'cancelled');
        const rev = validOrders.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
        const completedOrders = allOrders.filter(o => o.status === 'completed');
        const profitTotal = completedOrders.reduce((acc, curr) => acc + ((curr.total_price || 0) * 0.5), 0);
        
        setStats({ 
          revenue: rev, 
          active: allOrders.filter(o => o.status === 'in-progress').length, 
          completed: completedOrders.length, 
          pending: allOrders.filter(o => o.status === 'pending').length,
          profit: profitTotal
        });
        
        const sorted = [...allOrders].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRecentOrders(sorted.slice(0, 10));
      }
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getDashboardData();
  }, [supabase]);

  // FILE DOWNLOAD LOGIC
  const downloadFile = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from('order-files').download(path);
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'briefing-file';
      a.click();
    } catch (err) {
      alert("Could not download file. Check if it exists in storage.");
    }
  };

  async function updateOrderStatus(orderId: string, newStatus: string, currentOrder: any) {
    try {
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
      if (error) throw error;

      if (newStatus === "completed" && currentOrder.writer_id) {
        const writerPay = (currentOrder.total_price || 0) * 0.5;
        await supabase.rpc('increment_writer_earnings', {
          row_id: currentOrder.writer_id,
          amount: writerPay
        });
      }
      getDashboardData();
    } catch (err: any) {
      alert("Update failed: " + err.message);
    }
  }

  async function deleteOrder(id: string) {
    if (!confirm("Permanently delete this order?")) return;
    await supabase.from("orders").delete().eq("id", id);
    getDashboardData();
  }

  const getStatusStyle = (status: string) => {
    const styles: any = {
      completed: "bg-emerald-100 text-emerald-700",
      "in-progress": "bg-blue-100 text-blue-700",
      pending: "bg-amber-100 text-amber-700",
      cancelled: "bg-red-100 text-red-700"
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
            <p className="text-gray-500 font-bold text-sm tracking-widest mt-1">UNISUPPORT EXECUTIVE OVERVIEW • 2026</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search Client ID..." 
                className="pl-12 pr-6 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all w-64 shadow-sm"
              />
            </div>
            <button onClick={getDashboardData} className="p-4 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-emerald-600 shadow-sm">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Gross Revenue", val: `₦${stats.revenue.toLocaleString()}`, icon: <TrendingUp />, color: "text-emerald-500", bg: "bg-emerald-50" },
            { label: "Company Profit", val: `₦${stats.profit.toLocaleString()}`, icon: <Wallet />, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "Live Jobs", val: stats.active, icon: <Clock />, color: "text-purple-500", bg: "bg-purple-50" },
            { label: "New Requests", val: stats.pending, icon: <AlertCircle />, color: "text-orange-500", bg: "bg-orange-50" },
          ].map((s, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center mb-6`}>{s.icon}</div>
              <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{s.label}</h3>
              <p className="text-3xl font-black text-gray-900 mt-2 tracking-tighter">{s.val}</p>
            </div>
          ))}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-white/50 backdrop-blur-xl">
            <h2 className="font-black text-xl text-gray-900 italic uppercase tracking-tighter">Recent Logistics</h2>
            <Link href="/admin/dashboard" className="bg-gray-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all">Archive →</Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50">
                <tr>
                  <th className="px-8 py-6">Client / Org</th>
                  <th className="px-8 py-6">Briefing File</th>
                  <th className="px-8 py-6">Lifecycle</th>
                  <th className="px-8 py-6">Value</th>
                  <th className="px-8 py-6">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-black text-gray-900 text-sm uppercase italic tracking-tight">{order.client_name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{order.university}</p>
                    </td>
                    <td className="px-8 py-6">
                      {order.file_url ? (
                        <button 
                          onClick={() => downloadFile(order.file_url)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                          <Download size={12} /> Get Docs
                        </button>
                      ) : (
                        <span className="text-[10px] font-black text-gray-300 uppercase italic">No File</span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value, order)}
                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-none outline-none cursor-pointer appearance-none text-center shadow-sm ${getStatusStyle(order.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In-Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-8 py-6 text-sm font-black text-gray-900 tracking-tighter">
                      ₦{order.total_price?.toLocaleString()}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <a 
                          href={`https://wa.me/${order.client_phone?.replace(/\D/g, '')}`} 
                          target="_blank" 
                          className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
                          title="Contact Client"
                        >
                          <ExternalLink size={16} />
                        </a>
                        <button 
                          onClick={() => deleteOrder(order.id)}
                          className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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