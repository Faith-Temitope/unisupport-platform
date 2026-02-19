import InfoSection from '@/components/layout/InfoSection';
import { ABOUT_CONTENT } from '@/lib/info-content';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About uniSupport | Premier Academic Research Consultancy',
  description: 'uniSupport is a specialized research consultancy providing model research and technical blueprints for ambitious students.',
};

export default function AboutPage() {
  return (
    <main className="pt-20 bg-white min-h-screen">
      <InfoSection title="About uniSupport">
        <p className="text-xl font-medium text-emerald-600 mb-6">{ABOUT_CONTENT.subtitle}</p>
        <p className="text-gray-600 mb-12 leading-loose">{ABOUT_CONTENT.story}</p>
        
        <div className="grid md:grid-cols-3 gap-8 mt-12">
          {ABOUT_CONTENT.values.map((v, i) => (
            <div key={i} className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <h3 className="font-black uppercase text-xs tracking-widest mb-3 text-black">{v.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </InfoSection>
    </main>
  );
}