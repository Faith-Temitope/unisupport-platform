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
  AlertCircle 
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

        // 1. Get the current user session
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push("/auth");
          return;
        }

        setUser(user);

        // 2. Fetch orders with explicit relation handling
        // We use the plural 'writers' because that is your table name
        const { data, error: queryError } = await supabase
          .from("orders")
          .select(`
            *,
            writers (
              name,
              specialization
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (queryError) {
          console.error("Supabase Query Error:", {
            message: queryError.message,
            details: queryError.details,
            hint: queryError.hint,
            code: queryError.code
          });
          throw new Error(queryError.message);
        }

        setOrders(data || []);
      } catch (err: any) {
        console.error("Dashboard caught error:", err);
        setErrorState(err.message || "Failed to load projects");
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
          <Loader2 className="animate-spin text-emerald-600" size={48} />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Accessing Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="pt-32 pb-20 px-4 min-h-screen bg-white">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">
              My <span className="text-emerald-600">Projects.</span>
            </h1>
            <p className="text-gray-400 font-medium italic mt-2">
              Welcome back, {user?.email?.split('@')[0]}
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="text-[10px] font-black uppercase tracking-[0.2em] px-6 py-3 border border-gray-100 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all font-bold"
          >
            Logout
          </button>
        </header>

        {/* Error State View */}
        {errorState && (
          <div className="mb-8 p-6 bg-red-50 border border-red-100 rounded-[2rem] flex items-center gap-4 text-red-600">
            <AlertCircle size={24} />
            <div>
              <p className="font-black uppercase italic text-sm">System Error</p>
              <p className="text-xs font-medium opacity-80">{errorState}</p>
            </div>
          </div>
        )}

        {orders.length === 0 && !errorState ? (
          <div className="text-center py-32 border-2 border-dashed border-gray-100 rounded-[4rem] bg-gray-50/30">
            <p className="text-gray-400 font-black uppercase italic text-xl tracking-tighter">
              Your vault is currently empty.
            </p>
            <button 
              onClick={() => router.push('/order')}
              className="mt-6 text-emerald-600 font-black uppercase italic text-sm hover:underline"
            >
              Start your first project →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {orders.map((order) => (
              <div 
                key={order.id} 
                className="group bg-gray-50 rounded-[2.5rem] p-8 md:p-12 border border-gray-100 flex flex-col md:flex-row gap-8 items-center hover:border-emerald-200 transition-all duration-500"
              >
                {/* Status Indicator */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${
                    order.status === 'completed' 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-orange-100 text-orange-600'
                  }`}>
                    {order.status === 'completed' ? <CheckCircle2 size={40} /> : <Clock size={40} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest mt-2">{order.status}</span>
                </div>

                {/* Info Container */}
                <div className="grow space-y-3 text-center md:text-left">
                  <div className="inline-block px-3 py-1 bg-white rounded-full text-[9px] font-black uppercase tracking-widest text-gray-400 border border-gray-100">
                    {order.tier || 'Standard'} Tier
                  </div>
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">
                    {order.service_type || 'Academic Project'}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium line-clamp-2 max-w-xl mx-auto md:mx-0">
                    {order.description || 'No description provided.'}
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      ID: <span className="text-gray-900">{order.id.slice(0,8)}</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase italic tracking-widest">
                      Expert: {order.writers?.name || "Assigning..."}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 w-full md:w-64">
                  {order.status === 'preview-ready' ? (
                    <button className="bg-emerald-600 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 hover:bg-emerald-500 transition-all active:scale-95">
                      Pay Balance & Download <CreditCard size={16} />
                    </button>
                  ) : order.status === 'completed' ? (
                    <button className="bg-gray-900 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all hover:bg-emerald-600 active:scale-95 shadow-xl">
                      Download Final <Download size={16} />
                    </button>
                  ) : (
                    <button className="bg-white border-2 border-gray-100 text-gray-900 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:border-emerald-500 hover:text-emerald-600 transition-all active:scale-95">
                      Chat with Expert <MessageSquare size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}