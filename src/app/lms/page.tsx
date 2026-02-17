"use client";

import FadeIn from "@/components/ui/FadeIn";
import Footer from "@/components/layout/Footer";
import { ShieldCheck, Monitor, Clock, CheckCircle2, Lock, Globe } from "lucide-react";
import Link from "next/link";

export default function LMSPage() {
  const benefits = [
    { title: "Discussion Boards", desc: "Thoughtful, high-quality responses to peer posts.", icon: <Monitor className="text-emerald-600" size={28} /> },
    { title: "Weekly Quizzes", desc: "Timely completion of all module assessments.", icon: <CheckCircle2 className="text-emerald-600" size={28} /> },
    { title: "Grade Monitoring", desc: "We aim for nothing less than an A or B.", icon: <ShieldCheck className="text-emerald-600" size={28} /> },
    { title: "Deadline Defense", desc: "Zero late submissions. We work ahead of schedule.", icon: <Clock className="text-emerald-600" size={28} /> },
  ];

  const platforms = ["Canvas", "Blackboard", "Moodle", "D2L Brightspace", "University Portals"];

  return (
    <main className="bg-white">
      {/* Hero Section */}
      <FadeIn>
        <section className="py-24 px-4 text-center max-w-5xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="bg-emerald-50 text-emerald-700 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border border-emerald-100">
              <Lock size={14} /> 100% Encrypted & Private Access
            </div>
          </div>
          <h1 className="text-5xl md:text-8xl font-black text-gray-900 mb-8 tracking-tighter uppercase italic leading-[0.85]">
            Total <span className="text-emerald-600">LMS & Portal</span> <br /> Management
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto font-medium italic">
            Stop stressing over weekly logins. We handle your portal 
            management so you can focus on your career.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-4 opacity-40 grayscale-100">
            {platforms.map(p => (
                <span key={p} className="text-xs font-black uppercase tracking-widest">{p}</span>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* Value Grid */}
      <section className="py-24 bg-gray-50/50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Premium Academic Defense</h2>
                <div className="h-1.5 w-20 bg-emerald-500 mx-auto mt-4 rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {benefits.map((b, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                    <div className="mb-6 bg-emerald-50 w-fit p-4 rounded-2xl">{b.icon}</div>
                    <h3 className="font-black text-xl mb-3 uppercase italic tracking-tight">{b.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">{b.desc}</p>
                </div>
                </FadeIn>
            ))}
            </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-32 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-5xl md:text-6xl font-black mb-10 tracking-tighter uppercase italic leading-none">
                Privacy Is <span className="text-emerald-600">Everything</span>
            </h2>
            <div className="space-y-10">
              <div className="flex gap-6">
                <div className="shrink-0 w-14 h-14 bg-gray-900 text-emerald-400 rounded-[1.2rem] flex items-center justify-center font-black italic text-xl shadow-xl shadow-emerald-500/10">01</div>
                <div>
                  <h4 className="font-black text-xl mb-2 uppercase italic tracking-tight">Encrypted Credentials</h4>
                  <p className="text-gray-500 font-medium">Your login details are stored in an encrypted vault. Only your assigned expert ever sees them.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="shrink-0 w-14 h-14 bg-gray-900 text-emerald-400 rounded-[1.2rem] flex items-center justify-center font-black italic text-xl shadow-xl shadow-emerald-500/10">02</div>
                <div>
                  <h4 className="font-black text-xl mb-2 uppercase italic tracking-tight">VPN-Protected Logins</h4>
                  <p className="text-gray-500 font-medium">We use Residential Proxies to match your city, ensuring your university never flags "suspicious activity."</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="shrink-0 w-14 h-14 bg-gray-900 text-emerald-400 rounded-[1.2rem] flex items-center justify-center font-black italic text-xl shadow-xl shadow-emerald-500/10">03</div>
                <div>
                  <h4 className="font-black text-xl mb-2 uppercase italic tracking-tight">Weekly Reporting</h4>
                  <p className="text-gray-500 font-medium">Every Sunday, receive a full performance brief of all module activity and grade milestones.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-[4rem] p-12 md:p-16 text-white relative overflow-hidden shadow-3xl shadow-emerald-900/20">
            <div className="relative z-10">
                <div className="flex items-center gap-2 text-emerald-400 mb-6">
                    <Globe size={18} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Global Support Available</span>
                </div>
                <h3 className="text-4xl font-black mb-8 uppercase italic tracking-tighter">Portal Pricing</h3>
                <p className="mb-10 text-gray-400 font-medium text-lg leading-relaxed">Retainers are tailored to your specific course duration and module intensity.</p>
                
                <div className="space-y-6 mb-12">
                    <div className="flex justify-between border-b border-gray-800 pb-4 items-center">
                        <span className="font-bold text-gray-300">Monthly Retainer</span>
                        <span className="font-black text-xl italic">From ₦50k</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-800 pb-4 items-center">
                        <span className="font-bold text-gray-300">Full Semester</span>
                        <div className="text-right">
                            <span className="block font-black text-emerald-400 italic">SAVE 15%</span>
                            <span className="text-[9px] text-gray-500 font-black uppercase">Standard Discount</span>
                        </div>
                    </div>
                </div>

                <Link href="/order?service=LMS" className="w-full bg-emerald-500 text-white hover:bg-emerald-400 text-center block py-6 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20">
                    Get Custom Quote
                </Link>
            </div>
            {/* Design Element */}
            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]"></div>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  );
}