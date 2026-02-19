"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Upload, Trash2, FileText, Loader2, Plus, X } from "lucide-react";

export default function AdminTemplates() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "Thesis",
    description: "",
    file: null as File | null,
  });

  useEffect(() => { fetchTemplates(); }, []);

  async function fetchTemplates() {
    const { data } = await supabase.from("templates").select("*").order("created_at", { ascending: false });
    if (data) setTemplates(data);
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file) return alert("Select a file first");
    setLoading(true);

    try {
      // 1. Upload File to Storage
      const fileExt = form.file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('templates')
        .upload(fileName, form.file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('templates')
        .getPublicUrl(fileName);

      // 3. Save to Database
      const { error: dbError } = await supabase.from("templates").insert([{
        title: form.title,
        category: form.category,
        description: form.description,
        file_url: publicUrl
      }]);

      if (dbError) throw dbError;

      alert("Template Live!");
      setShowModal(false);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string, url: string) => {
    if (!confirm("Remove this blueprint?")) return;
    const path = url.split('/').pop();
    await supabase.storage.from('templates').remove([path!]);
    await supabase.from("templates").delete().eq("id", id);
    fetchTemplates();
  };

  return (
    <main className="p-8 bg-[#FBFBFC] min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">Blueprint <span className="text-emerald-600">Archive</span></h1>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Manage Resource Library</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all"
          >
            <Plus size={14} /> Add New Template
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {templates.map(t => (
            <div key={t.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="font-black uppercase italic text-sm truncate w-40">{t.title}</h4>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">{t.category}</p>
                </div>
              </div>
              <button onClick={() => deleteTemplate(t.id, t.file_url)} className="text-red-400 hover:text-red-600 p-2">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Upload Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 relative">
              <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-gray-400"><X /></button>
              <h2 className="text-2xl font-black uppercase italic mb-6">New Resource</h2>
              <form onSubmit={handleUpload} className="space-y-4">
                <input required placeholder="Template Title" className="w-full bg-gray-50 border-none rounded-2xl p-4" onChange={e => setForm({...form, title: e.target.value})} />
                <select className="w-full bg-gray-50 border-none rounded-2xl p-4" onChange={e => setForm({...form, category: e.target.value})}>
                  <option>Thesis</option>
                  <option>Essay</option>
                  <option>Case Study</option>
                  <option>Business Plan</option>
                </select>
                <textarea placeholder="Short Description..." className="w-full bg-gray-50 border-none rounded-2xl p-4" onChange={e => setForm({...form, description: e.target.value})} />
                <div className="border-2 border-dashed border-gray-100 rounded-2xl p-8 text-center">
                  <input type="file" required className="hidden" id="file-up" onChange={e => setForm({...form, file: e.target.files![0]})} />
                  <label htmlFor="file-up" className="cursor-pointer">
                    <Upload className="mx-auto text-emerald-500 mb-2" />
                    <p className="text-[10px] font-black uppercase text-gray-400">{form.file ? form.file.name : "Select Document (.docx, .pdf)"}</p>
                  </label>
                </div>
                <button disabled={loading} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
                  {loading ? <Loader2 className="animate-spin mx-auto" /> : "Deploy to Vault"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}