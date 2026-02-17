"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { Save, ArrowLeft, Loader2, Globe, FileText, Image as ImageIcon, UploadCloud, X, User } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function NewPost() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [writers, setWriters] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "Academic Advice",
    status: "draft",
    image_url: "",
    writer_id: "" // To link the post to an author
  });

  // Fetch writers to populate the author dropdown
  useEffect(() => {
    async function getWriters() {
      const { data } = await supabase.from("writers").select("id, name");
      if (data) setWriters(data);
    }
    getWriters();
  }, []);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData({ ...formData, title, slug: generateSlug(title) });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
      const filePath = `blog-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
    } catch (err: any) {
      alert("Image upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.writer_id) return alert("Please select an author.");
    setLoading(true);

    try {
      const { error } = await supabase
        .from("posts")
        .insert([{
          ...formData,
          published_at: formData.status === 'published' ? new Date().toISOString() : null
        }]);

      if (error) throw error;
      router.push("/admin/blog");
      router.refresh();
    } catch (err: any) {
      alert("Error saving post: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8 flex justify-between items-center">
            <div>
              <Link href="/admin/blog" className="text-emerald-600 flex items-center gap-2 text-sm font-bold mb-2">
                <ArrowLeft size={16} /> Back to Articles
              </Link>
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Draft <span className="text-emerald-600">Insight</span></h1>
            </div>
            
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
              {['draft', 'published'].map((s) => (
                <button 
                  key={s}
                  type="button"
                  onClick={() => setFormData({...formData, status: s})}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                    formData.status === s 
                    ? (s === 'published' ? 'bg-emerald-600 text-white' : 'bg-gray-900 text-white') 
                    : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6 pb-20">
            {/* FEATURED IMAGE UPLOAD */}
            <div className="relative h-64 w-full bg-gray-100 rounded-[3rem] border-2 border-dashed border-gray-200 overflow-hidden group">
               {formData.image_url ? (
                 <>
                  <Image src={formData.image_url} alt="Cover" fill className="object-cover" />
                  <button 
                    onClick={() => setFormData({...formData, image_url: ""})}
                    className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={16} />
                  </button>
                 </>
               ) : (
                 <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="p-4 bg-white rounded-2xl shadow-sm mb-3 text-gray-400">
                      {uploading ? <Loader2 className="animate-spin" /> : <UploadCloud size={32} />}
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">Upload Featured Image</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                 </label>
               )}
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl space-y-8">
              {/* Title & Slug */}
              <div className="space-y-4">
                <input 
                  required
                  type="text" 
                  placeholder="The Ultimate Guide to..."
                  className="w-full text-5xl font-black border-none outline-none placeholder:text-gray-100 text-gray-900 tracking-tighter"
                  value={formData.title}
                  onChange={handleTitleChange}
                />
                <div className="flex items-center gap-2 text-[11px] font-bold bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <Globe size={14} className="text-gray-400" />
                  <span className="text-gray-400 uppercase tracking-widest">Slug:</span>
                  <span className="text-emerald-600">/blog/{formData.slug}</span>
                </div>
              </div>

              {/* Author & Category Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
                    <User size={14} /> Assigned Author
                  </label>
                  <select 
                    required
                    className="w-full p-5 bg-gray-50 border-none rounded-2xl font-bold text-gray-900 outline-none appearance-none"
                    value={formData.writer_id}
                    onChange={(e) => setFormData({...formData, writer_id: e.target.value})}
                  >
                    <option value="">Select an expert...</option>
                    {writers.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
                    <ImageIcon size={14} /> Category
                  </label>
                  <select 
                    className="w-full p-5 bg-gray-50 border-none rounded-2xl font-bold text-gray-900 outline-none appearance-none"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option>Academic Advice</option>
                    <option>University Guides</option>
                    <option>Student Lifestyle</option>
                    <option>Project Tips</option>
                  </select>
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3">SEO Summary</label>
                <textarea 
                  rows={2}
                  placeholder="Write a snappy 160-character summary..."
                  className="w-full p-5 bg-gray-50 border-none rounded-2xl outline-none text-gray-600 font-medium italic"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                />
              </div>

              {/* Main Content Area */}
              <div>
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
                  <FileText size={14} /> Narrative
                </label>
                <textarea 
                  required
                  rows={15}
                  placeholder="Deep dive into the subject..."
                  className="w-full p-8 bg-gray-50 border-none rounded-[2.5rem] outline-none text-gray-800 leading-relaxed font-medium"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                />
              </div>
            </div>

            <button 
              disabled={loading || uploading}
              className={`w-full py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
                formData.status === 'published' 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-1' 
                : 'bg-gray-900 text-white hover:bg-black hover:-translate-y-1'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              {loading ? "Syncing..." : formData.status === 'published' ? "Launch to Public" : "Store as Draft"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}