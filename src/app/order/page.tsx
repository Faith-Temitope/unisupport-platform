"use client";

import { useForm } from "react-hook-form";
import { useState, Suspense, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { 
  ShieldCheck, 
  UploadCloud, 
  CheckCircle2,
  Loader2,
  MessageCircle,
  Database,
  Info,
  ChevronLeft,
  Settings,
  Search,
  X
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

  // SEARCH LOGIC STATES
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const source = searchParams.get("source"); 
  const isCustomQuote = source === "lms" || source === "special";
  const urlService = searchParams.get("service");
  const urlWriter = searchParams.get("writer_id");

  const { register, handleSubmit, watch, setValue } = useForm<OrderFormData>({
    defaultValues: {
      serviceType: urlService || "",
      pages: 1,
      writer_id: urlWriter || ""
    }
  });

  const selectedServiceName = watch("serviceType");
  const selectedFile = watch("file");

  useEffect(() => {
    async function initializePage() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/auth?callback=/order${window.location.search}`);
        return;
      }
      setUserId(user.id);

      const { data: writers } = await supabase.from('writers').select('id, name').eq('is_available', true);
      if (writers) setAvailableWriters(writers);

      const { data: services } = await supabase.from('services').select('*').order('title');
      if (services) setDbServices(services);

      setIsCheckingAuth(false);
    }
    initializePage();
  }, [supabase, router]);

  // FILTERED SERVICES LOGIC
  const filteredServices = useMemo(() => {
    return dbServices.filter(s => 
      s.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, dbServices]);

  const selectedService = dbServices.find(s => s.title === selectedServiceName);
  
  const calculateEstimate = () => {
    if (isCustomQuote) return 0; 
    if (!selectedService) return 0;
    return (selectedService.base_price_per_page || 0) * (watch("pages") || 1);
  };

  const whatsappNumber = "2349052740695";

  const processOrder = async (data: OrderFormData, notifyWhatsApp: boolean) => {
    if (!userId) return;
    setIsSubmitting(true);

    try {
      let uploadedFilePath = null;
      if (data.file && data.file.length > 0) {
        const file = data.file[0];
        const filePath = `${userId}/${Date.now()}-${file.name.replace(/\s/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('order-files').upload(filePath, file);
        if (uploadError) throw uploadError;
        uploadedFilePath = filePath;
      }

      const total = calculateEstimate();

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: userId,
          client_name: data.name,
          client_phone: data.phone,
          service_type: isCustomQuote ? `${urlService || 'Custom'} (Manual Quote)` : data.serviceType,
          pages: isCustomQuote ? 0 : data.pages,
          deadline: data.deadline,
          description: data.description,
          total_price: total,
          file_url: uploadedFilePath,
          status: isCustomQuote ? 'awaiting-quote' : 'pending',
          writer_id: data.writer_id || null
        }])
        .select().single();

      if (orderError) throw orderError;

      if (notifyWhatsApp) {
        const priceLabel = isCustomQuote ? "Awaiting Custom Quote" : `₦${total.toLocaleString()}`;
        const message = `*NEW VAULT DEPLOYMENT*%0A*ID:* ${newOrder.id.slice(0, 8)}%0A*Client:* ${data.name}%0A*Service:* ${urlService || data.serviceType}%0A*Price:* ${priceLabel}`;
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
      }

      router.push("/dashboard");
    } catch (err: any) {
      alert("Vault Sync Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingAuth) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white italic font-black text-emerald-600 uppercase tracking-widest">
       <Loader2 className="animate-spin mb-4" size={40} /> Syncing Portal
    </div>
  );

  return (
    <main className="bg-gray-50/50 min-h-screen pt-24 pb-20 px-4 font-sans">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={14} /> Back to Terminal
        </button>

        <div className="bg-white p-8 md:p-16 rounded-[4rem] border border-gray-100 shadow-2xl relative">
          <header className="mb-12">
            <div className="flex items-center gap-2 text-emerald-600 mb-4 font-black uppercase tracking-widest text-[10px]">
              {isCustomQuote ? <Settings size={14} className="animate-spin" /> : <ShieldCheck size={14} />} 
              {isCustomQuote ? `Configure: ${urlService}` : "Automated Price Calculation"}
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-4 text-gray-900 tracking-tighter italic uppercase leading-[0.85]">
              {isCustomQuote ? "Initialize" : "Secure"} <br /><span className="text-emerald-500">{isCustomQuote ? "Project." : "The Vault."}</span>
            </h1>
          </header>

          <form className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <input {...register("name")} required className="form-input-custom" placeholder="Full Name" />
              <input {...register("phone")} required className="form-input-custom" placeholder="WhatsApp Number" />
            </div>

            {/* SEARCHABLE SERVICE SELECTOR */}
            {!isCustomQuote && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="relative">
                  <div 
                    className={`form-input-custom flex items-center justify-between cursor-pointer ${isDropdownOpen ? 'border-emerald-500 ring-4 ring-emerald-50' : ''}`}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <span className={selectedServiceName ? "text-gray-900" : "text-gray-400"}>
                      {selectedServiceName || "Find Service..."}
                    </span>
                    <Search size={18} className="text-gray-400" />
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white border border-gray-100 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
                      <div className="p-4 border-b border-gray-50 flex items-center gap-2">
                        <Search size={14} className="text-emerald-500" />
                        <input 
                          autoFocus
                          placeholder="Type to search 200+ services..." 
                          className="w-full outline-none text-sm font-bold bg-transparent"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && <X size={14} className="cursor-pointer" onClick={() => setSearchTerm("")} />}
                      </div>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredServices.length > 0 ? (
                          filteredServices.map(s => (
                            <div 
                              key={s.id} 
                              className="px-6 py-4 hover:bg-emerald-50 cursor-pointer text-sm font-bold transition-colors border-b border-gray-50 last:border-0"
                              onClick={() => {
                                setValue("serviceType", s.title);
                                setIsDropdownOpen(false);
                                setSearchTerm("");
                              }}
                            >
                              {s.title}
                            </div>
                          ))
                        ) : (
                          <div className="px-6 py-10 text-center text-xs text-gray-400 font-bold uppercase italic">No services found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <select {...register("writer_id")} className="form-input-custom">
                  <option value="">Auto-Assign Best Expert</option>
                  {availableWriters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            )}

            {/* File Upload Zone */}
            <div className="relative group border-2 border-dashed border-gray-200 rounded-4xl p-10 flex flex-col items-center justify-center hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer">
              <input type="file" {...register("file")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              {selectedFile?.[0] ? (
                <div className="text-center">
                  <CheckCircle2 className="text-emerald-500 mx-auto mb-2" size={32} />
                  <p className="text-sm font-bold">{selectedFile[0].name}</p>
                </div>
              ) : (
                <>
                  <UploadCloud className="text-gray-300 mb-2" size={40} />
                  <p className="text-sm font-bold text-gray-400">Attach Briefing Materials</p>
                </>
              )}
            </div>

            {/* Project Specs */}
            <div className={`grid grid-cols-1 ${isCustomQuote ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-6 p-8 bg-gray-900 rounded-[3rem] text-white`}>
              {!isCustomQuote && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Volume (Pages)</label>
                  <input type="number" {...register("pages")} className="w-full bg-white/10 p-4 rounded-xl outline-none font-bold" />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Submission Deadline</label>
                <input type="date" {...register("deadline")} required className="w-full bg-white/10 p-4 rounded-xl outline-none font-bold" />
              </div>
            </div>

            <textarea {...register("description")} rows={4} required className="form-input-custom w-full" placeholder="Enter all specific instructions..."></textarea>

            <div className="pt-10 border-t border-gray-100 flex flex-col gap-8">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-4xl font-black text-emerald-600 italic leading-none">
                    {isCustomQuote ? "MANUAL QUOTE" : `₦${calculateEstimate().toLocaleString()}`}
                  </p>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1 mt-2">
                    <Info size={12}/> {isCustomQuote ? "Expert review required" : "Estimated investment"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit((data) => processOrder(data, false))}
                  className="px-8 py-6 bg-gray-100 text-gray-900 rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  <Database size={16} /> Save to Vault
                </button>
                <button 
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit((data) => processOrder(data, true))}
                  className="px-8 py-6 bg-emerald-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  <MessageCircle size={16} /> Vault + WhatsApp
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <style jsx>{`
        .form-input-custom {
          width: 100%; padding: 1.5rem; border-radius: 1.5rem; border: 1px solid #f3f4f6;
          background: #f9fafb; font-weight: 700; outline: none; transition: all 0.2s;
        }
        .form-input-custom:focus { background: white; border-color: #10b981; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.05); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #10b981; border-radius: 10px; }
      `}</style>
    </main>
  );
}

export default function OrderPage() {
  return <Suspense fallback={null}><OrderFormContent /></Suspense>;
}