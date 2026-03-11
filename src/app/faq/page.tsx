"use client";
import { useState } from 'react';
import InfoSection from '@/components/layout/InfoSection';
import { FAQ_CONTENT } from '@/lib/info-content';
import { ChevronDown, ChevronUp, BookOpen, ShieldCheck, HelpCircle } from 'lucide-react';
import FadeIn from '@/components/ui/FadeIn';

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_CONTENT.map(item => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.a
      }
    }))
  };

  return (
    <main className="pt-32 pb-20 bg-gray-50 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      
      <div className="max-w-4xl mx-auto px-4">
        <FadeIn>
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white shadow-xl rounded-3xl text-emerald-600 mb-6">
              <HelpCircle size={32} strokeWidth={1.5} />
            </div>
            <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">
              Intelligence <br /> <span className="text-emerald-600">Briefing.</span>
            </h1>
            <p className="mt-6 text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px]">
              Transparency Protocol & System Operations
            </p>
          </div>
        </FadeIn>

        <div className="space-y-4">
          {FAQ_CONTENT.map((item, index) => (
            <FadeIn key={index} delay={index * 0.05}>
              <div 
                className={`group bg-white rounded-[2rem] border transition-all duration-500 overflow-hidden ${
                  openIndex === index 
                    ? "border-emerald-500 shadow-2xl shadow-emerald-500/5 ring-4 ring-emerald-500/5" 
                    : "border-gray-100 shadow-sm hover:border-emerald-200"
                }`}
              >
                <button 
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-8 text-left transition-colors"
                >
                  <span className={`text-lg font-black uppercase italic tracking-tight transition-colors ${
                    openIndex === index ? "text-emerald-600" : "text-gray-900"
                  }`}>
                    {item.q}
                  </span>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    openIndex === index ? "bg-emerald-600 text-white rotate-180" : "bg-gray-50 text-gray-400"
                  }`}>
                    <ChevronDown size={20} />
                  </div>
                </button>
                
                {openIndex === index && (
                  <div className="px-8 pb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="h-px w-full bg-gray-50 mb-6" />
                    <p className="text-gray-600 text-lg leading-relaxed font-medium italic">
                      {item.a}
                    </p>
                    <div className="mt-6 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-emerald-600/50">
                       <ShieldCheck size={14} /> 
                       Verified uniSupport Protocol
                    </div>
                  </div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Support CTA */}
        <FadeIn delay={0.4}>
          <div className="mt-20 p-12 bg-gray-900 rounded-[3rem] text-center relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-white text-3xl font-black uppercase italic tracking-tighter mb-4">
                Still have an <span className="text-emerald-500">unresolved</span> query?
              </h3>
              <p className="text-gray-400 font-medium italic mb-8 max-w-md mx-auto">
                Our team of academic advisors is available for a direct briefing. We're here to ensure your journey is seamless.
              </p>
              <a 
                href="mailto:vault@getunisupport.xyz"
                className="inline-flex items-center gap-3 px-10 py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-white hover:text-gray-900 transition-all shadow-xl"
              >
                Contact Support <BookOpen size={18} />
              </a>
            </div>
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          </div>
        </FadeIn>
      </div>
    </main>
  );
}