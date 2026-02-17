"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { Plus, Edit2, Eye, Trash2, RefreshCw, FileText, ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function AdminBlogManager() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  async function fetchPosts() {
    setLoading(true);
    // We fetch the writer name as well so you know who to blame for typos!
    const { data } = await supabase
      .from("posts")
      .select(`
        *,
        writers ( name )
      `)
      .order("created_at", { ascending: false });
    
    setPosts(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchPosts(); }, []);

  async function deletePost(id: string) {
    if (!confirm("Delete this article? This will remove it from the public site immediately.")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) alert(error.message);
    else fetchPosts();
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Content <span className="text-emerald-600">Engine</span></h1>
            <p className="text-gray-500 font-medium italic text-sm">Manage SEO articles, university guides, and academic insights.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={fetchPosts} 
              className="p-4 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-gray-400 shadow-sm"
            >
               <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <Link 
              href="/admin/blog/new" 
              className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 shadow-xl hover:bg-emerald-600 transition-all"
            >
              <Plus size={20} /> New Article
            </Link>
          </div>
        </header>

        {/* CONTENT TABLE */}
        <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-900 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
              <tr>
                <th className="px-10 py-6">Article Preview</th>
                <th className="px-8 py-6">Author</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Category</th>
                <th className="px-10 py-6 text-right">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {posts.length === 0 && !loading ? (
                <tr>
                   <td colSpan={5} className="py-20 text-center">
                      <FileText size={48} className="mx-auto text-gray-100 mb-4" />
                      <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No articles found.</p>
                   </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-12 bg-gray-100 rounded-xl overflow-hidden relative flex-shrink-0 border border-gray-100">
                           {post.image_url ? (
                             <Image src={post.image_url} alt="" fill className="object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-gray-300">
                               <ImageIcon size={20} />
                             </div>
                           )}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 uppercase italic tracking-tight leading-none mb-1">{post.title}</p>
                          <p className="text-[10px] text-emerald-600 font-bold tracking-widest">/blog/{post.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                         {post.writers?.name || "Unassigned"}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] ${
                        post.status === 'published' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">{post.category}</td>
                    <td className="px-10 py-6">
                      <div className="flex justify-end gap-2">
                        <Link 
                          href={`/blog/${post.slug}`} 
                          target="_blank" 
                          className="p-3 text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        >
                          <Eye size={18}/>
                        </Link>
                        {/* Edit Button linked to the ID */}
                        <Link 
                          href={`/admin/blog/edit/${post.id}`}
                          className="p-3 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Edit2 size={18}/>
                        </Link>
                        <button 
                          onClick={() => deletePost(post.id)} 
                          className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}