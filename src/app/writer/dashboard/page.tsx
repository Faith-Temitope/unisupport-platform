"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import WriterSidebar from "@/components/layout/WriterSidebar";
import { 
  Clock, UploadCloud, FileText, X, Loader2, AlertCircle, 
  Download, ExternalLink, LayoutDashboard, ChevronRight
} from "lucide-react";

export default function WriterDashboard() {
  const supabase = createClient();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [tasks, setTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [writerId, setWriterId] = useState<string | null>(null);
  
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isBriefModalOpen, setIsBriefModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const checkAuthAndLoad = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/writer/login");
        return;
      }

      setWriterId(user.id);

      // Fetch Writer Profile
      const { data: writer, error: profileError } = await supabase
        .from("writers")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(writer);

      // Fetch Assigned Orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("writer_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
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

  const downloadBrief = async (path: string) => {
    try {
      // path should be the relative path in the 'order-files' bucket
      const { data, error } = await supabase.storage.from('order-files').download(path);
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Brief-${selectedTask?.service_type}-${selectedTask?.id.slice(0, 5)}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download error:", err);
      alert("Brief file not found or access denied. Contact Admin.");
    }
  };

  const toggleAvailability = async () => {
    if (!writerId || !profile) return;
    const newStatus = !profile.is_available;
    const { error } = await supabase.from("writers").update({ is_available: newStatus }).eq("id", writerId);
    if (!error) setProfile({ ...profile, is_available: newStatus });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask || !writerId) return;
    
    setSubmitting(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedTask.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('submissions')
        .getPublicUrl(fileName);
      
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: 'preview-ready', 
          completed_file_url: urlData.publicUrl 
        })
        .eq("id", selectedTask.id);

      if (updateError) throw updateError;
      
      setIsSubmitModalOpen(false);
      checkAuthAndLoad();
      alert("Success! Work delivered to client.");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Delivery failed. Check file size/type and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = tasks.filter(t => 
    activeTab === 'active' 
      ? (t.status !== 'completed' && t.status !== 'cancelled') 
      : t.status === 'completed'
  );

  if (loading) {
    return (
      <div className="flex bg-[#FBFBFC] min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-emerald-600 mb-4 mx-auto" size={48} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Syncing Workspace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-[#FBFBFC] min-h-screen font-sans">
      <WriterSidebar /> 
      
      <main className="flex-1 md:ml-64 p-4 md:p-12">
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <LayoutDashboard size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Expert Console</span>
            </div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">
              Control <span className="text-emerald-600">Center.</span>
            </h1>
            <button 
              onClick={toggleAvailability} 
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase mt-6 border shadow-sm transition-all active:scale-95 ${
                profile?.is_available ? "bg-emerald-500 text-white border-emerald-400" : "bg-white text-gray-400 border-gray-100"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${profile?.is_available ? 'bg-white animate-pulse' : 'bg-gray-300'}`} />
              {profile?.is_available ? "Accepting New Tasks" : "Currently Offline"}
            </button>
          </div>
          
          <div className="bg-gray-900 px-10 py-8 rounded-[3rem] shadow-2xl text-right min-w-[280px]">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Available Payout</p>
            <p className="text-4xl font-black text-emerald-400 tracking-tighter">₦{profile?.earnings?.toLocaleString() || "0"}</p>
          </div>
        </header>

        {/* TAB NAVIGATION */}
        <div className="flex gap-10 border-b border-gray-100 mb-10 font-black text-[11px] uppercase tracking-[0.25em]">
          <button onClick={() => setActiveTab('active')} className={`pb-5 transition-all relative ${activeTab === 'active' ? 'text-gray-900' : 'text-gray-300'}`}>
            Live Stack ({tasks.filter(t => t.status !== 'completed').length})
            {activeTab === 'active' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-full" />}
          </button>
          <button onClick={() => setActiveTab('history')} className={`pb-5 transition-all relative ${activeTab === 'history' ? 'text-gray-900' : 'text-gray-300'}`}>
            History
            {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-full" />}
          </button>
        </div>

        {/* TASK LIST */}
        <div className="grid grid-cols-1 gap-6">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-[3rem] p-32 text-center border-2 border-dashed border-gray-100">
              <Clock className="mx-auto mb-4 text-gray-200" size={48} />
              <p className="font-black text-xs uppercase tracking-widest text-gray-300 italic">No tasks in this category.</p>
            </div>
          ) : (
            filtered.map((task) => (
              <div key={task.id} className="group bg-white border border-gray-100 rounded-[3rem] p-8 md:p-10 flex flex-col lg:flex-row justify-between items-center hover:border-emerald-200 transition-all shadow-sm hover:shadow-xl">
                <div className="flex items-center gap-8 w-full md:w-auto">
                  <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-300 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all shadow-inner">
                    <FileText size={36} />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl text-gray-900 tracking-tight italic uppercase">{task.service_type}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{task.university || "Private Project"}</span>
                      <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                        task.status === 'preview-ready' ? 'bg-purple-100 text-purple-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {task.status.replace('-', ' ')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-8 lg:mt-0 w-full lg:w-auto">
                  <button 
                    onClick={() => { setSelectedTask(task); setIsBriefModalOpen(true); }}
                    className="flex-1 lg:flex-none px-10 py-5 bg-gray-50 text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    View Brief
                  </button>
                  {activeTab === 'active' && task.status !== 'preview-ready' && (
                    <button 
                      onClick={() => { setSelectedTask(task); setIsSubmitModalOpen(true); }}
                      className="flex-1 lg:flex-none px-10 py-5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                    >
                      Deliver
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* MODAL: PROJECT BRIEF */}
      {isBriefModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setIsBriefModalOpen(false)} className="absolute top-12 right-12 text-gray-300 hover:text-gray-900 transition-colors">
              <X size={32}/>
            </button>
            <h2 className="text-4xl font-black text-gray-900 mb-8 tracking-tighter italic uppercase">Technical <span className="text-emerald-600">Brief</span></h2>
            
            <div className="space-y-6">
               {selectedTask.file_url && (
                 <button 
                    onClick={() => downloadBrief(selectedTask.file_url)}
                    className="w-full flex items-center justify-between p-6 bg-blue-50 border border-blue-100 rounded-[2rem] text-blue-600 hover:bg-blue-600 hover:text-white transition-all group"
                 >
                    <div className="flex items-center gap-4">
                      <Download size={24} />
                      <span className="font-black text-xs uppercase tracking-widest">Download Client Attachments</span>
                    </div>
                    <ExternalLink size={18} />
                 </button>
               )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Volume</p>
                  <p className="font-black text-gray-900 text-xs uppercase tracking-tight">{selectedTask.pages} Pages • {selectedTask.tier}</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Deadline</p>
                  <p className="font-black text-red-500 text-xs">{new Date(selectedTask.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-3 italic">Requirement Description</p>
                <p className="text-gray-700 text-sm leading-relaxed font-medium italic">
                  "{selectedTask.description || "Standard quality research project. Follow academic guidelines."}"
                </p>
              </div>

              <div className="flex justify-between items-center bg-gray-900 p-8 rounded-[3rem] text-white">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fee (50% Milestone)</p>
                <p className="text-3xl font-black text-emerald-400">₦{(selectedTask.total_price * 0.5).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBMISSION */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 shadow-2xl relative">
            <button onClick={() => setIsSubmitModalOpen(false)} className="absolute top-12 right-12 text-gray-300 hover:text-gray-900 transition-colors">
              <X size={32}/>
            </button>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">Final <span className="text-emerald-600">Delivery</span></h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-4">Upload complete research file</p>
            </div>

            <label className={`group relative border-4 border-dashed rounded-[3rem] p-16 flex flex-col items-center justify-center transition-all cursor-pointer ${
              submitting ? 'bg-gray-50 border-gray-200' : 'border-gray-100 hover:bg-emerald-50 hover:border-emerald-200'
            }`}>
              {submitting ? (
                <div className="text-center">
                  <Loader2 className="animate-spin text-emerald-600 mb-4 mx-auto" size={48} />
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Submitting Work...</p>
                </div>
              ) : (
                <>
                  <UploadCloud size={52} className="text-gray-300 group-hover:text-emerald-500 mb-4 transition-transform group-hover:scale-110" />
                  <p className="font-black text-[10px] uppercase tracking-widest text-gray-400">Select File</p>
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.zip" />
                </>
              )}
            </label>
          </div>
        </div>
      )}
    </div>
  );
}