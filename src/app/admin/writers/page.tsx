"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { UserCheck, Star, Loader2, Plus, Trash2, RefreshCw, HandCoins } from "lucide-react";
import Link from "next/link";

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
    if (!confirm(`Are you sure you've paid ${name}? This will reset their total payout to ₦0.`)) return;
    
    const { error } = await supabase
      .from("writers")
      .update({ earnings: 0 })
      .eq("id", id);

    if (error) alert(error.message);
    else fetchWriters();
  }

  async function deleteWriter(id: string) {
    if (!confirm("Are you sure you want to remove this writer?")) return;
    const { error } = await supabase.from("writers").delete().eq("id", id);
    if (error) alert(error.message);
    else fetchWriters();
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Writer Registry</h1>
            <p className="text-gray-500 font-medium">Manage your experts and their performance.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={fetchWriters}
              className="p-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all text-gray-600 shadow-sm"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <Link 
              href="/admin/writers/new"
              className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
            >
              <Plus size={20} /> Add New Writer
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <UserCheck className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Total Experts</p>
              <p className="text-2xl font-black text-gray-900">{writers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">Writer Name</th>
                <th className="px-8 py-4">Expertise</th>
                <th className="px-8 py-4">Active Tasks</th>
                <th className="px-8 py-4">Rating</th>
                <th className="px-8 py-4">Total Payout</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && writers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-gray-400 font-bold">
                    <Loader2 className="animate-spin inline mr-2" /> Loading...
                  </td>
                </tr>
              ) : (
                writers.map((writer) => (
                  <tr key={writer.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5 font-bold text-gray-900">{writer.name}</td>
                    <td className="px-8 py-5 text-sm text-gray-600 font-medium">{writer.role}</td>
                    <td className="px-8 py-5 font-bold text-gray-900">{writer.active_tasks}</td>
                    <td className="px-8 py-5 font-bold text-gray-900">
                      <div className="flex items-center gap-1">
                        <Star size={14} className="fill-yellow-400 text-yellow-400"/> 
                        {writer.rating?.toFixed(1) || "0.0"}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                         <span className="font-black text-emerald-700">₦{writer.earnings?.toLocaleString()}</span>
                         {writer.earnings > 0 && (
                            <button 
                              onClick={() => handleResetPayout(writer.id, writer.name)}
                              className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-600 hover:text-white"
                              title="Mark as Paid"
                            >
                              <HandCoins size={14} />
                            </button>
                         )}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${
                        writer.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {writer.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => deleteWriter(writer.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
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