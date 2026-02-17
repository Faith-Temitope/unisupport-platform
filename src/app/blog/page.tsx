import Link from "next/link";
import { createClient } from "@/lib/supabase";

export const revalidate = 60; // Refresh once per minute to see new posts

export default async function BlogPage() {
  const supabase = createClient();
  
  // We only want to show 'published' posts to the public
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published") 
    .order("published_at", { ascending: false });

  return (
    <div className="max-w-7xl mx-auto py-16 px-4">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black mb-4 tracking-tighter uppercase italic">
          uniSupport <span className="text-emerald-600">Insights</span>
        </h1>
        <p className="text-lg text-gray-500 font-medium italic">Your guide to academic excellence and career growth.</p>
      </div>

      {!posts || posts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-bold uppercase tracking-widest">New insights coming soon...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {posts.map((post) => (
            <article key={post.id} className="group">
              <Link href={`/blog/${post.slug}`}>
                {/* Note: Your schema doesn't have an 'image' column. 
                  If you add one later, replace the bg-emerald-900 with an <img> tag.
                */}
                <div className="relative h-64 mb-6 overflow-hidden rounded-[2.5rem] bg-emerald-900 flex items-center justify-center p-8 shadow-sm group-hover:shadow-2xl transition-all duration-500">
                   <h3 className="text-white/20 font-black text-6xl absolute -bottom-4 -right-4 uppercase italic leading-none select-none">
                    {post.category?.split(' ')[0]}
                   </h3>
                   <p className="text-emerald-100 text-center font-bold text-xl relative z-10 leading-tight">
                    {post.title}
                   </p>
                  <span className="absolute top-6 left-6 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white">
                    {post.category}
                  </span>
                </div>
                
                <h2 className="text-2xl font-black mb-3 group-hover:text-emerald-600 transition-colors leading-tight tracking-tight uppercase italic">
                  {post.title}
                </h2>
                <p className="text-gray-500 mb-6 line-clamp-2 font-medium">
                  {post.excerpt || "Click to read the full guide..."}
                </p>
                <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <span>{post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Recent'}</span>
                  <span className="mx-3 text-emerald-500">•</span>
                  <span className="text-emerald-600 group-hover:translate-x-2 transition-transform">Read Guide →</span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}