"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { Save, ArrowLeft, Loader2, Globe, FileText } from "lucide-react";
import Link from "next/link";

export default function NewPost() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "Academic Advice",
    status: "draft"
  });

  // Automatically turn "My New Post" into "my-new-post"
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("posts")
        .insert([formData]);

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
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Write New Article</h1>
            </div>
            
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
              <button 
                type="button"
                onClick={() => setFormData({...formData, status: 'draft'})}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${formData.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'text-gray-400'}`}
              >
                Draft
              </button>
              <button 
                type="button"
                onClick={() => setFormData({...formData, status: 'published'})}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${formData.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400'}`}
              >
                Publish
              </button>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
              {/* Title & Slug */}
              <div className="space-y-4">
                <input 
                  required
                  type="text" 
                  placeholder="Enter a catchy title..."
                  className="w-full text-4xl font-black border-none outline-none placeholder:text-gray-200 text-gray-900"
                  value={formData.title}
                  onChange={handleTitleChange}
                />
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Globe size={14} />
                  <span>unisupport.com/blog/</span>
                  <input 
                    type="text"
                    className="bg-transparent border-none outline-none text-emerald-600 font-bold flex-1"
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  />
                </div>
              </div>

              {/* Category & Excerpt */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Category</label>
                  <select 
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 outline-none"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option>Academic Advice</option>
                    <option>University Guides</option>
                    <option>Student Lifestyle</option>
                    <option>Project Tips</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Short Excerpt (SEO Meta Description)</label>
                  <input 
                    type="text"
                    placeholder="A brief summary for Google search results..."
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none text-gray-600"
                    value={formData.excerpt}
                    onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                  />
                </div>
              </div>

              {/* Main Content Area */}
              <div>
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  <FileText size={14} /> Article Content
                </label>
                <textarea 
                  required
                  rows={15}
                  placeholder="Start writing your masterpiece here..."
                  className="w-full p-6 bg-gray-50 border-none rounded-3xl outline-none text-gray-700 leading-relaxed font-medium"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
                formData.status === 'published' 
                ? 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700' 
                : 'bg-gray-900 text-white shadow-gray-200 hover:bg-black'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              {loading ? "Saving to Cloud..." : formData.status === 'published' ? "Go Live & Publish" : "Save as Draft"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}