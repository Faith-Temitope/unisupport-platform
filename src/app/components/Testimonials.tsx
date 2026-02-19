"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Quote, MessageSquare, Loader2 } from "lucide-react";

export default function Testimonials() {
  const supabase = createClient();
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getTestimonials() {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(6); // Limit to top 6 for the home page grid

      if (!error && data) {
        setTestimonials(data);
      }
      setLoading(false);
    }
    getTestimonials();
  }, [supabase]);

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

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div 
                key={t.id} 
                className="p-8 rounded-[2.5rem] border border-gray-100 bg-gray-50/50 relative hover:border-emerald-200 transition-all hover:shadow-xl group"
              >
                <Quote className="absolute top-6 right-8 text-emerald-100 group-hover:text-emerald-200 transition-colors" size={40} />
                
                <p className="text-gray-700 mb-6 italic relative z-10 font-medium leading-relaxed">
                  "{t.content}"
                </p>

                {/* WhatsApp Screenshot Preview (If exists) */}
                {t.image_url && (
                  <div className="mb-6 rounded-2xl overflow-hidden border border-gray-200 shadow-sm transition-transform hover:scale-[1.02]">
                    <img 
                      src={t.image_url} 
                      alt="WhatsApp Review" 
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black shadow-lg">
                    {t.client_name[0]}
                  </div>
                  <div>
                    <p className="font-black text-gray-900 leading-none mb-1">{t.client_name}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic">
                      {t.university}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}