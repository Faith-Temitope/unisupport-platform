"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import WriterSidebar from "@/components/layout/WriterSidebar";
import { 
  Clock, Wallet, UploadCloud, FileText, X, Loader2, AlertCircle, Power, Eye, Download, CheckCircle
} from "lucide-react";

export default function WriterDashboard() {
  const supabase = createClient();
  const router = useRouter();
  
  // State Management
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [tasks, setTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [writerId, setWriterId] = useState<string | null>(null);
  
  // Modals state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isBriefModalOpen, setIsBriefModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * AUTH GUARD
   * Checks if a session exists, otherwise redirects to login
   */
  const checkAuthAndLoad = useCallback(async () => {
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      router.push("/writer/login");
      return;
    }

    setWriterId(user.id);

    try {
      // Fetch writer profile
      const { data: writer, error: profileError } = await supabase
        .from("writers")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(writer);

      // Fetch assignments
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("writer_id", user.id)
        .order("created_at", { ascending: false });

      setTasks(orders || []);
    } catch (err) {
      console.error("Data load error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    checkAuthAndLoad();
  }, [checkAuthAndLoad]);

  /**
   * TOGGLE AVAILABILITY
   */
  const toggleAvailability = async () => {
    if (!writerId || !profile) return;
    const newStatus = !profile.is_available;
    const { error } = await supabase
      .from("writers")
      .update({ is_available: newStatus })
      .eq("id", writerId);
    
    if (!error) setProfile({ ...profile, is_available: newStatus });
  };

  /**
   * FILE SUBMISSION LOGIC
   */
  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask || !writerId) return;
    
    setSubmitting(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `delivery-${selectedTask.id}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('submissions')
        .getPublicUrl(fileName);
      
      // Update order status for Admin review
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: 'preview-ready', 
          completed_file_url: urlData.publicUrl 
        })
        .eq("id", selectedTask.id);

      if (updateError) throw updateError;
      
      setIsSubmitModalOpen(false);
      checkAuthAndLoad(); // Refresh data
      alert("Submission successful! Admin will review shortly.");
    } catch (err) {
      alert("Upload failed. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = tasks.filter(t => 
    activeTab === 'active' 
      ? (t.status !== 'completed' && t.status !== 'cancelled') 
      : t.status === 'completed'
  );

  return (
    <div className="flex bg-[#FBFBFC] min-h-screen">
      <WriterSidebar /> 
      
      <main className="flex-1 md:ml-64 p-8">
        {/* DASHBOARD HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">Expert Workspace</h1>
            <button 
              onClick={toggleAvailability} 
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase mt-2 border transition-all ${
                profile?.is_available 
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                  : "bg-gray-100 text-gray-400 border-gray-200"
              }`}
            >
              <Power size={12} /> {profile?.is_available ? "Online & Accepting Jobs" : "Offline / On Break"}
            </button>
          </div>
          
          <div className="bg-white px-8 py-5 rounded-[2rem] shadow-sm border border-gray-100 text-right min-w-[200px]">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Available to Withdraw</p>
            <p className="text-2xl font-black text-emerald-600">₦{profile?.earnings?.toLocaleString() || "0"}</p>
          </div>
        </header>

        {/* TABS NAVIGATION */}
        <div className="flex gap-8 border-b border-gray-100 mb-8 font-black text-xs uppercase tracking-[0.2em]">
          <button 
            onClick={() => setActiveTab('active')} 
            className={`pb-4 transition-all ${activeTab === 'active' ? 'border-b-4 border-emerald-500 text-gray-900' : 'text-gray-300'}`}
          >
            Active Assignments
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            className={`pb-4 transition-all ${activeTab === 'history' ? 'border-b-4 border-emerald-500 text-gray-900' : 'text-gray-300'}`}
          >
            Finished Projects
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-gray-100 text-gray-300">
                <AlertCircle className="mx-auto mb-4 opacity-20" size={64} />
                <p className="font-black text-xs uppercase tracking-widest italic">No matching assignments found</p>
              </div>
            ) : (
              filtered.map((task) => (
                <div key={task.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 flex flex-col lg:flex-row justify-between items-center group hover:shadow-2xl hover:border-emerald-100 transition-all duration-500">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-[1.5rem] flex items-center justify-center text-gray-300 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                      <FileText size={32} />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-gray-900 tracking-tight">{task.service_type}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">{task.university}</span>
                        <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                          task.status === 'preview-ready' ? 'text-purple-500' : 'text-amber-500'
                        }`}>
                          {task.status.replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-8 lg:mt-0 w-full lg:w-auto">
                    <button 
                      onClick={() => { setSelectedTask(task); setIsBriefModalOpen(true); }}
                      className="flex-1 lg:flex-none px-8 py-4 bg-gray-50 text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all"
                    >
                      View Brief
                    </button>
                    {activeTab === 'active' && task.status !== 'preview-ready' && (
                      <button 
                        onClick={() => { setSelectedTask(task); setIsSubmitModalOpen(true); }}
                        className="flex-1 lg:flex-none px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                      >
                        Submit Work
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* MODAL: PROJECT BRIEF */}
      {isBriefModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] p-12 shadow-2xl relative">
            <button onClick={() => setIsBriefModalOpen(false)} className="absolute top-10 right-10 text-gray-300 hover:text-gray-900 transition-colors"><X size={28}/></button>
            <h2 className="text-4xl font-black text-gray-900 mb-8 tracking-tighter italic uppercase">Project Brief</h2>
            
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Service Level</p>
                  <p className="font-black text-gray-900 uppercase text-xs">{selectedTask.service_type} • {selectedTask.tier}</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Volume</p>
                  <p className="font-black text-gray-900 text-xs">{selectedTask.pages} Standard Pages</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Client Requirements</p>
                <div className="bg-emerald-50/30 p-8 rounded-[2.5rem] border border-emerald-100/50 text-gray-700 text-sm leading-relaxed italic">
                  "{selectedTask.instructions || "The client did not provide specific extra instructions."}"
                </div>
              </div>

              <div className="flex justify-between items-center bg-gray-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
                <div>
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Submission Deadline</p>
                  <p className="font-black text-lg">{new Date(selectedTask.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Your Earnings</p>
                  <p className="text-3xl font-black text-emerald-400">₦{(selectedTask.total_price * 0.5).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBMISSION */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-12 shadow-2xl relative">
            <button onClick={() => setIsSubmitModalOpen(false)} className="absolute top-10 right-10 text-gray-300 hover:text-gray-900 transition-colors"><X size={28}/></button>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">Final Delivery</h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2">Upload the completed file for admin review</p>
            </div>

            <label className="group relative border-4 border-dashed border-gray-100 rounded-[3rem] p-16 flex flex-col items-center justify-center hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-pointer">
              {submitting ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Uploading Project...</p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <UploadCloud size={40} className="text-gray-300 group-hover:text-emerald-500" />
                  </div>
                  <p className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 text-center">Select Document</p>
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.zip" />
                </>
              )}
            </label>
            
            <p className="text-center text-[9px] text-gray-400 font-bold uppercase mt-6 tracking-widest">
              By uploading, you confirm this work is original and complete.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}