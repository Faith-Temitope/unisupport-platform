"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import WriterSidebar from "@/components/layout/WriterSidebar";
import { 
  Clock, UploadCloud, FileText, X, Loader2, 
  Download, ExternalLink, LayoutDashboard, CheckCircle2, AlertCircle 
} from "lucide-react";

export default function WriterDashboard() {
  const supabase = useMemo(() => createClient(), []);
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

  // --- DATA LOADER ---
  const fetchData = useCallback(async (uid: string) => {
    try {
      const { data: writer } = await supabase.from("writers").select("*").eq("id", uid).single();
      setProfile(writer);

      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("writer_id", uid)
        .order("created_at", { ascending: false });

      setTasks(orders || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // --- AUTH & REALTIME SUBSCRIPTION ---
  useEffect(() => {
    let channel: any;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/writer/login");
        return;
      }
      setWriterId(user.id);
      fetchData(user.id);

      // REALTIME LISTENER: Refresh tasks when Admin updates an order assigned to this writer
      channel = supabase
        .channel(`writer-${user.id}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders', 
          filter: `writer_id=eq.${user.id}` 
        }, (payload) => {
          if (payload.new.status === 'in-progress' && payload.old.status === 'pending') {
            alert("🔔 NEW TASK: You have been assigned a new project!");
          }
          fetchData(user.id);
        })
        .subscribe();
    };

    setup();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [supabase, router, fetchData]);

  // --- FILE SUBMISSION ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask || !writerId) return;
    
    setSubmitting(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${selectedTask.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('submissions').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: 'preview-ready', completed_file_url: filePath })
        .eq("id", selectedTask.id);

      if (updateError) throw updateError;
      
      setIsSubmitModalOpen(false);
      fetchData(writerId);
      alert("Project delivered successfully!");
    } catch (err: any) {
      alert("Upload failed. Try a smaller file or different format.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAvailability = async () => {
    if (!writerId || !profile) return;
    const newStatus = !profile.is_available;
    const { error } = await supabase.from("writers").update({ is_available: newStatus }).eq("id", writerId);
    if (!error) setProfile({ ...profile, is_available: newStatus });
  };

  const filtered = tasks.filter(t => 
    activeTab === 'active' 
      ? (t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'refunded') 
      : t.status === 'completed'
  );

  if (loading) return (
    <div className="flex bg-[#FBFBFC] min-h-screen items-center justify-center font-black text-emerald-600 italic tracking-widest uppercase">
      <Loader2 className="animate-spin mr-2" /> Encrypting Workspace...
    </div>
  );

  return (
    <div className="flex bg-[#FBFBFC] min-h-screen font-sans">
      <WriterSidebar /> 
      
      <main className="flex-1 md:ml-64 p-4 md:p-12">
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
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase mt-6 border shadow-sm transition-all ${
                profile?.is_available ? "bg-emerald-500 text-white border-emerald-400" : "bg-white text-gray-400 border-gray-100"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${profile?.is_available ? 'bg-white animate-pulse' : 'bg-gray-300'}`} />
              {profile?.is_available ? "Accepting Tasks" : "Offline"}
            </button>
          </div>
          
          <div className="bg-gray-900 px-10 py-8 rounded-[3rem] shadow-2xl text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Writer Revenue</p>
            <p className="text-4xl font-black text-emerald-400 tracking-tighter">₦{profile?.earnings?.toLocaleString() || "0"}</p>
          </div>
        </header>

        <div className="flex gap-10 border-b border-gray-100 mb-10 font-black text-[11px] uppercase tracking-[0.25em]">
          <button onClick={() => setActiveTab('active')} className={`pb-5 relative transition-all ${activeTab === 'active' ? 'text-gray-900' : 'text-gray-300'}`}>
            Live Stack ({tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length})
            {activeTab === 'active' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-full" />}
          </button>
          <button onClick={() => setActiveTab('history')} className={`pb-5 relative transition-all ${activeTab === 'history' ? 'text-gray-900' : 'text-gray-300'}`}>
            History
            {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-full" />}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {filtered.length === 0 ? (
             <div className="p-20 text-center border-2 border-dashed border-gray-100 rounded-[3rem]">
               <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No projects in this stack</p>
             </div>
          ) : filtered.map((task) => (
            <div key={task.id} className="bg-white border border-gray-100 rounded-[3rem] p-8 flex flex-col lg:flex-row justify-between items-center shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${task.status === 'preview-ready' ? 'bg-purple-50 text-purple-500' : 'bg-gray-50 text-gray-400'}`}>
                  <FileText size={32} />
                </div>
                <div>
                  <h3 className="font-black text-2xl text-gray-900 italic uppercase leading-none">{task.service_type}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{task.university || "Academic Project"}</span>
                    <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                      task.status === 'preview-ready' ? 'bg-purple-100 text-purple-600 animate-pulse' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6 lg:mt-0">
                <button 
                  onClick={() => { setSelectedTask(task); setIsBriefModalOpen(true); }}
                  className="px-8 py-4 bg-gray-50 text-gray-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
                >
                  View Brief
                </button>
                {activeTab === 'active' && task.status !== 'preview-ready' && (
                  <button 
                    onClick={() => { setSelectedTask(task); setIsSubmitModalOpen(true); }}
                    className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all"
                  >
                    Submit Work
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL: PROJECT BRIEF */}
      {isBriefModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsBriefModalOpen(false)} className="absolute top-10 right-10 text-gray-300 hover:text-gray-900 transition-colors"><X size={32}/></button>
            <h2 className="text-4xl font-black text-gray-900 mb-8 tracking-tighter italic uppercase">Technical <span className="text-emerald-600">Brief</span></h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-6 rounded-[2rem]">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Scope</p>
                  <p className="font-black text-gray-900 text-xs uppercase">{selectedTask.pages} Pages • {selectedTask.tier}</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-[2rem]">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Deadline</p>
                  <p className="font-black text-red-500 text-xs uppercase italic">{new Date(selectedTask.deadline).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100">
                <p className="text-gray-700 text-sm leading-relaxed font-medium italic">"{selectedTask.description || "Refer to university guidelines for formatting."}"</p>
              </div>
              {selectedTask.file_url && (
                <button 
                  onClick={async () => {
                     const { data } = await supabase.storage.from('order-files').getPublicUrl(selectedTask.file_url);
                     window.open(data.publicUrl, '_blank');
                  }} 
                  className="w-full flex items-center justify-center gap-3 p-5 bg-gray-900 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all"
                >
                  <Download size={18} /> Download Brief Attachments
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBMISSION */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 shadow-2xl relative animate-in fade-in duration-300">
            <button onClick={() => setIsSubmitModalOpen(false)} className="absolute top-10 right-10 text-gray-300 hover:text-gray-900"><X size={32}/></button>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter italic uppercase">Deliver <span className="text-emerald-600">Work</span></h2>
              <p className="text-gray-400 text-[10px] font-black uppercase mt-2">Client review phase starts after upload</p>
            </div>
            <label className={`group relative border-4 border-dashed rounded-[3rem] p-16 flex flex-col items-center justify-center transition-all cursor-pointer ${
              submitting ? 'bg-gray-50 border-gray-200' : 'border-gray-100 hover:bg-emerald-50 hover:border-emerald-200'
            }`}>
              {submitting ? (
                <div className="text-center">
                  <Loader2 className="animate-spin text-emerald-600 mb-4 mx-auto" size={48} />
                  <p className="text-[10px] font-black uppercase text-emerald-600">Syncing to Cloud...</p>
                </div>
              ) : (
                <>
                  <UploadCloud size={52} className="text-gray-300 group-hover:text-emerald-500 mb-4 transition-colors" />
                  <p className="font-black text-[10px] uppercase tracking-widest text-gray-400">Select Final Document</p>
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx" />
                </>
              )}
            </label>
            <p className="mt-8 text-center text-[9px] font-bold text-gray-300 uppercase italic">PDF Format is required for secure client previews</p>
          </div>
        </div>
      )}
    </div>
  );
}