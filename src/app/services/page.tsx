"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import FadeIn from "@/components/ui/FadeIn";
import Footer from "@/components/layout/Footer";
import { 
  Search, 
  ArrowLeft, 
  BookOpen, 
  GraduationCap, 
  Microscope, 
  Scale, 
  Briefcase,
  Tag,
  Clock,
  ArrowRight
} from "lucide-react";
import * as Icons from "lucide-react";
import Link from "next/link";

export default function ServicesDirectory() {
  const supabase = createClient();
  const [allServices, setAllServices] = useState<any[]>([]);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const { data } = await supabase.from('services').select('*').order('title', { ascending: true });
      if (data) {
        setAllServices(data);
        setFilteredServices(data);
      }
      setLoading(false);
    }
    fetchAll();
  }, [supabase]);

  useEffect(() => {
    const filtered = allServices.filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredServices(filtered);
  }, [searchQuery, allServices]);

  return (
    <main className="min-h-screen bg-gray-50/30">
      <div className="pt-[120px] pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-emerald-600 transition-colors mb-12">
            <ArrowLeft size={14} /> Back to Portal
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div>
              <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none text-gray-900">
                The Full <br /><span className="text-emerald-600">Inventory.</span>
              </h1>
              <p className="mt-6 text-gray-500 font-bold italic text-lg max-w-xl">
                Browse every research asset currently available in the Vault. Use the filter to find your specific department.
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredServices.map((service) => (
              <ServiceDirectoryCard key={service.id} service={service} />
            ))}
          </div>
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
        <div className="bg-white border border-gray-100 p-8 rounded-[3rem] hover:shadow-2xl transition-all duration-500">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <IconComponent size={28} />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black uppercase tracking-tighter text-gray-300">{service.category}</span>
              <span className="text-emerald-600 font-black text-sm">₦{service.base_price_per_page}/pg</span>
            </div>
          </div>
          <h3 className="text-2xl font-black uppercase italic mb-3 group-hover:text-emerald-600 transition-colors line-clamp-1">{service.title}</h3>
          <p className="text-gray-500 text-sm font-medium italic mb-6 line-clamp-2">{service.description}</p>
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-2 text-gray-400">
               <Clock size={12} />
               <span className="text-[10px] font-bold">{service.delivery_time_days} Days</span>
             </div>
             <ArrowRight className="text-emerald-600 group-hover:translate-x-2 transition-transform" size={18} />
          </div>
        </div>
      </Link>
    </FadeIn>
  );
}