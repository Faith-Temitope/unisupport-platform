"use client";

import { useForm } from "react-hook-form";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { 
  ShieldCheck, 
  Zap, 
  MessageCircle, 
  Lock, 
  Info, 
  UploadCloud, 
  FileText, 
  CheckCircle2,
  Loader2 
} from "lucide-react";

type OrderFormData = {
  name: string;
  university: string;
  serviceType: string;
  pages: number;
  deadline: string;
  description: string;
  phone: string;
  writer_id: string;
  file: FileList;
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
  const [uploadProgress, setUploadProgress] = useState(false);

  const urlService = searchParams.get("service");
  const urlWriter = searchParams.get("writer_id");

  const { register, handleSubmit, watch, setValue } = useForm<OrderFormData>({
    defaultValues: {
      serviceType: urlService || "",
      pages: 1,
      writer_id: urlWriter || ""
    }
  });

  const selectedFile = watch("file");

  useEffect(() => {
    async function initializePage() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/auth?callback=/order${window.location.search}`);
        return;
      }
      setUserId(user.id);

      const { data: writers } = await supabase
        .from('writers')
        .select('id, name')
        .eq('is_available', true);
      if (writers) setAvailableWriters(writers);

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
  const selectedService = dbServices.find(s => s.title === selectedServiceName);
  
  const calculateEstimate = () => {
    if (!selectedService) return 0;
    return (selectedService.base_price_per_page || 0) * pageCount;
  };

  const whatsappNumber = "2349131352366";

  const onSubmit = async (data: OrderFormData) => {
    if (!userId) return;

    setIsSubmitting(true);
    let uploadedFilePath = null;

    try {
      // 1. UPLOAD FILE TO SUPABASE STORAGE
      if (data.file && data.file.length > 0) {
        setUploadProgress(true);
        const file = data.file[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('order-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        uploadedFilePath = filePath;
      }

      // 2. SAVE ORDER TO DATABASE
      const total = calculateEstimate();
      const { data: newOrder, error: orderError } = await supabase
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
          file_url: uploadedFilePath,
          status: 'pending',
          writer_id: data.writer_id || null
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 3. WHATSAPP REDIRECT
      const message = `*NEW ORDER SUBMITTED*%0A*ID:* ${newOrder.id.slice(0, 8)}%0A*Client:* ${data.name}%0A*Service:* ${data.serviceType}%0A*Estimate:* ₦${total.toLocaleString()}%0A*File:* ${uploadedFilePath ? 'Attached' : 'None'}`;
      
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
      router.push("/dashboard");

    } catch (err: any) {
      console.error("Submission error:", err);
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="text-emerald-500 animate-spin" size={40} />
        <p className="font-black uppercase tracking-widest text-[10px] text-gray-400 mt-4">Securing Connection...</p>
      </div>
    );
  }

  return (
    <main className="bg-gray-50/50 min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 md:p-16 rounded-[4rem] border border-gray-100 shadow-2xl relative overflow-hidden">
          
          <header className="mb-12">
            <div className="flex items-center gap-2 text-emerald-600 mb-4 font-black uppercase tracking-widest text-[10px]">
              <ShieldCheck size={14} /> Encrypted Submission Portal
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-4 text-gray-900 tracking-tighter italic uppercase leading-[0.85]">
              Deploy Your <br /><span className="text-emerald-500">Project.</span>
            </h1>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            {/* Identity & Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <input {...register("name")} required className="form-input-custom" placeholder="Full Name" />
              <input {...register("phone")} required className="form-input-custom" placeholder="WhatsApp Number" />
            </div>

            {/* Service & Expert */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <select {...register("serviceType")} required className="form-input-custom">
                <option value="">Select Service...</option>
                {dbServices.map(s => <option key={s.id} value={s.title}>{s.title}</option>)}
              </select>
              <select {...register("writer_id")} className="form-input-custom">
                <option value="">🚀 Auto-Assign Expert</option>
                {availableWriters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            {/* FILE UPLOAD ZONE */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Reference Materials / Instructions</label>
              <div className="relative group border-2 border-dashed border-gray-200 rounded-[2rem] p-10 flex flex-col items-center justify-center hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer">
                <input 
                  type="file" 
                  {...register("file")}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {selectedFile && selectedFile[0] ? (
                  <div className="text-center">
                    <CheckCircle2 className="text-emerald-500 mx-auto mb-2" size={32} />
                    <p className="text-sm font-bold text-gray-900">{selectedFile[0].name}</p>
                    <p className="text-[10px] text-gray-400 uppercase">Click to change file</p>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="text-gray-300 group-hover:text-emerald-500 mb-2" size={40} />
                    <p className="text-sm font-bold text-gray-400">Attach Briefing Documents (PDF, ZIP, DOCX)</p>
                  </>
                )}
              </div>
            </div>

            {/* Project Specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-gray-900 rounded-[3rem] text-white">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Pages</label>
                <input type="number" {...register("pages")} className="w-full bg-white/10 p-4 rounded-xl outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Deadline</label>
                <input type="date" {...register("deadline")} required className="w-full bg-white/10 p-4 rounded-xl outline-none" />
              </div>
            </div>

            <textarea {...register("description")} rows={4} className="form-input-custom w-full" placeholder="Detailed project instructions..."></textarea>

            {/* Final Action */}
            <div className="pt-10 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-left">
                <p className="text-4xl font-black text-emerald-600 italic">₦{calculateEstimate().toLocaleString()}</p>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1">
                  <Info size={12}/> Est. Price
                </p>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full md:w-auto px-12 py-6 bg-gray-900 text-white rounded-3xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : "Secure Project Vault"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <style jsx>{`
        .form-input-custom {
          width: 100%;
          padding: 1.5rem;
          border-radius: 1.5rem;
          border: 1px solid #f3f4f6;
          background: #f9fafb;
          font-weight: 700;
          outline: none;
          transition: all 0.2s;
        }
        .form-input-custom:focus {
          background: white;
          border-color: #10b981;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }
      `}</style>
    </main>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderFormContent />
    </Suspense>
  );
}