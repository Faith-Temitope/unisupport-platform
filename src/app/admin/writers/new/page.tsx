"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { Save, ArrowLeft, Loader2, Award } from "lucide-react";
import Link from "next/link";

export default function AddWriter() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    role: "Standard (MSc)",
    status: "Active",
    active_tasks: 0,
    earnings: 0,
    rating: 5.0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("writers")
        .insert([formData]);

      if (error) throw error;
      
      router.push("/admin/writers"); 
      router.refresh();
    } catch (err: any) {
      alert("Error adding writer: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-8">
        <div className="max-w-2xl mx-auto">
          <header className="mb-8">
            <Link href="/admin/writers" className="text-emerald-600 flex items-center gap-2 text-sm font-bold mb-2 hover:underline">
              <ArrowLeft size={16} /> Back to Registry
            </Link>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Onboard New Expert</h1>
          </header>

          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
            <div className="space-y-6">
              {/* Writer Name */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Full Name / Alias</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                  placeholder="e.g., Dr. Chidi"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              {/* Expertise Role */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Expertise Level</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {["Basic (BSc)", "Standard (MSc)", "Premium (PhD)"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({...formData, role: level})}
                      className={`p-4 rounded-2xl text-xs font-bold transition-all border-2 ${
                        formData.role === level 
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                        : "border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Initial Status */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Availability Status</label>
                <select 
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none appearance-none font-bold text-gray-700"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="Active">Active (Ready for Tasks)</option>
                  <option value="Inactive">Inactive (On Break)</option>
                </select>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl flex items-start gap-3">
                <Award className="text-amber-600 mt-1" size={20} />
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  New writers are automatically assigned a <strong>5.0 Rating</strong> and <strong>₦0 Earnings</strong>. 
                  Their payout increases automatically by 50% when you complete an assigned order.
                </p>
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-black hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              {loading ? "Adding to Team..." : "Confirm Onboarding"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}