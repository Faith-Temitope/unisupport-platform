"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, User, BookOpen, Calendar, ChevronLeft, Save, Calculator } from "lucide-react";
import Link from "next/link";

export default function NewOrderPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [writers, setWriters] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    client_name: "",
    client_phone: "",
    university: "",
    service_id: "", // ID from services table
    service_type: "", // Title from services table
    pages: 1,
    deadline: "",
    description: "",
    total_price: 0,
    writer_id: "",
  });

  useEffect(() => {
    async function fetchData() {
      const [writersRes, servicesRes] = await Promise.all([
        supabase.from("writers").select("id, name").eq("is_available", true),
        supabase.from("services").select("*")
      ]);
      if (writersRes.data) setWriters(writersRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
    }
    fetchData();
  }, [supabase]);

  // --- AUTOMATIC PRICE CALCULATION ---
  useEffect(() => {
    const selectedService = services.find(s => s.id === formData.service_id);
    if (selectedService) {
      const calculatedPrice = selectedService.base_price_per_page * formData.pages;
      setFormData(prev => ({ 
        ...prev, 
        total_price: calculatedPrice,
        service_type: selectedService.title 
      }));
    }
  }, [formData.service_id, formData.pages, services]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("orders").insert([{
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        university: formData.university,
        service_type: formData.service_type,
        pages: formData.pages,
        deadline: formData.deadline,
        description: formData.description,
        total_price: formData.total_price,
        status: formData.writer_id ? "in-progress" : "pending",
        writer_id: formData.writer_id || null,
      }]);

      if (error) throw error;
      router.push("/admin");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-4 md:p-12 bg-[#FBFBFC] min-h-screen font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">
            Service <span className="text-emerald-600">Sync.</span>
          </h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Automated pricing based on Service Table</p>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* CLIENT INFO */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-4 shadow-sm">
            <input required placeholder="Client Name" className="w-full bg-gray-50 border-none rounded-2xl p-4" onChange={(e) => setFormData({...formData, client_name: e.target.value})} />
            <input required placeholder="WhatsApp Number" className="w-full bg-gray-50 border-none rounded-2xl p-4" onChange={(e) => setFormData({...formData, client_phone: e.target.value})} />
          </div>

          {/* SERVICE SELECTION & CALCULATION */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-4 shadow-sm">
            <select 
              required
              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm"
              onChange={(e) => setFormData({...formData, service_id: e.target.value})}
            >
              <option value="">Select Service</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.title} (₦{s.base_price_per_page}/pg)</option>)}
            </select>

            <div className="grid grid-cols-2 gap-4">
              <input 
                type="number" 
                placeholder="Pages" 
                className="w-full bg-gray-50 border-none rounded-2xl p-4" 
                onChange={(e) => setFormData({...formData, pages: parseInt(e.target.value) || 1})} 
              />
              <div className="bg-emerald-50 rounded-2xl p-4 flex flex-col justify-center border border-emerald-100">
                <p className="text-[8px] font-black text-emerald-600 uppercase">Total Quote</p>
                <p className="font-black text-emerald-700">₦{formData.total_price.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* ASSIGNMENT & LOGISTICS */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-4 md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="date" required className="w-full bg-gray-50 border-none rounded-2xl p-4" onChange={(e) => setFormData({...formData, deadline: e.target.value})} />
              <select 
                className="w-full bg-gray-950 text-white border-none rounded-2xl p-4"
                onChange={(e) => setFormData({...formData, writer_id: e.target.value})}
              >
                <option value="">Unassigned</option>
                {writers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <textarea placeholder="Technical Brief..." rows={4} className="w-full bg-gray-50 border-none rounded-3xl p-6" onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>

          <button disabled={loading} className="md:col-span-2 w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs flex items-center justify-center gap-3">
            {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
            Deploy Calculated Order
          </button>
        </form>
      </div>
    </main>
  );
}