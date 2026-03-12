"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import FadeIn from "@/components/ui/FadeIn";
import Footer from "@/components/layout/Footer";
import { 
  Search, 
  ArrowLeft, 
  BookOpen, 
  Clock,
  ArrowRight,
  Filter
} from "lucide-react";
import * as Icons from "lucide-react";
import Link from "next/link";

export default function ServicesDirectory() {
  const supabase = useMemo(() => createClient(), []);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const { data } = await supabase
        .from('services')
        .select('*')
        .order('category', { ascending: true })
        .order('title', { ascending: true });
      
      if (data) {
        setAllServices(data);
      }
      setLoading(false);
    }
    fetchAll();
  }, [supabase]);

  // Extract unique categories for the filter bar
  const categories = useMemo(() => {
    const cats = allServices.map(s => s.category);
    return ["all", ...Array.from(new Set(cats))];
  }, [allServices]);

  // Filter logic for Search + Category Tabs
  const filteredServices = useMemo(() => {
    return allServices.filter(s => {
      const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "all" || s.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, allServices, activeCategory]);

  return (
    <main className="min-h-screen bg-gray-50/30">
      <div className="pt-[120px] pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-emerald-600 transition-colors mb-12">
            <ArrowLeft size={14} /> Back to Portal
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none text-gray-900">
                The Full <br /><span className="text-emerald-600">Inventory.</span>
              </h1>
              <p className="mt-6 text-gray-500 font-bold italic text-lg max-w-xl">
                Access 120+ specialized research assets. Organized by discipline for the modern scholar.
              </p>
            </div>

            <div className="relative w-full md:w-96">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text"
                placeholder="SEARCH RESEARCH TYPE..."
                className="w-full bg-white border-2 border-gray-100 rounded-3xl py-6 pl-16 pr-8 font-black uppercase text-xs tracking-widest focus:border-emerald-500 outline-none transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* CATEGORY FILTER BAR */}
          <div className="mb-12 flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
            <div className="flex items-center gap-2 text-gray-400 mr-4 shrink-0">
              <Filter size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Filter:</span>
            </div>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap border-2 ${
                  activeCategory === cat 
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                  : "bg-white border-gray-100 text-gray-400 hover:border-emerald-200"
                }`}
              >
                {cat.replace('-', ' ')}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="font-black uppercase text-[10px] tracking-widest text-gray-400 italic">Syncing Vault...</p>
            </div>
          ) : (
            <>
              {filteredServices.length === 0 ? (
                <div className="py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-gray-100">
                  <p className="text-gray-400 font-black uppercase italic tracking-widest">No matching assets found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredServices.map((service) => (
                    <ServiceDirectoryCard key={service.id} service={service} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}

function ServiceDirectoryCard({ service }: { service: any }) {
  const IconComponent = (Icons as any)[service.icon_name] || BookOpen;

  return (
    <FadeIn>
      <Link href={`/order?service=${encodeURIComponent(service.title)}`} className="group">
        <div className="bg-white border border-gray-100 p-8 rounded-[3rem] hover:shadow-2xl transition-all duration-500 relative overflow-hidden h-full flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <IconComponent size={28} />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black uppercase tracking-tighter text-gray-300 bg-gray-50 px-3 py-1 rounded-full mb-2 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                {service.category}
              </span>
              <span className="text-emerald-600 font-black text-sm">
                ${Number(service.base_price_per_page || 0).toFixed(2)}/pg
              </span>
            </div>
          </div>
          
          <div className="grow">
            <h3 className="text-2xl font-black uppercase italic mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-tight">
              {service.title}
            </h3>
            <p className="text-gray-500 text-sm font-medium italic mb-6 line-clamp-3">
              {service.description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-50">
             <div className="flex items-center gap-2 text-gray-400">
               <Clock size={12} />
               <span className="text-[10px] font-bold uppercase tracking-tighter">{service.delivery_time_days} Days Est.</span>
             </div>
             <div className="flex items-center gap-2 text-emerald-600 font-black uppercase text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                Order <ArrowRight size={14} />
             </div>
          </div>
        </div>
      </Link>
    </FadeIn>
  );
}