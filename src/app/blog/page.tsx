import Link from "next/link";
import { createClient } from "@/lib/supabase";
import Image from "next/image"; // Import for optimized images

export const revalidate = 60; 

export default async function BlogPage() {
  const supabase = createClient();
  
  // We fetch author details too so we can show who wrote it
  const { data: posts } = await supabase
    .from("posts")
    .select(`
      *,
      writers (
        name,
        avatar_url
      )
    `)
    .eq("status", "published") 
    .order("published_at", { ascending: false });

  return (
    <div className="max-w-7xl mx-auto py-16 px-4">
      <div className="text-center mb-16">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-4 block">Knowledge Hub</span>
        <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter uppercase italic leading-none">
          uniSupport <span className="text-emerald-600">Insights.</span>
        </h1>
        <p className="text-lg text-gray-500 font-medium italic">Your guide to academic excellence and career growth.</p>
      </div>

      {!posts || posts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-bold uppercase tracking-widest">New insights coming soon...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {posts.map((post) => (
            <article key={post.id} className="group cursor-pointer">
              <Link href={`/blog/${post.slug}`}>
                {/* IMAGE CONTAINER */}
                <div className="relative h-80 mb-8 overflow-hidden rounded-[3rem] bg-emerald-900 shadow-sm group-hover:shadow-2xl transition-all duration-700">
                    {post.image_url ? (
                      <Image 
                        src={post.image_url}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                      />
                    ) : (
                      /* FALLBACK DESIGN */
                      <div className="w-full h-full flex items-center justify-center p-8">
                         <h3 className="text-white/10 font-black text-7xl absolute -bottom-4 -right-4 uppercase italic leading-none select-none">
                          {post.category?.split(' ')[0]}
                         </h3>
                         <p className="text-emerald-100 text-center font-black text-2xl relative z-10 leading-tight uppercase italic tracking-tighter">
                          {post.title}
                         </p>
                      </div>
                    )}
                  
                  {/* CATEGORY BADGE */}
                  <span className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest text-emerald-900 shadow-xl z-20">
                    {post.category}
                  </span>
                </div>
                
                {/* CONTENT */}
                <div className="px-2">
                  <h2 className="text-3xl font-black mb-4 group-hover:text-emerald-600 transition-colors leading-[0.9] tracking-tighter uppercase italic">
                    {post.title}
                  </h2>
                  <p className="text-gray-500 mb-6 line-clamp-2 font-medium italic text-sm">
                    {post.excerpt || "Dive deep into this comprehensive guide prepared by our academic architects..."}
                  </p>
                  
                  <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                    <div className="flex items-center gap-3">
                      {/* AUTHOR MINI-THUMBNAIL */}
                      <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                        {post.writers?.avatar_url ? (
                          <img src={post.writers.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-[10px] text-white font-bold">
                            {post.writers?.name?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">
                        {post.writers?.name || 'Staff'}
                      </span>
                    </div>
                    
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 group-hover:translate-x-2 transition-transform">
                      Read →
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}