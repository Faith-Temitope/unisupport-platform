"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { Plus, Image as ImageIcon, Trash2, Loader2, Star, CheckCircle, UploadCloud } from "lucide-react";

export default function AdminTestimonials() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    client_name: "",
    university: "",
    content: "",
    image_url: ""
  });

  async function fetchTestimonials() {
    setFetching(true);
    const { data } = await supabase
      .from("testimonials")
      .select("*")
      .order("created_at", { ascending: false });
    setTestimonials(data || []);
    setFetching(false);
  }

  useEffect(() => { fetchTestimonials(); }, []);

  // HANDLE IMAGE UPLOAD
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('testimonials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data } = supabase.storage
        .from('testimonials')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: data.publicUrl });
    } catch (error: any) {
      alert("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("testimonials").insert([formData]);
    
    if (!error) {
      setFormData({ client_name: "", university: "", content: "", image_url: "" });
      fetchTestimonials();
    }
    setLoading(false);
  };

  async function deleteTestimonial(id: string) {
    if (!confirm("Remove this testimonial?")) return;
    await supabase.from("testimonials").delete().eq("id", id);
    fetchTestimonials();
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Social Proof Manager</h1>
            <p className="text-gray-500 font-medium text-sm">Upload WhatsApp screenshots directly to your site.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-4">
              <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Plus className="text-emerald-500" size={20} /> Create Testimonial
              </h2>
              
              <div className="space-y-4">
                <input 
                  required
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-emerald-500 font-bold" 
                  placeholder="Client Name" 
                  value={formData.client_name}
                  onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                />

                <input 
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-emerald-500 font-bold" 
                  placeholder="University / Org" 
                  value={formData.university}
                  onChange={(e) => setFormData({...formData, university: e.target.value})}
                />

                <textarea 
                  required
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                  rows={3} 
                  placeholder="Review Text"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                ></textarea>

                {/* UPLOAD BOX */}
                <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-gray-50 transition-all overflow-hidden">
                  {formData.image_url ? (
                    <div className="space-y-2">
                      <img src={formData.image_url} alt="Preview" className="h-32 mx-auto rounded-lg shadow-md" />
                      <button type="button" onClick={() => setFormData({...formData, image_url: ""})} className="text-xs text-red-500 font-bold">Remove Image</button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <UploadCloud className="mx-auto text-gray-400 mb-2" size={28} />
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">
                        {uploading ? "Uploading..." : "Click to Upload Screenshot"}
                      </p>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                  )}
                </div>

                <button 
                  disabled={loading || uploading}
                  className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={18} />}
                  Go Live
                </button>
              </div>
            </form>
          </div>

          {/* List Section */}
          <div className="lg:col-span-3 space-y-4">
            {fetching ? (
              <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-500" /></div>
            ) : (
              testimonials.map((t) => (
                <div key={t.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-start gap-4 group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center font-black text-emerald-700 text-xs">
                        {t.client_name.charAt(0)}
                      </div>
                      <p className="font-black text-gray-900 text-sm">{t.client_name}</p>
                    </div>
                    <p className="text-xs text-gray-600 italic">"{t.content}"</p>
                    {t.image_url && (
                      <div className="mt-3 p-1 bg-gray-50 rounded-xl inline-block border border-gray-100">
                         <img src={t.image_url} alt="Screenshot" className="h-20 rounded-lg" />
                      </div>
                    )}
                  </div>
                  <button onClick={() => deleteTestimonial(t.id)} className="text-gray-200 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}