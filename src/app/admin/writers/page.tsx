"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { UserCheck, Star, Loader2, Plus, Trash2, RefreshCw, HandCoins, Briefcase } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function WritersPage() {
  const [writers, setWriters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  async function fetchWriters() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("writers")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setWriters(data || []);
    } catch (err: any) {
      console.error("Error fetching writers:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWriters();
  }, [supabase]);

  async function handleResetPayout(id: string, name: string) {
    if (!confirm(`Confirm payout to ${name}? This resets their balance to $0.`)) return;
    
    const { error } = await supabase
      .from("writers")
      .update({ earnings: 0 })
      .eq("id", id);

    if (error) alert(error.message);
    else fetchWriters();
  }

  async function deleteWriter(id: string) {
    if (!confirm("Remove this expert from the platform? This cannot be undone.")) return;
    const { error } = await supabase.from("writers").delete().eq("id", id);
    if (error) alert(error.message);
    else fetchWriters();
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Expert <span className="text-emerald-600">Registry</span></h1>
            <p className="text-gray-500 font-medium italic">Monitor performance and manage payroll.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={fetchWriters}
              className="p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-100 transition-all text-gray-600 shadow-sm"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <Link 
              href="/admin/writers/new"
              className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl hover:bg-emerald-600 transition-all"
            >
              <Plus size={18} /> Onboard Expert
            </Link>
          </div>
        </header>

        {/* ANALYTICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <UserCheck size={28} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Active Bench</p>
              <p className="text-3xl font-black text-gray-900 tracking-tighter">{writers.length}</p>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <Briefcase size={28} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Live Tasks</p>
              <p className="text-3xl font-black text-gray-900 tracking-tighter">
                {writers.reduce((acc, curr) => acc + (curr.active_tasks || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        {/* TABLE CONTAINER */}
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-900 text-gray-400 text-[9px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-10 py-6">Expert Profile</th>
                <th className="px-8 py-6">Specialization</th>
                <th className="px-8 py-6 text-center">Load</th>
                <th className="px-8 py-6">Performance</th>
                <th className="px-8 py-6">Pending Payout</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-10 py-6 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && writers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-32 text-center">
                    <Loader2 className="animate-spin inline text-emerald-600 mb-4" size={40} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Scanning Database...</p>
                  </td>
                </tr>
              ) : (
                writers.map((writer) => (
                  <tr key={writer.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden relative border border-gray-200">
                          {writer.avatar_url ? (
                            <Image src={writer.avatar_url} alt="" fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-black text-emerald-600 bg-emerald-50">
                              {writer.name[0]}
                            </div>
                          )}
                        </div>
                        <span className="font-black text-gray-900 uppercase italic tracking-tight">{writer.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-[11px] text-gray-500 font-bold uppercase">{writer.specialization || "Generalist"}</td>
                    <td className="px-8 py-6 text-center">
                       <span className={`font-black px-3 py-1 rounded-lg text-xs ${writer.active_tasks > 3 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-900'}`}>
                         {writer.active_tasks || 0}
                       </span>
                    </td>
                    <td className="px-8 py-6 font-bold text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <Star size={14} className="fill-yellow-400 text-yellow-400"/> 
                        <span className="text-xs font-black">{writer.rating?.toFixed(1) || "5.0"}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                         <span className="font-black text-gray-900 text-sm">${writer.earnings?.toLocaleString()}</span>
                         {writer.earnings > 0 && (
                            <button 
                              onClick={() => handleResetPayout(writer.id, writer.name)}
                              className="p-2 bg-emerald-50 text-emerald-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-600 hover:text-white"
                              title="Mark as Paid"
                            >
                              <HandCoins size={16} />
                            </button>
                         )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${
                        writer.is_available ? 'text-emerald-600' : 'text-gray-300'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${writer.is_available ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                        {writer.is_available ? 'Active' : 'Offline'}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <button 
                        onClick={() => deleteWriter(writer.id)}
                        className="p-2 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}