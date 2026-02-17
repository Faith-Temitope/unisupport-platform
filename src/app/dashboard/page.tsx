"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  CreditCard, 
  Download, 
  Loader2,
  AlertCircle,
  LayoutDashboard
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function UserDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function getDashboardData() {
      try {
        setLoading(true);
        setErrorState(null);

        // 1. Authenticate User
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push("/auth");
          return;
        }

        setUser(user);

        // 2. Fetch Orders with Writer Join
        // We use !orders_writer_id_fkey to be explicit and avoid "writers_1" errors
        const { data, error: queryError } = await supabase
          .from("orders")
          .select(`
            *,
            writers!orders_writer_id_fkey (
              name,
              specialization
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (queryError) {
          console.error("Supabase Query Error:", queryError);
          throw new Error(queryError.message);
        }

        setOrders(data || []);
      } catch (err: any) {
        console.error("Dashboard caught error:", err);
        setErrorState(err.message || "Connection failed. Please refresh.");
      } finally {
        setLoading(false);
      }
    }

    getDashboardData();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="animate-spin text-emerald-600" size={48} />
            <LayoutDashboard className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600/50" size={20} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">Unlocking Vault</p>
        </div>
      </div>
    );
  }

  return (
    <main className="pt-32 pb-20 px-4 min-h-screen bg-white">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <LayoutDashboard size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Client Portal</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
              My <span className="text-emerald-600">Projects.</span>
            </h1>
            <p className="text-gray-400 font-medium italic mt-4">
              Authenticated as <span className="text-gray-900">{user?.email}</span>
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] px-8 py-4 border-2 border-gray-100 rounded-2xl hover:border-red-100 hover:text-red-600 transition-all"
          >
            Sign Out
          </button>
        </header>

        {/* ERROR DISPLAY */}
        {errorState && (
          <div className="mb-8 p-6 bg-red-50 border-2 border-red-100 rounded-[2.5rem] flex items-center gap-4 text-red-600 animate-in fade-in slide-in-from-top-4">
            <AlertCircle size={24} />
            <div>
              <p className="font-black uppercase italic text-sm tracking-tight">System Sync Error</p>
              <p className="text-xs font-medium opacity-80 uppercase tracking-wide">{errorState}</p>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {orders.length === 0 && !errorState ? (
          <div className="text-center py-32 border-2 border-dashed border-gray-100 rounded-[4rem] bg-gray-50/50">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
              <Clock size={40} />
            </div>
            <p className="text-gray-400 font-black uppercase italic text-xl tracking-tighter">
              No active research projects.
            </p>
            <button 
              onClick={() => router.push('/order')}
              className="mt-6 bg-gray-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all"
            >
              Start New Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {orders.map((order) => (
              <div 
                key={order.id} 
                className="group bg-white rounded-[3rem] p-8 md:p-12 border border-gray-100 flex flex-col md:flex-row gap-8 items-center hover:shadow-2xl hover:border-emerald-100 transition-all duration-500"
              >
                {/* STATUS SPHERE */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-110 ${
                    order.status === 'completed' 
                      ? 'bg-emerald-50 text-emerald-600 shadow-inner' 
                      : 'bg-orange-50 text-orange-600 shadow-inner'
                  }`}>
                    {order.status === 'completed' ? <CheckCircle2 size={44} strokeWidth={2.5} /> : <Clock size={44} strokeWidth={2.5} />}
                  </div>
                  <div className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full ${
                    order.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white'
                  }`}>
                    {order.status}
                  </div>
                </div>

                {/* PROJECT DETAILS */}
                <div className="grow space-y-4 text-center md:text-left">
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    <span className="px-3 py-1 bg-gray-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-500">
                      ID: {order.id.slice(0,8)}
                    </span>
                    <span className="px-3 py-1 bg-emerald-50 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-600">
                      {order.tier || 'Standard'}
                    </span>
                  </div>
                  
                  <h3 className="text-4xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">
                    {order.service_type}
                  </h3>
                  
                  <p className="text-sm text-gray-400 font-medium line-clamp-2 max-w-2xl mx-auto md:mx-0 italic">
                    {order.description || "Project details being finalized by research team."}
                  </p>

                  <div className="pt-2 border-t border-gray-50 flex flex-col md:flex-row gap-4 items-center">
                    {order.writers ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold">
                          {order.writers.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-900">{order.writers.name}</p>
                          <p className="text-[9px] font-bold uppercase text-emerald-600 italic">{order.writers.specialization}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400 animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest italic">Matching with Expert...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* PROJECT ACTIONS */}
                <div className="flex flex-col gap-3 w-full md:w-72">
                  {order.status === 'preview-ready' ? (
                    <button className="bg-emerald-600 text-white px-8 py-6 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 transition-all active:scale-95">
                      Settle Balance <CreditCard size={18} />
                    </button>
                  ) : order.status === 'completed' ? (
                    <button className="bg-gray-900 text-white px-8 py-6 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all hover:bg-emerald-600 active:scale-95 shadow-2xl">
                      Get Deliverable <Download size={18} />
                    </button>
                  ) : (
                    <button className="bg-white border-2 border-gray-100 text-gray-900 px-8 py-6 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:border-emerald-500 hover:text-emerald-600 transition-all active:scale-95">
                      Open Console <MessageSquare size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <footer className="mt-20 pt-10 border-t border-gray-50 text-center">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em] italic">
            Secure Academic Vault • uniSupport System v2.4
          </p>
        </footer>
      </div>
    </main>
  );
}