import React from 'react';

export default function InfoSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <section className="py-20 px-6 max-w-4xl mx-auto">
      <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-10 border-b-4 border-emerald-500 pb-4">
        {title}
      </h1>
      <div className="prose prose-lg max-w-none">
        {children}
      </div>
    </section>
  );
}