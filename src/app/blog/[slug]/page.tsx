import { createClient } from "@/lib/supabase";
import { ChevronLeft, Calendar, Tag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

// Define the type to match Next.js 15 requirements
type Props = {
  params: Promise<{ slug: string }>;
};

export default async function BlogPost({ params }: Props) {
  // 1. UNWRAP the params before using them
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const supabase = createClient();
  
  // 2. Fetch post with the unwrapped slug
  const { data: post } = await supabase
    .from("posts")
    .select(`
      *,
      author:writers(name)
    `)
    .eq("slug", slug)
    .single();

  if (!post) notFound();

  return (
    <article className="max-w-4xl mx-auto py-16 px-4">
      <Link href="/blog" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-emerald-600 mb-12 transition-colors">
        <ChevronLeft size={16} /> Back to Insights
      </Link>

      <header className="mb-12">
        <div className="flex items-center gap-4 mb-6">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <Tag size={12} /> {post.category}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <Calendar size={12} /> {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Recent'}
          </span>
        </div>
        
        <h1 className="text-4xl md:text-7xl font-black mt-4 mb-8 tracking-tighter uppercase italic leading-[0.9]">
          {post.title}
        </h1>

        {post.author && (
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl w-fit border border-gray-100">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-black">
              {(post.author as any).name[0]}
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-600">
              By Expert {(post.author as any).name}
            </p>
          </div>
        )}
      </header>

      <div 
        className="prose prose-xl max-w-none prose-emerald 
                   prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter
                   prose-p:text-gray-600 prose-p:leading-relaxed prose-p:font-medium
                   prose-strong:text-gray-900 prose-strong:font-black"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}