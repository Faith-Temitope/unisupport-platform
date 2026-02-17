"use client";

import FadeIn from "@/components/ui/FadeIn";
import Footer from "@/components/layout/Footer";
import { Sparkles, BarChart3, PenTool, Globe, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

export default function SpecialServices() {
  const specials = [
    {
      title: "Data Analysis & Statistics",
      desc: "SPSS, Stata, or Excel analysis for research papers and corporate audits.",
      icon: <BarChart3 className="text-orange-600" size={32} />,
      color: "border-orange-100 bg-orange-50/30"
    },
    {
      title: "Creative & Speech Writing",
      desc: "Keynote speeches, high-end ghostwriting, and brand storytelling for executives.",
      icon: <PenTool className="text-purple-600" size={32} />,
      color: "border-purple-100 bg-purple-50/30"
    },
    {
      title: "Technical Documentation",
      desc: "Software manuals, API documentation, and architectural project specifications.",
      icon: <Globe className="text-blue-600" size={32} />,
      color: "border-blue-100 bg-blue-50/30"
    },
  ];

  return (
    <main className="bg-white">
      {/* Premium Hero */}
      <FadeIn>
        <section className="py-24 px-4 text-center bg-linear-to-b from-gray-50 to-white">
          <div className="flex justify-center mb-8">
            <span className="bg-orange-500 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2 shadow-lg shadow-orange-500/20">
              <Zap size={12} fill="currentColor" /> Elite Solutions
            </span>
          </div>
          <h1 className="text-6xl md:text-9xl font-black text-gray-900 mb-8 tracking-tighter uppercase italic leading-[0.85]">
            Beyond the <br /><span className="text-orange-500">Standard.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-12 font-medium italic">
            Complex projects require deep technical precision. Our industry 
            veterans handle the tasks others find impossible.
          </p>
          <Link 
            href="/order?service=Special" 
            className="bg-gray-900 text-white px-12 py-6 rounded-2xl text-lg font-black uppercase tracking-widest inline-flex items-center gap-3 hover:bg-orange-500 transition-all active:scale-95 shadow-2xl shadow-gray-900/20"
          >
            Request Special Quote <ArrowRight size={20} />
          </Link>
        </section>
      </FadeIn>

      {/* Services Grid */}
      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {specials.map((item, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className={`group p-12 rounded-[4rem] border ${item.color} hover:shadow-3xl transition-all duration-500`}>
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-10 shadow-sm group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-3xl font-black mb-4 uppercase italic tracking-tighter leading-none">
                  {item.title}
                </h3>
                <p className="text-gray-500 font-medium leading-relaxed mb-10">
                  {item.desc}
                </p>
                <Link 
                  href="/order?service=Special" 
                  className="text-gray-900 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:gap-4 transition-all"
                >
                  Discuss Project <ArrowRight size={16} className="text-orange-500" />
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* The "Elite" Trust Banner */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto bg-gray-900 rounded-[4rem] p-16 md:p-24 text-center text-white relative overflow-hidden shadow-3xl">
          <div className="relative z-10">
            <div className="inline-block p-4 bg-orange-500/10 rounded-3xl mb-8">
                <Sparkles className="text-orange-400" size={56} />
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-6 uppercase italic tracking-tighter">Reserved for Excellence</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg font-medium leading-relaxed">
              Special services are assigned exclusively to our PhD-level writers 
              and industry veterans with 10+ years of deep-sector experience. 
              Quality is not an option—it's the baseline.
            </p>
            <div className="mt-12 flex justify-center gap-8 opacity-50 grayscale">
                <span className="text-[10px] font-black uppercase tracking-widest">PhD Verified</span>
                <span className="text-[10px] font-black uppercase tracking-widest">10+ Yrs Exp</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Industry Vets</span>
            </div>
          </div>
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full"></div>
        </div>
      </section>

      <Footer />
    </main>
  );
}