"use client";

import FadeIn from "@/components/ui/FadeIn";
import Footer from "@/components/layout/Footer";
import { Sparkles, BarChart3, PenTool, Globe, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function SpecialServices() {
  const specials = [
    {
      title: "Data Analysis & Statistics",
      desc: "SPSS, Stata, or Excel analysis for research papers and corporate audits.",
      icon: <BarChart3 className="text-orange-600" />,
    },
    {
      title: "Creative & Speech Writing",
      desc: "Keynote speeches, high-end ghostwriting, and brand storytelling.",
      icon: <PenTool className="text-purple-600" />,
    },
    {
      title: "Technical Documentation",
      desc: "Software manuals, API documentation, and architectural project specs.",
      icon: <Globe className="text-blue-600" />,
    },
  ];

  return (
    <main className="bg-white">
      <FadeIn>
        <section className="py-24 px-4 text-center bg-gradient-to-b from-gray-50 to-white">
          <div className="flex justify-center mb-6">
            <span className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
              Bespoke Solutions
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
            Beyond the <span className="text-orange-500">Standard.</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Have a complex project that doesn't fit a category? Our most senior 
            experts handle specialized tasks that require deep technical or creative precision.
          </p>
          <Link href="/order?service=Special" className="btn-primary px-12 py-5 text-lg inline-flex items-center gap-2">
            Request Special Quote <ArrowRight size={20} />
          </Link>
        </section>
      </FadeIn>

      <section className="py-20 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {specials.map((item, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="group p-10 rounded-[3rem] border border-gray-100 bg-white hover:border-orange-200 hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed mb-6">{item.desc}</p>
                <Link href="/order" className="text-orange-600 font-bold flex items-center gap-2 hover:gap-3 transition-all">
                  Discuss Project <ArrowRight size={16} />
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* The "Elite" Trust Banner */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto bg-gray-900 rounded-[3rem] p-12 text-center text-white relative overflow-hidden">
          <div className="relative z-10">
            <Sparkles className="text-orange-400 mx-auto mb-6" size={48} />
            <h2 className="text-3xl font-bold mb-4">Reserved for Excellence</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Special services are assigned exclusively to our PhD-level writers 
              and industry veterans with 10+ years of experience.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full"></div>
        </div>
      </section>

      <Footer />
    </main>
  );
}