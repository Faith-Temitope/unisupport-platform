import { posts } from "@/lib/blog-data";
import Link from "next/link";
import { notFound } from "next/navigation";

// Next.js 15+ requires params to be a Promise
type Props = {
  params: Promise<{ slug: string }>;
};

export default async function BlogPost({ params }: Props) {
  // We MUST await the params in modern Next.js
  const { slug } = await params;
  
  const post = posts.find((p) => p.slug === slug);

  if (!post) notFound();

  return (
    <article className="max-w-3xl mx-auto py-20 px-4 animate-in fade-in duration-700">
      <Link 
        href="/blog" 
        className="text-emerald-600 font-bold mb-8 inline-flex items-center gap-2 hover:gap-3 transition-all"
      >
        ← Back to Insights
      </Link>
      
      <header className="mb-12">
        <span className="text-emerald-600 font-bold tracking-widest uppercase text-xs bg-emerald-50 px-3 py-1 rounded-full">
          {post.category}
        </span>
        <h1 className="text-4xl md:text-5xl font-black mt-6 mb-6 leading-tight text-gray-900">
          {post.title}
        </h1>
        
        <div className="flex items-center gap-4 text-gray-500 border-b border-gray-100 pb-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-100">
            US
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">uniSupport Editorial</p>
            <p className="text-xs font-medium">{post.date} • 5 min read</p>
          </div>
        </div>
      </header>

      {/* Fixed image height to 400px and added better styling */}
      <div className="relative h-[400px] mb-12 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <img 
          src={post.image} 
          alt={post.title} 
          className="w-full h-full object-cover" 
        />
      </div>

      <div className="prose prose-lg prose-emerald max-w-none text-gray-700 leading-relaxed">
        <p className="text-xl font-semibold text-gray-800 mb-8 border-l-4 border-emerald-500 pl-6 py-2 bg-gray-50 rounded-r-xl">
          {post.excerpt}
        </p>
        
        <div className="space-y-6">
            <p>
              When writing a project in Nigeria, you must adhere to the specific guidelines provided by your department. 
              Usually, this involves five chapters: Introduction, Literature Review, Methodology, Results, and Conclusion.
            </p>
            
            <h3 className="text-2xl font-bold text-gray-900 mt-8">The Modern Research Approach</h3>
            <p>
              In 2026, academia has shifted. It is no longer enough to just compile old data. 
              Reviewers are looking for <strong>primary research</strong> and the use of modern analytical tools. 
              At uniSupport, we ensure your work reflects these current standards.
            </p>
        </div>
      </div>

      {/* The CTA Funnel - Enhanced with better "vibe" */}
      <div className="mt-20 p-10 bg-gray-900 rounded-[3rem] text-center relative overflow-hidden">
        <div className="relative z-10">
            <h3 className="text-3xl font-bold mb-4 text-white">Stuck on your {post.category} project?</h3>
            <p className="text-emerald-100/80 mb-8 max-w-md mx-auto">
              Don't risk your grades. Our experts handle the heavy lifting while you focus on your exams.
            </p>
            <Link href="/order" className="btn-primary inline-block px-10 py-4 active:scale-95">
              Get Expert Help Now
            </Link>
        </div>
        {/* Background glow for the dark CTA */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full"></div>
      </div>
    </article>
  );
}