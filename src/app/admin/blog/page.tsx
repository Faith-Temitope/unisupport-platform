import AdminSidebar from "@/components/layout/AdminSidebar";
import { posts } from "@/lib/blog-data";
import { Plus, Edit2, Eye } from "lucide-react";
import Link from "next/link";

export default function AdminBlogManager() {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Blog Manager</h1>
          <button className="btn-primary flex items-center gap-2 font-bold uppercase text-xs">
            <Plus size={18} /> New Post
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-4">Article Title</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-sm">{post.title}</td>
                  <td className="px-6 py-4">
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Published</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">{post.date}</td>
                  <td className="px-6 py-4 flex gap-4">
                    <Link href={`/blog/${post.slug}`} target="_blank" className="text-gray-400 hover:text-emerald-600"><Eye size={18}/></Link>
                    <button className="text-gray-400 hover:text-blue-600"><Edit2 size={18}/></button>
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