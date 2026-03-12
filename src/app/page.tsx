"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import FadeIn from "@/components/ui/FadeIn";
import Footer from "@/components/layout/Footer";
import Testimonials from "@/components/Testimonials";
import NotificationBell from "@/components/layout/NotificationBell";
import { 
  ShieldCheck, 
  Scale, 
  ArrowRight, 
  Lock, 
  CheckCircle,
  Loader2,
  BookOpen,
  User,
  Sparkles,
  MousePointerClick,
  CreditCard,
  Download,
  GraduationCap,
  Microscope,
  Briefcase,
  Library,
  Clock,
  Tag
} from "lucide-react";
import * as Icons from "lucide-react"; 
import Link from "next/link";

export default function HomePage() {
  const supabase = createClient();
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = [
    { name: "All", icon: Sparkles },
    { name: "Undergraduate", icon: BookOpen },
    { name: "Post-graduate", icon: GraduationCap },
    { name: "stem-tech", icon: Microscope },
    { name: "law-arts", icon: Scale },
    { name: "corporate", icon: Briefcase },
  ];

  useEffect(() => {
    async function fetchData() {
      // Get auth user info
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        setUserName(authUser.user_metadata?.full_name?.split(' ')[0] || "Scholar");
      }
      
      setLoadingServices(true);
      let query = supabase.from('services').select('*');
      
      if (activeCategory !== "All") {
        query = query.eq('category', activeCategory);
      } else {
        // Landing state: Show a curated selection from all major categories
        query = query.in('category', ['Undergraduate', 'post-graduate', 'stem-tech', 'law-arts', 'public','Graduate', 'corporate', 'Management']).limit(6);
      }

      const { data, error } = await query;
      if (!error && data) {
        setServices(data);
      }
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
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Academic Portal</p>
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
              <Library size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Research Support: 2h Avg response</span>
            </div>
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-widest">Library Sync: Active</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
              {user && <NotificationBell />}
              <Link href="/order" className="text-[10px] font-black bg-white text-gray-900 px-6 py-2 rounded-full hover:bg-emerald-500 hover:text-white transition-all shadow-lg">NEW PROJECT</Link>
          </div>
        </div>
      </div>

      {/* 2. HERO SECTION */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-8">
              <ShieldCheck size={12} /> The Gold Standard in Academic Research
            </div>
            <h1 className="text-6xl md:text-[10rem] font-black text-gray-900 mb-8 tracking-tighter uppercase italic leading-[0.8]">
              Uni<span className="text-emerald-600">Support.</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto mb-12 font-bold italic leading-tight">
              From Undergraduate Essays to PhD Dissertations. <br className="hidden md:block"/>
              We deploy elite subject-matter experts for your academic success.
            </p>
            <div className="flex flex-col md:flex-row justify-center items-center gap-6">
              <Link href="/order" className="w-full md:w-auto bg-gray-900 text-white px-12 py-7 rounded-3xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-2xl hover:-translate-y-1">
                Start Research
              </Link>
              <Link href="/experts" className="w-full md:w-auto border-2 border-gray-900 px-12 py-7 rounded-3xl font-black uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all">
                Meet Scholars
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 3. NAVIGATION GUIDE */}
      <section className="py-32 bg-gray-50/50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-24">
              <span className="text-emerald-600 font-black uppercase tracking-[0.4em] text-[10px] mb-4 block">Operational Protocol</span>
              <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-6">How to Navigate.</h2>
              <p className="text-gray-500 font-bold italic text-lg leading-relaxed">
                Our workflow is automated for speed and human-verified for quality. From onboarding to final download, here is the Vault protocol.
              </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              {/* STEP 1 */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-6 text-xl font-black italic group-hover:bg-emerald-600 transition-colors">
                  <User size={20} />
                </div>
                <h3 className="text-sm font-black uppercase italic mb-2">01. Join</h3>
                <p className="text-gray-500 text-[11px] font-medium leading-relaxed">
                  Sign up and <span className="text-emerald-600 font-bold">confirm your email</span> to activate your encrypted portal.
                </p>
              </div>

              {/* STEP 2 */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-6 text-xl font-black italic group-hover:bg-emerald-600 transition-colors">
                  <BookOpen size={20} />
                </div>
                <h3 className="text-sm font-black uppercase italic mb-2">02. Briefing</h3>
                <p className="text-gray-500 text-[11px] font-medium leading-relaxed">
                  Choose your service, deadline, and <span className="text-emerald-600 font-bold">attach reference files</span> for our writers.
                </p>
              </div>

              {/* STEP 3 */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-6 text-xl font-black italic group-hover:bg-emerald-600 transition-colors">
                  <User size={20} />
                </div>
                <h3 className="text-sm font-black uppercase italic mb-2">03. Pairing</h3>
                <p className="text-gray-500 text-[11px] font-medium leading-relaxed">
                  Select a preferred expert or let the system <span className="text-emerald-600 font-bold">Auto-Assign</span> the best discipline specialist.
                </p>
              </div>

              {/* STEP 4 */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-6 text-xl font-black italic group-hover:bg-emerald-600 transition-colors">
                  <CreditCard size={20} />
                </div>
                <h3 className="text-sm font-black uppercase italic mb-2">04. Deposit</h3>
                <p className="text-gray-500 text-[11px] font-medium leading-relaxed">
                  A <span className="text-emerald-600 font-bold">50% Deposit</span> initiates the research. You'll be notified of progress in real-time.
                </p>
              </div>

              {/* STEP 5 */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-6 text-xl font-black italic group-hover:bg-emerald-600 transition-colors">
                  <Lock size={20} />
                </div>
                <h3 className="text-sm font-black uppercase italic mb-2">05. Preview</h3>
                <p className="text-gray-500 text-[11px] font-medium leading-relaxed">
                  Review a watermarked <span className="text-emerald-600 font-bold">Draft Preview</span>. Request adjustments or proceed to final.
                </p>
              </div>

              {/* STEP 6 */}
              <div className="bg-emerald-600 p-6 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-600/20 group">
                <div className="w-12 h-12 bg-white text-emerald-600 rounded-2xl flex items-center justify-center mb-6 text-xl font-black italic">
                  <Download size={20} />
                </div>
                <h3 className="text-sm font-black uppercase italic mb-2">06. Settle</h3>
                <p className="text-emerald-50 text-[11px] font-medium leading-relaxed">
                  Pay the balance to <span className="font-bold underline">Unlock & Download</span> your final submission-ready assets.
                </p>
              </div>
          </div>
        </div>
      </section>

      {/* 4. DYNAMIC SERVICES GRID */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8">
            <div>
              <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">
                Academic <br /><span className="text-emerald-600">Departments.</span>
              </h2>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
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
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.length > 0 ? services.map((service) => (
                  <ServiceCard 
                    key={service.id}
                    title={service.title} 
                    desc={service.description} 
                    iconName={service.icon_name}
                    category={service.category}
                    price={service.base_price_per_page}
                    delivery={service.delivery_time_days}
                    href={`/order?service=${encodeURIComponent(service.title)}`}
                    color="text-emerald-600"
                  />
                )) : (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-100 rounded-[3rem]">
                     <p className="text-gray-400 font-black uppercase text-xs tracking-widest italic">No research assets found in this department.</p>
                  </div>
                )}
              </div>

              {activeCategory === "All" && services.length >= 6 && (
                <div className="mt-20 text-center">
                  <Link 
                    href="/services" 
                    className="inline-flex items-center gap-4 bg-gray-50 text-gray-900 px-10 py-6 rounded-[2rem] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all group"
                  >
                    View All Vault Assets 
                    <ArrowRight className="group-hover:translate-x-2 transition-transform" size={20} />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* 5. THE LEGAL & COMPLIANCE SECTION */}
      <section className="py-32 px-4 bg-white">
        <div className="max-w-6xl mx-auto border-[3px] border-gray-900 rounded-[4rem] p-12 md:p-24 relative overflow-hidden bg-white">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                    <div className="flex items-center gap-3 text-emerald-600 mb-6 font-black uppercase tracking-widest text-xs">
                        <Scale size={20} /> Integrity & Compliance
                    </div>
                    <h2 className="text-4xl md:text-7xl font-black mb-8 tracking-tighter uppercase italic leading-none">
                        Academic <br /><span className="text-emerald-600">Integrity.</span>
                    </h2>
                    <p className="text-gray-500 font-bold italic text-lg leading-relaxed mb-8">
                        uniSupport provides <strong>Model Research Blueprints</strong>. We help you bridge the gap between complex instructions and high-level academic performance.
                    </p>
                </div>
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                      <h4 className="font-black uppercase italic text-lg mb-4 flex items-center gap-2">
                        <ShieldCheck className="text-emerald-600" size={20}/> Ethical Use Policy
                      </h4>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed italic">
                        "Our assets are designed to serve as model answers and reference guides, fostering original thought and academic growth."
                      </p>
                  </div>
                </div>
            </div>
        </div>
      </section>

      <Testimonials />
      <Footer />
    </main>
  );
}

function ServiceCard({ title, desc, iconName, href, color, category, price, delivery }: any) {
    const IconComponent = (Icons as any)[iconName] || BookOpen;

    return (
        <FadeIn>
            <Link href={href} className="block group h-full">
                <div className="p-10 bg-white rounded-[3.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 h-full flex flex-col relative overflow-hidden">
                    
                    <div className="absolute top-8 right-8 flex flex-col items-end gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-300 group-hover:text-emerald-400 transition-colors">
                        {category}
                      </span>
                      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100">
                        <Tag size={10} />
                        <span className="text-[10px] font-black">${price}/pg</span>
                      </div>
                    </div>

                    <div className={`w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center mb-8 ${color} group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner`}>
                        <IconComponent size={36} />
                    </div>

                    <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4 leading-tight group-hover:text-emerald-600 transition-colors">
                      {title}
                    </h3>
                    
                    <p className="text-gray-500 font-medium mb-6 grow italic leading-relaxed">
                      {desc}
                    </p>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                          Start Research <ArrowRight size={12} />
                      </span>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{delivery} Days</span>
                      </div>
                    </div>
                </div>
            </Link>
        </FadeIn>
    )
}