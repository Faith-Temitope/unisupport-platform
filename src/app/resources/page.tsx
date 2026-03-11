"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { FileText, Download, Search, Loader2, Eye, X } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FadeIn from "@/components/ui/FadeIn";
import DownloadGate from "@/components/resources/DownloadGate";
import Link from "next/link";

export default function TemplateLibrary() {
  const supabase = createClient();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  
  // MODAL STATES
  const [activeTemplate, setActiveTemplate] = useState<any>(null); // For DownloadGate
  const [previewTemplate, setPreviewTemplate] = useState<any>(null); // For Quick Preview

  useEffect(() => {
    async function fetchTemplates() {
      const { data } = await supabase.from("templates").select("*").order("created_at", { ascending: false });
      if (data) setTemplates(data);
      setLoading(false);
    }
    fetchTemplates();
  }, [supabase]);

  const categories = ["All", "Thesis", "Essay", "Case Study", "Business Plan", "Lab Report"];
  
  const filtered = templates.filter(t => 
    (activeCategory === "All" || t.category === activeCategory) &&
    (t.title.toLowerCase().includes(search.toLowerCase()))
  );

  const executeDownload = () => {
    if (activeTemplate) {
      const link = document.createElement("a");
      link.href = activeTemplate.file_url;
      link.setAttribute("download", activeTemplate.title);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setActiveTemplate(null);
    }
  };

  return (
    <main className="bg-white min-h-screen">
      {/* 1. PREVIEW MODAL (The Peek) */}
      {previewTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-xl" onClick={() => setPreviewTemplate(null)} />
          <div className="relative w-full max-w-5xl bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{previewTemplate.category}</span>
                <h2 className="text-xl font-black uppercase italic tracking-tight">{previewTemplate.title} — Preview</h2>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="p-3 bg-gray-50 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
              {previewTemplate.preview_url ? (
                <img 
                  src={previewTemplate.preview_url} 
                  alt="Preview" 
                  className="w-full h-auto rounded-2xl shadow-lg border border-gray-200"
                />
              ) : (
                <div className="bg-white p-12 rounded-3xl border border-gray-200 shadow-sm min-h-[600px] whitespace-pre-wrap font-serif text-gray-700 leading-relaxed">
                  {/* Fallback to text content if no image exists */}
                  {previewTemplate.content_preview || "Detailed structure preview loading..."}
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="p-8 border-t border-gray-100 bg-white flex flex-col md:flex-row gap-4 items-center justify-between">
              <p className="text-xs text-gray-400 italic font-bold">Ready to use this blueprint for your project?</p>
              <button 
                onClick={() => {
                  setPreviewTemplate(null);
                  setActiveTemplate(previewTemplate);
                }}
                className="w-full md:w-auto px-12 py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-gray-900 transition-all flex items-center justify-center gap-3"
              >
                Unlock Full Access <Download size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DOWNLOAD GATE MODAL */}
      {activeTemplate && (
        <DownloadGate 
          template={activeTemplate} 
          onClose={() => setActiveTemplate(null)} 
          onUnlock={executeDownload} 
        />
      )}
      
      {/* Header Section */}
      <section className="pt-40 pb-16 px-4 border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="flex flex-col md:flex-row justify-between items-end gap-8">
              <div className="max-w-2xl">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600 mb-4 block">Open Source Intelligence</span>
                <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-[0.85] text-gray-900">
                  The <span className="text-emerald-600">Template</span> <br /> Blueprint.
                </h1>
              </div>
              <div className="w-full md:w-80 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  value={search}
                  placeholder="Search frameworks..." 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 ring-emerald-500 transition-all"
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="sticky top-[96px] z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 py-4 px-4">
        <div className="max-w-7xl mx-auto flex gap-4 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeCategory === cat ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Section */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((template, i) => (
              <FadeIn key={template.id} delay={i * 0.05}>
                <div className="group bg-white border border-gray-100 rounded-[3rem] p-8 hover:shadow-2xl hover:border-emerald-100 transition-all duration-500">
                  <div className="w-full aspect-[4/3] bg-gray-50 rounded-[2rem] mb-6 overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:scale-110 transition-transform duration-700">
                        <FileText size={80} className="text-gray-900" />
                    </div>
                    {/* Floating Preview Button */}
                    <button 
                      onClick={() => setPreviewTemplate(template)}
                      className="absolute top-6 right-6 p-4 bg-white rounded-2xl shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 text-emerald-600 hover:bg-gray-900 hover:text-white"
                    >
                      <Eye size={20} />
                    </button>
                    <div className="absolute top-6 left-6 px-4 py-1.5 bg-white/90 backdrop-blur rounded-full text-[9px] font-black uppercase tracking-widest">
                        {template.category}
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-black uppercase italic tracking-tight mb-2 truncate group-hover:text-emerald-600 transition-colors">
                    {template.title}
                  </h3>
                  <p className="text-gray-400 text-xs font-medium mb-8 line-clamp-2 italic">
                    {template.description || "Professional academic structure and formatting guide."}
                  </p>
                  
                  <button 
                    onClick={() => setActiveTemplate(template)}
                    className="flex items-center justify-between w-full p-6 bg-gray-50 group-hover:bg-emerald-600 group-hover:text-white rounded-2xl transition-all duration-300"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">Download Asset</span>
                    <Download size={18} />
                  </button>
                </div>
              </FadeIn>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-40 border-2 border-dashed border-gray-100 rounded-[4rem]">
            <p className="text-gray-300 font-black uppercase tracking-widest italic">No blueprints found in this category.</p>
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto bg-emerald-600 rounded-[4rem] p-12 md:p-24 text-center text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-8">
              Need a custom <br /> build instead?
            </h2>
            <p className="text-emerald-100 text-lg md:text-xl max-w-xl mx-auto mb-12 font-medium italic">
              Templates are a start. Our experts provide the finished masterpiece. 
              Let us handle the research and writing while you focus on the defense.
            </p>
            <Link 
              href="/order" 
              className="inline-block bg-white text-emerald-600 px-12 py-6 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all shadow-xl"
            >
              Start Your Project
            </Link>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        </div>
      </section>

      <Footer />
    </main>
  );
}