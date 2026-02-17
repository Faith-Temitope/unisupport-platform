"use client";

import { useForm } from "react-hook-form";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ShieldCheck, Zap, MessageCircle, Lock, Info, HelpCircle } from "lucide-react";

type OrderFormData = {
  name: string;
  university: string;
  serviceType: string;
  pages: number;
  deadline: string;
  description: string;
  phone: string;
  writer_id: string;
};

function OrderFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableWriters, setAvailableWriters] = useState<any[]>([]);
  const [dbServices, setDbServices] = useState<any[]>([]); 
  const [userId, setUserId] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const urlService = searchParams.get("service");
  const urlWriter = searchParams.get("writer_id");

  const { register, handleSubmit, watch } = useForm<OrderFormData>({
    defaultValues: {
      serviceType: urlService || "",
      pages: 1,
      writer_id: urlWriter || ""
    }
  });

  useEffect(() => {
    async function initializePage() {
      // 1. Auth Check
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/auth?callback=/order${window.location.search}`);
        return;
      }
      setUserId(user.id);

      // 2. Load Writers
      const { data: writers } = await supabase
        .from('writers')
        .select('id, name')
        .eq('is_available', true);
      if (writers) setAvailableWriters(writers);

      // 3. Load Services from DB
      const { data: services } = await supabase
        .from('services')
        .select('*')
        .order('title');
      if (services) setDbServices(services);

      setIsCheckingAuth(false);
    }
    initializePage();
  }, [supabase, router]);

  const selectedServiceName = watch("serviceType");
  const pageCount = watch("pages") || 1;

  // Find selected service to get its price
  const selectedService = dbServices.find(s => s.title === selectedServiceName);
  
  const calculateEstimate = () => {
    if (!selectedService) return 0;
    return (selectedService.base_price_per_page || 0) * pageCount;
  };

  const whatsappNumber = "2349131352366";

  // Price Negotiator direct button
  const handleNegotiate = () => {
    const msg = `Hi uniSupport, I am looking at the "${selectedServiceName || 'a project'}" service. I'd like to discuss a custom price for my specific requirements.`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const onSubmit = async (data: OrderFormData) => {
    if (!userId) {
      alert("Session expired. Please log in.");
      router.push("/auth");
      return;
    }

    setIsSubmitting(true);
    const total = calculateEstimate();

    try {
      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert([{
          user_id: userId,
          client_name: data.name,
          client_phone: data.phone,
          university: data.university,
          service_type: data.serviceType,
          pages: data.pages,
          deadline: data.deadline,
          description: data.description,
          total_price: total,
          status: 'pending',
          writer_id: data.writer_id || null
        }])
        .select()
        .single();

      if (error) throw error;

      // WhatsApp Message Formatting
      const message = `*NEW ORDER SUBMITTED*%0A
*Order ID:* ${newOrder.id.slice(0, 8)}%0A
*Name:* ${data.name}%0A
*Service:* ${data.serviceType}%0A
*Estimate:* ₦${total.toLocaleString()}%0A
*Deadline:* ${data.deadline}%0A
*Brief:* ${data.description}`;

      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
      router.push("/dashboard");

    } catch (err: any) {
      console.error("Submission error:", err);
      alert("Failed to save order. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingAuth || !userId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white space-y-4">
        <Lock className="text-emerald-500 animate-bounce" size={40} />
        <p className="font-black uppercase tracking-widest text-[10px] text-gray-400">Verifying Security Clearance...</p>
      </div>
    );
  }

  return (
    <main className="bg-gray-50/50 min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 md:p-16 rounded-[4rem] border border-gray-100 shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <ShieldCheck size={120} />
          </div>

          <header className="mb-12">
            <div className="flex items-center gap-2 text-emerald-600 mb-4 font-black uppercase tracking-widest text-[10px]">
              <Zap size={14} className="fill-emerald-600" /> Priority Processing Active
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-4 text-gray-900 tracking-tighter italic uppercase leading-[0.85]">
              Secure Your <br /><span className="text-emerald-500">Success.</span>
            </h1>
            <p className="text-gray-500 font-medium italic">Your research data is encrypted and secure.</p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Client Identity</label>
                <input {...register("name")} required className="w-full p-6 rounded-3xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold" placeholder="Full Name" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">WhatsApp Contact</label>
                <input {...register("phone")} required className="w-full p-6 rounded-3xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold" placeholder="e.g. 09012345678" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Assign Preferred Expert</label>
              <select {...register("writer_id")} className="w-full p-6 rounded-3xl border border-gray-100 bg-gray-50/50 focus:bg-white outline-none font-bold appearance-none cursor-pointer">
                <option value="">🚀 Auto-Assign (Fastest Turnaround)</option>
                {availableWriters.map(w => (
                  <option key={w.id} value={w.id}>Expert: {w.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Institution/Org</label>
                <input {...register("university")} required className="w-full p-6 rounded-3xl border border-gray-100 bg-gray-50/50 outline-none font-bold" placeholder="e.g. UNILAG" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Service Vertical</label>
                <select {...register("serviceType")} required className="w-full p-6 rounded-3xl border border-gray-100 bg-gray-50/50 outline-none font-bold cursor-pointer">
                  <option value="">Select Service...</option>
                  {dbServices.map(s => (
                    <option key={s.id} value={s.title}>{s.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-gray-900 rounded-[3rem] text-white">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Project Volume (Pages)</label>
                <input type="number" {...register("pages")} className="w-full p-4 bg-white/10 rounded-2xl border border-white/10 outline-none font-bold text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Target Deadline</label>
                <input type="date" {...register("deadline")} required className="w-full p-4 bg-white/10 rounded-2xl border border-white/10 outline-none font-bold text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Project Briefing</label>
              <textarea {...register("description")} rows={5} className="w-full p-6 rounded-3xl border border-gray-100 bg-gray-50/50 outline-none font-bold" placeholder="Specific objectives, guidelines, and topic details..."></textarea>
            </div>

            <div className="pt-10 border-t border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-10">
                <div className="text-center md:text-left">
                  <p className="text-emerald-600 font-black text-5xl italic tracking-tighter">
                    ₦{calculateEstimate().toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                    <Info size={10} className="text-emerald-500" /> Automatic System Estimate
                  </div>
                </div>
                
                <button 
                  type="button"
                  onClick={handleNegotiate}
                  className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] bg-blue-50 px-8 py-4 rounded-full hover:bg-blue-100 transition-all border border-blue-100 shadow-sm"
                >
                  <MessageCircle size={16} /> Budget issues? Negotiate on WhatsApp
                </button>
              </div>
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-8 bg-gray-900 text-white rounded-[2.5rem] font-black uppercase tracking-widest hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSubmitting ? "Vaulting Project..." : "Submit to Expert Vault"} <Zap size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black text-gray-400 uppercase tracking-widest italic animate-pulse">Initializing Security...</div>}>
      <OrderFormContent />
    </Suspense>
  );
}