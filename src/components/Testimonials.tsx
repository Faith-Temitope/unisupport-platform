"use client";

import { MessageSquare, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Tobi A.",
    uni: "Unilag",
    text: "The formatting was top-notch. My supervisor didn't find a single error in my Chapter 3. Saved me so much stress!",
    type: "Undergraduate"
  },
  {
    name: "Dr. Funmi",
    uni: "LBS",
    text: "Excellent proofreading for my research paper. The turn-around time was faster than expected. Highly professional.",
    type: "Postgraduate"
  },
  {
    name: "Emeka O.",
    uni: "Corporate",
    text: "The pitch deck they structured helped us secure our seed funding. They really understand the business landscape.",
    type: "Corporate"
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-white px-4 relative overflow-hidden">
      {/* Decorative background text */}
      <div className="absolute top-0 left-0 text-[15rem] font-black text-gray-50 -z-10 select-none leading-none -translate-y-1/2">
        TRUST
      </div>
      
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-emerald-600 font-bold tracking-[0.2em] uppercase text-sm">Real Results</span>
          <h2 className="text-5xl md:text-6xl font-black text-gray-900 mt-4 italic">
            What they say <span className="text-emerald-600">about us.</span>
          </h2>
          <div className="w-24 h-2 bg-emerald-500 mx-auto mt-6 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="p-8 rounded-3xl border border-gray-100 bg-gray-50/50 relative hover:border-emerald-200 transition-colors">
              <Quote className="absolute top-6 right-8 text-emerald-100" size={40} />
              <p className="text-gray-700 mb-6 italic relative z-10">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.uni} • {t.type}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}