"use client";
import InfoSection from '@/components/layout/InfoSection';
import { ABOUT_CONTENT } from '@/lib/info-content';
import FadeIn from '@/components/ui/FadeIn';
import { Shield, Target, Cpu, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="pt-40 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600 mb-6 block">The uniSupport Manifesto</span>
            <h1 className="text-6xl md:text-9xl font-black uppercase italic tracking-tighter leading-[0.85] text-gray-900 mb-12">
              Beyond <br /> <span className="text-emerald-600">Consultancy.</span>
            </h1>
          </FadeIn>
        </div>
      </section>

      {/* Narrative Section */}
      <section className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-start">
            <FadeIn>
              <p className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-gray-900 leading-tight">
                {ABOUT_CONTENT.subtitle}
              </p>
            </FadeIn>
            
            <FadeIn delay={0.2}>
              <div className="space-y-8">
                <p className="text-xl text-gray-500 leading-relaxed font-medium italic">
                  {ABOUT_CONTENT.story}
                </p>
                <div className="h-px w-full bg-gray-100" />
                <div className="flex items-center gap-6">
                   <div className="flex -space-x-4">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center overflow-hidden">
                           <div className="w-full h-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                             <Shield size={16} />
                           </div>
                        </div>
                      ))}
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                     Trusted by 5,000+ <br /> Researchers Globally
                   </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Core Values Grid */}
      <section className="py-20 bg-gray-50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {ABOUT_CONTENT.values.map((v, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="group p-10 bg-white rounded-[3rem] border border-gray-100 hover:border-emerald-500 transition-all duration-500 hover:shadow-2xl">
                  <div className="w-14 h-14 bg-gray-900 text-emerald-500 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    {i === 0 && <Target size={24} />}
                    {i === 1 && <Cpu size={24} />}
                    {i === 2 && <Shield size={24} />}
                  </div>
                  <h3 className="font-black uppercase italic text-xl tracking-tight mb-4 text-gray-900">{v.title}</h3>
                  <p className="text-gray-500 leading-relaxed font-medium italic">{v.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-10">
              Ready to <span className="text-emerald-600">Upgrade</span> Your Research?
            </h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <Link 
                href="/auth" 
                className="w-full md:w-auto px-12 py-6 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl flex items-center justify-center gap-3"
              >
                Initialize Identity <ArrowRight size={18} />
              </Link>
              <Link 
                href="/resources" 
                className="w-full md:w-auto px-12 py-6 bg-white border-2 border-gray-100 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-3"
              >
                Browse Blueprints
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </main>
  );
}