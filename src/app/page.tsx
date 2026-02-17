"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import FadeIn from "@/components/ui/FadeIn";
import Footer from "@/components/layout/Footer";
import Testimonials from "@/components/Testimonials"; // Import the dynamic component
import { 
  ShieldCheck, 
  Scale, 
  FileText, 
  Users, 
  Zap, 
  ArrowRight, 
  Lock, 
  CheckCircle,
  Loader2,
  BookOpen,
  BarChart3,
  TrendingUp
} from "lucide-react";
import * as Icons from "lucide-react"; // For dynamic icon mapping
import Link from "next/link";

export default function HomePage() {
  const supabase = createClient();
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      const { data } = await supabase
        .from('services')
        .select('*')
        .limit(6);
      if (data) setServices(data);
      setLoadingServices(false);
    }
    fetchServices();
  }, [supabase]);

  return (
    <main className="bg-white">
      {/* 1. HERO SECTION */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <FadeIn>
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-emerald-100">
              <Lock size={12} /> Elite Academic Defense
            </div>
            <h1 className="text-6xl md:text-9xl font-black text-gray-900 mb-8 tracking-tighter uppercase italic leading-[0.85]">
              Master Your <br /><span className="text-emerald-600">Academics.</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-12 font-medium italic">
              From complex dissertations to full LMS management. We provide 
              the expert research you need to secure your future.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-6">
              <Link href="/order" className="bg-gray-900 text-white px-12 py-6 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-2xl">
                Start My Project
              </Link>
              <Link href="/experts" className="bg-white text-gray-900 border-2 border-gray-100 px-12 py-6 rounded-2xl font-black uppercase tracking-widest hover:border-emerald-500 transition-all">
                Browse Experts
              </Link>
            </div>
          </FadeIn>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-10">
            <div className="absolute top-20 left-10 w-96 h-96 bg-emerald-400 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-400 rounded-full blur-[120px]"></div>
        </div>
      </section>

      {/* 2. DYNAMIC SERVICES GRID */}
      <section className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">Our Expertise</h2>
            <p className="text-gray-500 font-bold mt-2">Tailored solutions for every academic level</p>
          </div>
          
          {loadingServices ? (
            <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-500" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service) => (
                <ServiceCard 
                  key={service.id}
                  title={service.title} 
                  desc={service.description} 
                  iconName={service.icon_name}
                  href={`/order?service=${encodeURIComponent(service.title)}`}
                  color="text-emerald-600"
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. THE LEGAL & COMPLIANCE SECTION */}
      <section className="py-32 px-4 bg-white">
        <div className="max-w-6xl mx-auto border-2 border-gray-900 rounded-[4rem] p-12 md:p-24 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                    <div className="flex items-center gap-3 text-emerald-600 mb-6 font-black uppercase tracking-widest text-xs">
                        <Scale size={20} /> Legal & Compliance
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter uppercase italic leading-none">
                        Yes, It Is <span className="text-emerald-600">Legal.</span>
                    </h2>
                    <p className="text-gray-500 font-medium text-lg leading-relaxed mb-8">
                        uniSupport operates as a <strong>Model Research Consultancy</strong>. We provide the foundational work you need to excel.
                    </p>
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <CheckCircle className="text-emerald-500 shrink-0" />
                            <p className="text-sm text-gray-600 font-medium">We provide <strong>Study Models</strong>. Like a legal draft, our work serves as a reference for your final submission.</p>
                        </div>
                        <div className="flex gap-4">
                            <CheckCircle className="text-emerald-500 shrink-0" />
                            <p className="text-sm text-gray-600 font-medium">Zero Plagiarism. Every project is built from scratch by niche experts.</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 rounded-[3rem] p-10 border border-gray-100 shadow-inner">
                    <h4 className="font-black uppercase italic text-xl mb-6">The uniSupport Policy</h4>
                    <div className="p-4 bg-white rounded-2xl shadow-sm italic text-sm text-gray-500 border-l-4 border-emerald-500">
                        "Our service is designed to supplement learning, providing students with high-level references they cannot find elsewhere."
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mt-6 italic">Registered Academic Consultancy • 2026</p>
                </div>
            </div>
        </div>
      </section>

      {/* 4. DYNAMIC TESTIMONIALS (Integrated) */}
      <Testimonials />

      {/* 5. THE EXPERT TEASER */}
      <section className="py-24 bg-gray-900 text-white rounded-t-[5rem]">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-6xl font-black mb-12 tracking-tighter uppercase italic">Work With the Top 2%</h2>
            <div className="flex flex-wrap justify-center gap-4 mb-16">
                {["PhD Researchers", "Master Ghostwriters", "Data Scientists", "LMS Specialists"].map(t => (
                    <span key={t} className="px-6 py-2 border border-gray-700 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {t}
                    </span>
                ))}
            </div>
            <Link href="/experts" className="group inline-flex items-center gap-4 text-2xl font-black uppercase italic tracking-tighter hover:text-emerald-400 transition-colors">
                View Expert Profiles <ArrowRight className="group-hover:translate-x-4 transition-transform" />
            </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

// Sub-component for Service Cards with Dynamic Icon Support
function ServiceCard({ title, desc, iconName, href, color }: any) {
    // Dynamically select icon from Lucide
    const IconComponent = (Icons as any)[iconName] || BookOpen;

    return (
        <FadeIn>
            <Link href={href} className="block group h-full">
                <div className="p-10 bg-white rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 h-full flex flex-col">
                    <div className={`w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-8 ${color} group-hover:bg-emerald-600 group-hover:text-white transition-all`}>
                        <IconComponent size={32} />
                    </div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-4">{title}</h3>
                    <p className="text-gray-500 font-medium mb-6 grow">{desc}</p>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                        Get Started <ArrowRight size={12} />
                    </span>
                </div>
            </Link>
        </FadeIn>
    )
}