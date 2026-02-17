"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import WriterSidebar from "@/components/layout/WriterSidebar";
import { History, Download, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function WriterHistory() {
  const supabase = createClient();
  const router = useRouter();
  
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * AUTH GUARD & DATA FETCH
   */
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    
    // Get the current logged-in user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      router.push("/writer/login");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("writer_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompletedJobs(data || []);
    } catch (err) {
      console.error("History fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="flex bg-[#FBFBFC] min-h-screen">
      <WriterSidebar />
      
      <main className="flex-1 md:ml-64 p-8">
        <header className="mb-10">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">Finished Work</h1>
          <p className="text-gray-500 font-medium italic text-sm">A secure archive of your delivered academic excellence.</p>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : (
          <div className="space-y-4">
            {completedJobs.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-gray-100">
                <AlertCircle className="mx-auto mb-4 opacity-10" size={64} />
                <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.3em]">No completed projects in your archive yet</p>
              </div>
            ) : (
              completedJobs.map((job) => (
                <div 
                  key={job.id} 
                  className="bg-white border border-gray-100 rounded-[2.5rem] p-8 flex flex-col sm:flex-row justify-between items-center group hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-50/50 transition-all duration-300"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={32} />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-gray-900 tracking-tight">{job.service_type}</h3>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic mt-1">
                        Completed {new Date(job.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-10 mt-6 sm:mt-0">
                    <div className="text-right">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Earned</p>
                       <p className="text-2xl font-black text-emerald-600 tracking-tighter">
                         ₦{(job.total_price * 0.5).toLocaleString()}
                       </p>
                    </div>
                    
                    {job.completed_file_url && (
                      <a 
                        href={job.completed_file_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-5 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-900 hover:text-white transition-all shadow-sm"
                        title="Download Final Copy"
                      >
                        <Download size={24} />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}