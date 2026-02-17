"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { Plus, Edit2, Eye, Trash2, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function AdminBlogManager() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  async function fetchPosts() {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    setPosts(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchPosts(); }, []);

  async function deletePost(id: string) {
    if (!confirm("Delete this article?")) return;
    await supabase.from("posts").delete().eq("id", id);
    fetchPosts();
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Content Engine</h1>
            <p className="text-gray-500 font-medium text-sm">Manage SEO articles and university guides.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchPosts} className="p-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-gray-400">
               <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <Link href="/admin/blog/new" className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">
              <Plus size={18} /> New Article
            </Link>
          </div>
        </header>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">Article</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Category</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-bold text-gray-900">{post.title}</p>
                    <p className="text-[10px] text-gray-400 font-medium">/{post.slug}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${
                      post.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-gray-500">{post.category}</td>
                  <td className="px-8 py-5">
                    <div className="flex justify-end gap-3">
                      <Link href={`/blog/${post.slug}`} target="_blank" className="p-2 text-gray-400 hover:text-emerald-600">
                        <Eye size={18}/>
                      </Link>
                      <button className="p-2 text-gray-400 hover:text-blue-600">
                        <Edit2 size={18}/>
                      </button>
                      <button onClick={() => deletePost(post.id)} className="p-2 text-gray-400 hover:text-red-500">
                        <Trash2 size={18}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}