import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { Star, GraduationCap, CheckCircle, ArrowRight } from "lucide-react";

export const revalidate = 3600; // Refresh once an hour

export default async function ExpertsPage() {
  const supabase = createClient();
  const { data: writers } = await supabase
    .from("writers")
    .select("*")
    .eq("is_available", true)
    .order("rating", { ascending: false });

  return (
    <main className="bg-white py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
            Vetted Professionals
          </span>
          <h1 className="text-5xl md:text-8xl font-black mt-6 mb-8 tracking-tighter uppercase italic leading-[0.85]">
            Meet the <span className="text-emerald-600">Architects</span> <br /> of Excellence
          </h1>
          <p className="text-xl text-gray-500 font-medium italic max-w-2xl mx-auto">
            We only hire the top 2% of academic writers. Every expert is verified 
            for subject mastery and deadline integrity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {writers?.map((writer) => (
            <div key={writer.id} className="group relative bg-gray-50 rounded-[3rem] p-8 border border-transparent hover:border-emerald-500/20 hover:bg-white hover:shadow-3xl transition-all duration-500">
              {/* Badge */}
              <div className="absolute top-6 right-6 flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-black italic">{writer.rating}</span>
              </div>

              {/* Profile Header */}
              <div className="flex flex-col items-center text-center">
                <div className="w-32 h-32 bg-emerald-100 rounded-[2.5rem] mb-6 overflow-hidden border-4 border-white shadow-lg relative group-hover:scale-110 transition-transform duration-500">
                    {/* Placeholder for actual image if you add one later */}
                    <div className="w-full h-full flex items-center justify-center text-emerald-700 font-black text-4xl italic">
                        {writer.name[0]}
                    </div>
                </div>
                
                <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2">
                  Expert {writer.name}
                </h3>
                
                <div className="flex items-center gap-2 text-emerald-600 mb-6">
                  <GraduationCap size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{writer.specialization}</span>
                </div>

                <div className="space-y-3 w-full mb-8">
                    <div className="flex justify-between items-center text-xs border-b border-gray-200 pb-2">
                        <span className="text-gray-400 font-bold uppercase italic">Success Rate</span>
                        <span className="font-black text-gray-900">100%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-b border-gray-200 pb-2">
                        <span className="text-gray-400 font-bold uppercase italic">Projects</span>
                        <span className="font-black text-gray-900">{writer.completed_projects}+</span>
                    </div>
                </div>

                <Link 
                  href={`/order?writer_id=${writer.id}`}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  Hire This Expert <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Trust Stats */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
                { label: "Verified Experts", val: "50+" },
                { label: "A+ Grade Avg", val: "94%" },
                { label: "Late Deliveries", val: "0" },
                { label: "Client Referrals", val: "88%" },
            ].map((stat, i) => (
                <div key={i} className="text-center p-8 bg-gray-900 rounded-[2.5rem] text-white">
                    <p className="text-4xl font-black italic mb-2 tracking-tighter text-emerald-400">{stat.val}</p>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">{stat.label}</p>
                </div>
            ))}
        </div>
      </div>
    </main>
  );
}