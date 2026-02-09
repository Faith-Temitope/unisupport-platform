import Link from "next/link";
import { posts } from "@/lib/blog-data";

export default function BlogPage() {
  return (
    <div className="max-w-7xl mx-auto py-16 px-4">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4">uniSupport <span className="text-emerald-600">Insights</span></h1>
        <p className="text-xl text-gray-600">Free guides on academic writing, project research, and career growth.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {posts.map((post) => (
          <article key={post.id} className="group cursor-pointer">
            <Link href={`/blog/${post.slug}`}>
              <div className="relative h-64 mb-6 overflow-hidden rounded-3xl bg-gray-100">
                <img 
                  src={post.image} 
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <span className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-emerald-700">
                  {post.category}
                </span>
              </div>
              <h2 className="text-2xl font-bold mb-3 group-hover:text-emerald-600 transition-colors leading-tight">
                {post.title}
              </h2>
              <p className="text-gray-600 mb-4 line-clamp-2">
                {post.excerpt}
              </p>
              <div className="flex items-center text-sm font-medium text-gray-400">
                <span>{post.date}</span>
                <span className="mx-2">•</span>
                <span className="text-emerald-600 font-bold">Read Article →</span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}