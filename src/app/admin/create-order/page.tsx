"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { Save, ArrowLeft, Loader2, UserCircle } from "lucide-react";
import Link from "next/link";

export default function CreateOrder() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [writers, setWriters] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    client_name: "",
    client_phone: "",
    university: "",
    service_type: "Assignment",
    tier: "Standard",
    pages: 1,
    deadline: "",
    total_price: 0,
    status: "pending",
    writer_id: "" // To link the order to an expert
  });

  // Fetch real writers to populate the dropdown
  useEffect(() => {
    async function loadWriters() {
      const { data } = await supabase
        .from("writers")
        .select("id, name, role")
        .eq("status", "Active");
      if (data) setWriters(data);
    }
    loadWriters();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Ensure we don't send an empty string for writer_id if none is selected
      const submissionData = { ...formData };
      if (!submissionData.writer_id) delete (submissionData as any).writer_id;

      const { error } = await supabase
        .from("orders")
        .insert([submissionData]);

      if (error) throw error;
      
      router.push("/admin"); 
      router.refresh();
    } catch (err: any) {
      alert("Error creating order: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-8">
        <div className="max-w-3xl mx-auto">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-emerald-600 flex items-center gap-2 text-sm font-bold mb-2 hover:underline">
                <ArrowLeft size={16} /> Back to Overview
              </Link>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Create New Order</h1>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Client Info Section */}
              <div className="md:col-span-1">
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Client Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="John Doe"
                  value={formData.client_name}
                  onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">WhatsApp Phone</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="08012345678"
                  value={formData.client_phone}
                  onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">University</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="University of Lagos"
                  value={formData.university}
                  onChange={(e) => setFormData({...formData, university: e.target.value})}
                />
              </div>

              {/* Assignment Logic Section */}
              <div className="md:col-span-2 p-6 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-600 mb-4">
                  <UserCircle size={16} /> Assign Writing Expert
                </label>
                <select 
                  className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 appearance-none font-bold text-gray-700"
                  value={formData.writer_id}
                  onChange={(e) => setFormData({...formData, writer_id: e.target.value})}
                >
                  <option value="">Choose an expert...</option>
                  {writers.map((writer) => (
                    <option key={writer.id} value={writer.id}>
                      {writer.name} — {writer.role}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[10px] text-gray-400 font-medium italic">
                  * Selecting an expert enables automatic 50/50 payout calculation upon completion.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Service Type</label>
                <select 
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none appearance-none"
                  value={formData.service_type}
                  onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                >
                  <option>Assignment</option>
                  <option>Thesis</option>
                  <option>Project</option>
                  <option>Data Analysis</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Deadline</label>
                <input 
                  required
                  type="date" 
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none"
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Pages</label>
                <input 
                  type="number" 
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none"
                  value={formData.pages}
                  onChange={(e) => setFormData({...formData, pages: Number(e.target.value)})}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Total Price (₦)</label>
                <input 
                  required
                  type="number" 
                  className="w-full p-4 bg-emerald-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-700 text-xl"
                  placeholder="5000"
                  value={formData.total_price}
                  onChange={(e) => setFormData({...formData, total_price: Number(e.target.value)})}
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-100/50 hover:bg-emerald-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              {loading ? "Registering Order..." : "Finalize & Save Order"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}