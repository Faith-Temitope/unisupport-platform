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
  AlertTriangle,
  Percent,
  Filter
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
  const [referralCount, setReferralCount] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
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
  const selectedDeadline = watch("deadline");
  const pageCount = watch("pages");

  useEffect(() => {
    async function initializePage() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/auth?callback=/order${window.location.search}`);
        return;
      }
      setUserId(user.id);

      const [writersRes, servicesRes, referralsRes] = await Promise.all([
        supabase.from('writers').select('id, name').eq('is_available', true),
        supabase.from('services').select('*').order('title'),
        supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id).eq('status', 'completed')
      ]);

      if (writersRes.data) setAvailableWriters(writersRes.data);
      if (servicesRes.data) setDbServices(servicesRes.data);
      if (referralsRes.count !== null) setReferralCount(referralsRes.count);

      setIsCheckingAuth(false);
    }
    initializePage();
  }, [supabase, router]);

  // CATEGORY LOGIC
  const categories = useMemo(() => {
    const cats = dbServices.map(s => s.category);
    return ["all", ...Array.from(new Set(cats))];
  }, [dbServices]);

  const filteredServices = useMemo(() => {
    return dbServices.filter(s => {
      const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === "all" || s.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, dbServices, activeCategory]);

  const selectedService = dbServices.find(s => s.title === selectedServiceName);
  
  const calculateEstimate = () => {
    if (isCustomQuote || !selectedService) return { subtotal: 0, discount: 0, total: 0 };
    
    let basePrice = (selectedService.base_price_per_page || 0) * (pageCount || 1);
    
    if (selectedDeadline) {
      const hoursLeft = (new Date(selectedDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60);
      if (hoursLeft > 0 && hoursLeft < 48) {
        basePrice = basePrice * 1.25; 
      }
    }

    const discountPercentage = (referralCount * 10) / 100;
    const discountAmount = basePrice * discountPercentage;
    const finalTotal = Math.max(0, basePrice - discountAmount);
    
    return { subtotal: basePrice, discount: discountAmount, total: finalTotal };
  };

  const pricing = calculateEstimate();

  const isUrgent = useMemo(() => {
    if (!selectedDeadline) return false;
    const hoursLeft = (new Date(selectedDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft < 48;
  }, [selectedDeadline]);

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

      const { total } = calculateEstimate();

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
        const priceLabel = isCustomQuote ? "Awaiting Custom Quote" : `$${total.toFixed(2)}`;
        const message = `*NEW VAULT DEPLOYMENT*%0A*ID:* ${newOrder.id.slice(0, 8)}%0A*Client:* ${data.name}%0A*Service:* ${urlService || data.serviceType}%0A*Price:* ${priceLabel}%0A*Urgent:* ${isUrgent ? 'YES' : 'NO'}`;
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

        <div className="bg-white p-8 md:p-16 rounded-[4rem] border border-gray-100 shadow-2xl relative overflow-hidden">
          <header className="mb-12">
            <div className="flex items-center gap-2 text-emerald-600 mb-4 font-black uppercase tracking-widest text-[10px]">
              {isCustomQuote ? <Settings size={14} className="animate-spin" /> : <ShieldCheck size={14} />} 
              {isCustomQuote ? `Configure: ${urlService}` : "Secure Node Deployment"}
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
                    <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white border border-gray-100 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-200 min-w-[320px] md:min-w-[450px]">
                      <div className="p-4 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
                        <Search size={14} className="text-emerald-500" />
                        <input 
                          autoFocus
                          placeholder="Search..." 
                          className="w-full outline-none text-sm font-bold bg-transparent"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      {/* CATEGORY TABS INSIDE DROPDOWN */}
                      <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar border-b border-gray-50 bg-white">
                         {categories.map(cat => (
                           <button
                            key={cat}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveCategory(cat); }}
                            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}
                           >
                             {cat}
                           </button>
                         ))}
                      </div>

                      <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {filteredServices.length > 0 ? (
                          filteredServices.map(s => (
                            <div 
                              key={s.id} 
                              className="px-6 py-4 hover:bg-emerald-50 cursor-pointer text-sm font-bold transition-colors border-b border-gray-50 last:border-0 flex justify-between items-center group"
                              onClick={() => {
                                setValue("serviceType", s.title);
                                setIsDropdownOpen(false);
                                setSearchTerm("");
                              }}
                            >
                              <span>{s.title}</span>
                              <span className="text-[10px] text-gray-300 group-hover:text-emerald-600 font-black">${s.base_price_per_page}/pg</span>
                            </div>
                          ))
                        ) : (
                          <div className="px-6 py-10 text-center text-xs text-gray-400 font-bold uppercase italic">No matches in this category</div>
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
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-[10px]">Attach Briefing Materials</p>
                </>
              )}
            </div>

            <div className={`grid grid-cols-1 ${isCustomQuote ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-6 p-8 bg-gray-900 rounded-[3rem] text-white relative`}>
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
              
              {isUrgent && (
                <div className="absolute -top-4 -right-4 bg-orange-500 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-pulse shadow-lg">
                  <AlertTriangle size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Rapid Deployment Activated</span>
                </div>
              )}
            </div>

            <textarea {...register("description")} rows={4} required className="form-input-custom w-full" placeholder="Project brief..."></textarea>

            <div className="pt-10 border-t border-gray-100 flex flex-col gap-8">
              <div className="flex justify-between items-end">
                <div>
                  {referralCount > 0 && !isCustomQuote && (
                    <div className="flex items-center gap-2 text-emerald-600 mb-2">
                      <Percent size={14} className="animate-bounce" />
                      <p className="text-[10px] font-black uppercase tracking-widest italic">
                        Loyalty Discount Applied: -${pricing.discount.toFixed(2)} ({referralCount * 10}%)
                      </p>
                    </div>
                  )}
                  <p className="text-4xl font-black text-emerald-600 italic leading-none">
                    {isCustomQuote ? "MANUAL QUOTE" : `$${pricing.total.toFixed(2)}`}
                  </p>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1 mt-2">
                    <Info size={12}/> {isUrgent ? "+25% Priority Surcharge Included" : "Standard Estimated investment"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit((data) => processOrder(data, false))}
                  className="px-8 py-6 bg-gray-100 text-gray-900 rounded-3xl font-black uppercase text-[10px] tracking-widest flex flex-col items-center justify-center gap-1 hover:bg-gray-200 transition-all disabled:opacity-50 border border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <Database size={16} /> Submit Only
                  </div>
                  <span className="text-[8px] opacity-60 normal-case font-bold italic">Process through my dashboard</span>
                </button>

                <button 
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit((data) => processOrder(data, true))}
                  className="px-8 py-6 bg-emerald-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest flex flex-col items-center justify-center gap-1 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle size={16} /> Submit & Start Chat
                  </div>
                  <span className="text-[8px] text-emerald-100 normal-case font-bold italic">Get support via WhatsApp</span>
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