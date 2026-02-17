import { createClient } from "@/lib/supabase";
import { ChevronLeft, Calendar, Tag, User } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const supabase = createClient();

  const { data: post } = await supabase
    .from("posts")
    .select(`
      *,
      author:writers(name, avatar_url)
    `)
    .eq("slug", slug)
    .single();

  if (!post) notFound();

  // CLEANUP FUNCTION: 
  // 1. Replaces literal "\n" strings (common in JSON storage) with HTML breaks
  // 2. Replaces actual invisible newline characters with HTML breaks
  const formatContent = (content: string) => {
    if (!content) return "";
    return content
      .replace(/\\n/g, "<br />") 
      .replace(/\n/g, "<br />");
  };

  return (
    <article className="max-w-4xl mx-auto py-16 px-6">
      {/* Navigation */}
      <Link href="/blog" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-emerald-600 mb-12 transition-all">
        <ChevronLeft size={16} /> Back to Insights
      </Link>

      {/* Hero Image */}
      {post.image_url && (
        <div className="relative w-full h-[400px] mb-12 rounded-[3rem] overflow-hidden shadow-2xl border border-gray-100">
          <Image 
            src={post.image_url} 
            alt={post.title} 
            fill 
            className="object-cover"
            priority
          />
        </div>
      )}

      <header className="mb-12">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
            <Tag size={12} /> {post.category}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <Calendar size={12} /> {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Recent'}
          </span>
        </div>
        
        <h1 className="text-5xl md:text-8xl font-black mb-10 tracking-tighter uppercase italic leading-[0.85] text-gray-900">
          {post.title}
        </h1>

        {post.author && (
          <div className="flex items-center gap-4 p-2 pr-6 bg-white rounded-full w-fit border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-full overflow-hidden relative bg-emerald-100 border-2 border-white shadow-sm">
              {post.author.avatar_url ? (
                <Image src={post.author.avatar_url} alt="" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-600 font-black text-xs">
                  {post.author.name[0]}
                </div>
              )}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Insight by <span className="text-gray-900">{post.author.name}</span>
            </p>
          </div>
        )}
      </header>

      {/* Article Content */}
      <div 
        className="prose prose-xl max-w-none prose-emerald 
                   prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter prose-headings:text-gray-900
                   prose-p:text-gray-600 prose-p:leading-[1.8] prose-p:font-medium
                   prose-strong:text-gray-900 prose-strong:font-black
                   prose-img:rounded-[2.5rem] prose-img:shadow-xl
                   prose-blockquote:border-emerald-500 prose-blockquote:bg-emerald-50/50 prose-blockquote:p-6 prose-blockquote:rounded-3xl prose-blockquote:italic"
        dangerouslySetInnerHTML={{ __html: formatContent(post.content) }}
      />

      {/* Footer CTA */}
      <footer className="mt-20 p-12 bg-gray-900 rounded-[3rem] text-center">
        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">Ready to start your project?</h3>
        <p className="text-gray-400 font-medium mb-8">Work with experts like {post.author?.name || 'our team'} today.</p>
        <Link 
          href="/order" 
          className="inline-block bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-white hover:text-emerald-600 transition-all shadow-xl shadow-emerald-500/20"
        >
          Hire an Expert
        </Link>
      </footer>
    </article>
  );
}