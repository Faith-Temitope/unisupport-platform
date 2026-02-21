"use client";

import Link from "next/link";
import { MessageCircle, Globe, Shield, ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-24 pb-12 px-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full"></div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
        
        <div className="md:col-span-4">
          <Link href="/" className="text-3xl font-black text-white mb-8 block tracking-tighter italic uppercase">
            uniSupport<span className="text-emerald-500">.</span>
          </Link>
          <p className="text-sm leading-relaxed text-gray-400 font-medium italic mb-8 max-w-sm">
            The definitive model research consultancy for the next generation of African leaders, researchers, and high-achievers.
          </p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-emerald-400">
               <Shield size={12} /> SECURE 256-BIT
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-blue-400">
               <Globe size={12} /> GLOBAL OPS
            </div>
          </div>
        </div>
        
        <div className="md:col-span-2">
          <h4 className="text-white font-black mb-8 uppercase text-[10px] tracking-[0.3em] italic">Solutions</h4>
          <ul className="space-y-4 text-xs font-bold uppercase tracking-widest">
            <li><Link href="/order" className="hover:text-emerald-400 transition-colors flex items-center gap-1 group">Research Services <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" /></Link></li>
            <li><Link href="/lms" className="hover:text-emerald-400 transition-colors flex items-center gap-1 group">LMS Support <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" /></Link></li>
            <li><Link href="/experts" className="hover:text-emerald-400 transition-colors flex items-center gap-1 group">Meet Experts <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" /></Link></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h4 className="text-white font-black mb-8 uppercase text-[10px] tracking-[0.3em] italic">Knowledge</h4>
          <ul className="space-y-4 text-xs font-bold uppercase tracking-widest">
            <li><Link href="/about" className="hover:text-emerald-400 transition-colors">About Us</Link></li>
            <li><Link href="/faq" className="hover:text-emerald-400 transition-colors">Support FAQ</Link></li>
            <li><Link href="/blog" className="hover:text-emerald-400 transition-colors">Insights Blog</Link></li>
            <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Vault</Link></li>
            <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Op</Link></li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <h4 className="text-white font-black mb-8 uppercase text-[10px] tracking-[0.3em] italic">Direct Line</h4>
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
            <p className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Lagos HQ • Available Nationwide</p>
            <a 
              href="https://wa.me/2349052740695" 
              className="flex items-center justify-center gap-3 bg-emerald-500 text-white w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/10"
            >
              <MessageCircle size={18} /> Chat with Admin
            </a>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
          © 2026 UNISUPPORT ACADEMIC CONSULTANCY. ALL RIGHTS RESERVED.
        </div>
        
        <div className="flex gap-8 items-center">
            <Link href="/admin/login" className="text-[10px] text-gray-600 hover:text-emerald-500 uppercase tracking-widest font-black transition-colors">
              Expert Portal
            </Link>
            <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50">Systems Operational</span>
            </div>
        </div>
      </div>
    </footer>
  );
}