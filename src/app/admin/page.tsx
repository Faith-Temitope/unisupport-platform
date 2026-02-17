"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase"; 
import AdminSidebar from "@/components/layout/AdminSidebar";
import { TrendingUp, Clock, CheckCircle, AlertCircle, Loader2, ExternalLink, RefreshCw, Wallet, Trash2 } from "lucide-react";
import Link from "next/link";

export default function AdminOverview() {
  const [stats, setStats] = useState({
    revenue: 0,
    active: 0,
    completed: 0,
    pending: 0,
    profit: 0 
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  async function getDashboardData() {
    setLoading(true);
    try {
      const { data: allOrders, error } = await supabase.from('orders').select('*');
      if (error) throw error;

      if (allOrders) {
        // Only count revenue for orders that aren't cancelled
        const validOrders = allOrders.filter(o => o.status !== 'cancelled');
        const rev = validOrders.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
        
        const completedOrders = allOrders.filter(o => o.status === 'completed');
        const profitTotal = completedOrders.reduce((acc, curr) => acc + ((curr.total_price || 0) * 0.5), 0);
        
        const activeCount = allOrders.filter(o => o.status === 'in-progress').length;
        const pendingCount = allOrders.filter(o => o.status === 'pending').length;

        setStats({ 
          revenue: rev, 
          active: activeCount, 
          completed: completedOrders.length, 
          pending: pendingCount,
          profit: profitTotal
        });
        
        const sorted = [...allOrders].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRecentOrders(sorted.slice(0, 8));
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getDashboardData();
  }, [supabase]);

  async function updateOrderStatus(orderId: string, newStatus: string, currentOrder: any) {
    try {
      const { error: statusError } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (statusError) throw statusError;

      // Logic to pay writers 50% only if marked completed
      if (newStatus === "completed" && currentOrder.writer_id) {
        const writerPay = (currentOrder.total_price || 0) * 0.5;
        const { error: payError } = await supabase.rpc('increment_writer_earnings', {
          row_id: currentOrder.writer_id,
          amount: writerPay
        });
        if (payError) console.error("Payment failed:", payError);
      }
      
      getDashboardData();
    } catch (err: any) {
      alert("Update failed: " + err.message);
    }
  }

  // NEW: Delete Order Function
  async function deleteOrder(id: string) {
    if (!confirm("Permanently delete this order record? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
      getDashboardData();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-100 text-emerald-700";
      case "in-progress": return "bg-blue-100 text-blue-700";
      case "preview-ready": return "bg-purple-100 text-purple-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-amber-100 text-amber-700";
    }
  };

  const statCards = [
    { label: "Total Revenue", value: `₦${stats.revenue.toLocaleString()}`, sub: "Gross (Excl. Cancelled)", icon: <TrendingUp className="text-emerald-500" />, color: "bg-emerald-50" },
    { label: "Net Profit", value: `₦${stats.profit.toLocaleString()}`, sub: "Company 50% Share", icon: <Wallet className="text-blue-500" />, color: "bg-blue-50" },
    { label: "Active Jobs", value: stats.active, sub: "In production", icon: <Clock className="text-purple-500" />, color: "bg-purple-50" },
    { label: "Urgent", value: stats.pending, sub: "Pending start", icon: <AlertCircle className="text-orange-500" />, color: "bg-orange-50" },
  ];

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-8">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Executive Overview</h1>
            <p className="text-gray-500 font-medium">Control center for uniSupport operations.</p>
          </div>
          <button onClick={getDashboardData} className="p-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all text-gray-600 shadow-sm">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-4xl border border-gray-100 shadow-sm">
              <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
                {stat.icon}
              </div>
              <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest">{stat.label}</h3>
              <p className="text-2xl font-black text-gray-900 mt-1">{stat.value}</p>
              <p className="text-xs text-gray-400 font-bold mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center">
            <h2 className="font-black text-xl text-gray-900">Recent Activity</h2>
            <Link href="/admin/dashboard" className="text-emerald-600 font-black text-sm hover:underline">Full Database →</Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-4">Client</th>
                  <th className="px-8 py-4">Service</th>
                  <th className="px-8 py-4">Status Update</th>
                  <th className="px-8 py-4">Price</th>
                  <th className="px-8 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-5">
                      <p className="font-bold text-gray-900">{order.client_name}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">{order.university}</p>
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-600 font-medium">{order.service_type}</td>
                    <td className="px-8 py-5">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value, order)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border-none outline-none cursor-pointer appearance-none text-center ${getStatusStyle(order.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In-Progress</option>
                        <option value="preview-ready">Preview-Ready</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-8 py-5 text-sm font-black text-gray-900">₦{order.total_price?.toLocaleString()}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <a href={`https://wa.me/${order.client_phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-50 text-emerald-600 rounded-lg inline-flex items-center gap-1 text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all" title="Chat on WhatsApp">
                          Chat <ExternalLink size={12} />
                        </a>
                        <button 
                          onClick={() => deleteOrder(order.id)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                          title="Delete Order"
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