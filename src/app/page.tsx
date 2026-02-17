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
  ChevronRight,
  Sparkles,
  MousePointerClick,
  CreditCard,
  Eye,
  Download
} from "lucide-react";
import * as Icons from "lucide-react"; 
import Link from "next/link";

export default function HomePage() {
  const supabase = createClient();
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name?.split(' ')[0] || "Scholar");
      }
      const { data } = await supabase.from('services').select('*').limit(6);
      if (data) setServices(data);
      setLoadingServices(false);
    }
    fetchData();
  }, [supabase]);

  return (
    <main className="bg-white">
      
      {/* 1. DYNAMIC GREETING BAR - Added margin-top to clear the fixed header */}
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
             <Link href="/order" className="text-[10px] font-black bg-white text-gray-900 px-6 py-2 rounded-full hover:bg-emerald-500 hover:text-white transition-all">NEW DEPLOYMENT</Link>
          </div>
        </div>
      </div>

      {/* 2. HERO SECTION */}
      <section className="relative pt-20 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <FadeIn>
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
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 3. DETAILED NAVIGATION GUIDE - Centered and Expanded */}
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
             {/* Step 1: Initialize */}
             <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-8 text-xl font-black italic group-hover:bg-emerald-600 transition-colors">
                  <MousePointerClick size={24} />
                </div>
                <h3 className="text-xl font-black uppercase italic mb-4">01. Initialize</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed mb-4">
                  Choose your service and assign a specific writer (if you have one in mind) or let us <strong>automatically assign the best niche expert</strong> for your task.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase"><CheckCircle size={12} className="text-emerald-500"/> Attach Files</li>
                  <li className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase"><CheckCircle size={12} className="text-emerald-500"/> Brief Instructions</li>
                </ul>
             </div>

             {/* Step 2: Transmission */}
             <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-8 text-xl font-black italic group-hover:bg-emerald-600 transition-colors">
                  <Lock size={24} />
                </div>
                <h3 className="text-xl font-black uppercase italic mb-4">02. Transmission</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed mb-4">
                  Send your brief to the <strong>Vault</strong> for encrypted storage or to <strong>WhatsApp</strong> where our Customer Care/HR will process it immediately.
                </p>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-700 leading-tight">Custom quotes (LMS/Special) are delivered within a few hours.</p>
                </div>
             </div>

             {/* Step 3: Activation */}
             <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-8 text-xl font-black italic group-hover:bg-emerald-600 transition-colors">
                  <CreditCard size={24} />
                </div>
                <h3 className="text-xl font-black uppercase italic mb-4">03. Activation</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                  To begin, a <strong>50% down payment</strong> is required. For LMS or Special Services, work starts immediately once the quoted payment is confirmed.
                </p>
             </div>

             {/* Step 4: Retrieval */}
             <div className="bg-emerald-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-emerald-600/20 group">
                <div className="w-14 h-14 bg-white text-emerald-600 rounded-2xl flex items-center justify-center mb-8 text-xl font-black italic">
                  <Download size={24} />
                </div>
                <h3 className="text-xl font-black uppercase italic mb-4">04. Retrieval</h3>
                <p className="text-emerald-50 text-sm font-medium leading-relaxed mb-4">
                  Once done, you'll receive a notification. Review the <strong>Preview Mode</strong>. If satisfied, pay the balance to unlock the full download button.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                  <Eye size={12}/> Locked Preview Enabled
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* 4. DYNAMIC SERVICES GRID */}
      <section className="py-24 bg-white">
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

      {/* 5. THE LEGAL & COMPLIANCE SECTION */}
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
                </div>
                <div className="bg-gray-50 rounded-[3rem] p-10 border border-gray-100 shadow-inner">
                    <h4 className="font-black uppercase italic text-xl mb-6">The uniSupport Policy</h4>
                    <div className="p-4 bg-white rounded-2xl shadow-sm italic text-sm text-gray-500 border-l-4 border-emerald-500">
                        "Our service is designed to supplement learning, providing students with high-level references."
                    </div>
                </div>
            </div>
        </div>
      </section>

      <Testimonials />

      <section className="py-24 bg-gray-900 text-white rounded-t-[5rem]">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-6xl font-black mb-12 tracking-tighter uppercase italic">Work With the Top 2%</h2>
            <Link href="/experts" className="group inline-flex items-center gap-4 text-2xl font-black uppercase italic tracking-tighter hover:text-emerald-400 transition-colors">
                View Expert Profiles <ArrowRight className="group-hover:translate-x-4 transition-transform" />
            </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function ServiceCard({ title, desc, iconName, href, color }: any) {
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