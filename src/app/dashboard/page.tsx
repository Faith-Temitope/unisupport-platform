"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { CheckCircle2, Clock, MessageSquare, CreditCard, Download } from "lucide-react";

export default function UserDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getDashboardData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("orders")
          .select("*, writers(name, specialization)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        setOrders(data || []);
      }
    }
    getDashboardData();
  }, []);

  return (
    <main className="pt-32 pb-20 px-4 min-h-screen bg-white">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">My <span className="text-emerald-600">Projects.</span></h1>
            <p className="text-gray-400 font-medium italic mt-2">Welcome back, {user?.email?.split('@')[0]}</p>
          </div>
          <button className="text-[10px] font-black uppercase tracking-[0.2em] px-6 py-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all">Logout</button>
        </header>

        {/* Order Grid */}
        <div className="grid grid-cols-1 gap-8">
          {orders.map((order) => (
            <div key={order.id} className="bg-gray-50 rounded-[2.5rem] p-8 md:p-12 border border-gray-100 flex flex-col md:flex-row gap-8 items-center">
              
              {/* Status Indicator */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${order.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                  {order.status === 'completed' ? <CheckCircle2 size={32} /> : <Clock size={32} />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">{order.status}</span>
              </div>

              {/* Order Info */}
              <div className="grow space-y-2">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">{order.service_type}</h3>
                <p className="text-sm text-gray-500 font-medium line-clamp-1">{order.description}</p>
                <div className="flex gap-4 pt-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">ID: {order.id.slice(0,8)}</span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase italic">Expert: {order.writers?.name || "Assigning..."}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 w-full md:w-auto">
                {order.status === 'preview-ready' ? (
                  <button className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-xl shadow-emerald-500/20 hover:bg-emerald-500 transition-all">
                    Pay Balance & Download <CreditCard size={14} />
                  </button>
                ) : order.status === 'completed' ? (
                  <button className="bg-gray-900 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                    Download Final <Download size={14} />
                  </button>
                ) : (
                  <button className="border-2 border-gray-200 text-gray-900 px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-white transition-all">
                    Chat with Expert <MessageSquare size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}