"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import FadeIn from "@/components/ui/FadeIn";
import Footer from "@/components/layout/Footer";
import Testimonials from "@/components/Testimonials";
import { 
  ShieldCheck, 
  Scale, 
  ArrowRight, 
  Lock, 
  CheckCircle,
  Loader2,
  BookOpen,
  User,
  Bell,
  Sparkles,
  MousePointerClick,
  CreditCard,
  Eye,
  Download,
  Cpu,
  Landmark,
  Briefcase,
  ChevronRight,
  Globe
} from "lucide-react";
import * as Icons from "lucide-react"; 
import Link from "next/link";

export default function HomePage() {
  const supabase = createClient();
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = [
    { name: "All", icon: Sparkles },
    { name: "Web3", icon: Cpu },
    { name: "Government", icon: Landmark },
    { name: "Business", icon: Briefcase },
    { name: "Student", icon: BookOpen },
    { name: "International", icon: Globe },
  ];

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name?.split(' ')[0] || "Scholar");
      }
      
      // Fetch diverse services initially
      let query = supabase.from('services').select('*');
      
      if (activeCategory !== "All") {
        query = query.eq('category', activeCategory);
      } else {
        // If "All", let's make sure we show a mix of top categories
        query = query.in('category', ['Web3', 'Government', 'Business', 'Student', 'International']).limit(9);
      }

      const { data } = await query;
      if (data) setServices(data);
      setLoadingServices(false);
    }
    fetchData();
  }, [supabase, activeCategory]);

  return (
    <main className="bg-white">
      
      {/* 1. DYNAMIC GREETING BAR */}
      <div className="mt-[72px] bg-gray-900 text-white overflow-hidden relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <User size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">System Status</p>
              <p className="text-xs font-bold uppercase tracking-widest">
                {userName ? (
                  <span>Welcome Back, <span className="text-emerald-400">{userName}</span></span>
                ) : (
                  <span>Portal Active: <Link href="/auth" className="text-emerald-400 underline decoration-2 underline-offset-4">Sign In for Priority</Link></span>
                )}
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-10">
            <div className="flex items-center gap-3 animate-pulse text-orange-400">
              <Sparkles size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">LMS Custom Quotes: 2h Avg response</span>
            </div>
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-widest">Vault Sync: Active</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative p-2 text-gray-400 hover:text-white transition-colors cursor-pointer">
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-gray-900"></span>
             </div>
             <Link href="/order" className="text-[10px] font-black bg-white text-gray-900 px-6 py-2 rounded-full hover:bg-emerald-500 hover:text-white transition-all shadow-lg">NEW DEPLOYMENT</Link>
          </div>
        </div>
      </div>

      {/* 2. HERO SECTION */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-8">
              <ShieldCheck size={12} /> The Gold Standard in Research
            </div>
            <h1 className="text-6xl md:text-[10rem] font-black text-gray-900 mb-8 tracking-tighter uppercase italic leading-[0.8]">
              The <span className="text-emerald-600">Vault.</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto mb-12 font-bold italic leading-tight">
              From Web3 Whitepapers to Federal Policy Briefs. <br className="hidden md:block"/>
              We deploy elite research experts for your most critical projects.
            </p>
            <div className="flex flex-col md:flex-row justify-center items-center gap-6">
              <Link href="/order" className="w-full md:w-auto bg-gray-900 text-white px-12 py-7 rounded-3xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-2xl hover:-translate-y-1">
                Start Deployment
              </Link>
              <Link href="/experts" className="w-full md:w-auto border-2 border-gray-900 px-12 py-7 rounded-3xl font-black uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all">
                Browse Experts
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 3. NAVIGATION GUIDE (Kept as requested) */}
      <section className="py-32 bg-gray-50/50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-24">
             <span className="text-emerald-600 font-black uppercase tracking-[0.4em] text-[10px] mb-4 block">Workflow Architecture</span>
             <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-6">How to Navigate.</h2>
             <p className="text-gray-500 font-bold italic text-lg leading-relaxed">
                Our protocol is designed for total transparency. From the first click to the final download, here is how we handle your success.
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
             <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-8 text-xl font-black italic group-hover:bg-emerald-600 transition-colors">
                  <MousePointerClick size={24} />
                </div>
                <h3 className="text-xl font-black uppercase italic mb-4">01. Initialize</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed mb-4">
                  Choose your service and assign a specific writer or let our <strong>Smart-Match system</strong> find the best niche expert.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase"><CheckCircle size={12} className="text-emerald-500"/> Attach Files</li>
                  <li className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase"><CheckCircle size={12} className="text-emerald-500"/> Brief Instructions</li>
                </ul>
             </div>

             <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-8 text-xl font-black italic group-hover:bg-emerald-600 transition-colors">
                  <Lock size={24} />
                </div>
                <h3 className="text-xl font-black uppercase italic mb-4">02. Transmission</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed mb-4">
                  Send your brief to the <strong>Vault</strong> for encrypted storage or <strong>WhatsApp</strong> for immediate HR processing.
                </p>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-700 leading-tight">Custom quotes (LMS/Special) delivered within 2 hours.</p>
                </div>
             </div>

             <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-8 text-xl font-black italic group-hover:bg-emerald-600 transition-colors">
                  <CreditCard size={24} />
                </div>
                <h3 className="text-xl font-black uppercase italic mb-4">03. Activation</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                  A <strong>50% down payment</strong> activates the project. For LMS services, work begins as soon as the initial deposit is verified.
                </p>
             </div>

             <div className="bg-emerald-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-emerald-600/20 group">
                <div className="w-14 h-14 bg-white text-emerald-600 rounded-2xl flex items-center justify-center mb-8 text-xl font-black italic">
                  <Download size={24} />
                </div>
                <h3 className="text-xl font-black uppercase italic mb-4">04. Retrieval</h3>
                <p className="text-emerald-50 text-sm font-medium leading-relaxed mb-4">
                  Review the <strong>Locked Preview</strong>. If it meets your criteria, settle the balance to unlock the final asset.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                  <Eye size={12}/> Locked Preview Enabled
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* 4. DYNAMIC SERVICES GRID with CATEGORY FILTER */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8">
            <div>
              <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">
                Specialized <br /><span className="text-emerald-600">Departments.</span>
              </h2>
            </div>
            
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => {
                    setLoadingServices(true);
                    setActiveCategory(cat.name);
                  }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeCategory === cat.name 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  <cat.icon size={14} /> {cat.name}
                </button>
              ))}
            </div>
          </div>
          
          {loadingServices ? (
            <div className="flex flex-col items-center justify-center p-32 gap-4">
              <Loader2 className="animate-spin text-emerald-500" size={40} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Filtering Vault...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service) => (
                <ServiceCard 
                  key={service.id}
                  title={service.title} 
                  desc={service.description} 
                  iconName={service.icon_name}
                  category={service.category}
                  href={`/order?service=${encodeURIComponent(service.title)}`}
                  color="text-emerald-600"
                />
              ))}
            </div>
          )}
          
          <div className="mt-20 text-center">
             <Link href="/services" className="px-12 py-6 border-2 border-gray-900 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-gray-900 hover:text-white transition-all">
                View All 50+ Services
             </Link>
          </div>
        </div>
      </section>

      {/* 5. THE LEGAL & COMPLIANCE SECTION */}
      <section className="py-32 px-4 bg-white">
        <div className="max-w-6xl mx-auto border-[3px] border-gray-900 rounded-[4rem] p-12 md:p-24 relative overflow-hidden bg-white">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                    <div className="flex items-center gap-3 text-emerald-600 mb-6 font-black uppercase tracking-widest text-xs">
                        <Scale size={20} /> Legal & Compliance
                    </div>
                    <h2 className="text-4xl md:text-7xl font-black mb-8 tracking-tighter uppercase italic leading-none">
                        Yes, It Is <br /><span className="text-emerald-600">Legal.</span>
                    </h2>
                    <p className="text-gray-500 font-bold italic text-lg leading-relaxed mb-8">
                        uniSupport operates as a <strong>Model Research Consultancy</strong>. We provide the foundational blueprints you need to excel in professional environments.
                    </p>
                </div>
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                      <h4 className="font-black uppercase italic text-lg mb-4 flex items-center gap-2">
                        <ShieldCheck className="text-emerald-600" size={20}/> Ethical Use Policy
                      </h4>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed italic">
                        "Our assets are designed to supplement professional growth and academic learning, providing users with high-level references and data-driven blueprints."
                      </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-white border border-gray-100 rounded-[2rem] text-center">
                       <p className="text-2xl font-black italic">100%</p>
                       <p className="text-[8px] font-black uppercase text-gray-400">Confidential</p>
                    </div>
                    <div className="p-6 bg-white border border-gray-100 rounded-[2rem] text-center">
                       <p className="text-2xl font-black italic">0%</p>
                       <p className="text-[8px] font-black uppercase text-gray-400">Plagiarism</p>
                    </div>
                  </div>
                </div>
            </div>
        </div>
      </section>

      <Testimonials />

      <section className="py-32 bg-gray-900 text-white rounded-t-[5rem]">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-5xl md:text-8xl font-black mb-12 tracking-tighter uppercase italic leading-none">Work With <br /> the <span className="text-emerald-400">Top 2%</span></h2>
            <Link href="/experts" className="group inline-flex items-center gap-4 text-2xl md:text-4xl font-black uppercase italic tracking-tighter hover:text-emerald-400 transition-colors">
                View Expert Profiles <ArrowRight className="group-hover:translate-x-4 transition-transform" size={32} />
            </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function ServiceCard({ title, desc, iconName, href, color, category }: any) {
    const IconComponent = (Icons as any)[iconName] || BookOpen;

    return (
        <FadeIn>
            <Link href={href} className="block group h-full">
                <div className="p-10 bg-white rounded-[3.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 h-full flex flex-col relative overflow-hidden">
                    <div className="absolute top-8 right-8 text-[9px] font-black uppercase tracking-widest text-gray-300 group-hover:text-emerald-200 transition-colors">
                      {category}
                    </div>
                    <div className={`w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center mb-8 ${color} group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner`}>
                        <IconComponent size={36} />
                    </div>
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4 leading-tight group-hover:text-emerald-600 transition-colors">{title}</h3>
                    <p className="text-gray-500 font-medium mb-6 grow italic leading-relaxed">{desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                          Initiate Project <ArrowRight size={12} />
                      </span>
                      <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center group-hover:border-emerald-500 transition-colors">
                         <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-500" />
                      </div>
                    </div>
                </div>
            </Link>
        </FadeIn>
    )
}