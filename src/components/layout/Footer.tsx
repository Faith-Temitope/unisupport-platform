import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-20 pb-10 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        {/* Brand Column */}
        <div className="col-span-1 md:col-span-1">
          <Link href="/" className="text-2xl font-black text-white mb-6 block tracking-tighter">
            uniSupport<span className="text-emerald-500">.</span>
          </Link>
          <p className="text-sm leading-relaxed text-gray-400">
            Premium academic and professional writing support for the next generation of African leaders and researchers.
          </p>
        </div>
        
        {/* Services Column */}
        <div>
          <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Services</h4>
          <ul className="space-y-4 text-sm">
            <li><Link href="/order?service=Standard" className="hover:text-emerald-400 transition-colors">Academic Research</Link></li>
            <li><Link href="/lms" className="hover:text-emerald-400 transition-colors">LMS Management</Link></li>
            <li><Link href="/special-services" className="hover:text-emerald-400 transition-colors">Specialized Projects</Link></li>
            <li><Link href="/order?service=Special" className="hover:text-emerald-400 transition-colors">Business Pitch Decks</Link></li>
          </ul>
        </div>

        {/* Company Column */}
        <div>
          <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Legal & Links</h4>
          <ul className="space-y-4 text-sm">
            <li><Link href="/blog" className="hover:text-emerald-400 transition-colors">Insights Blog</Link></li>
            <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>

        {/* Contact Column */}
        <div>
          <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Contact</h4>
          <p className="text-sm mb-2 font-medium">Lagos, Nigeria</p>
          <p className="text-xs text-gray-500 mb-6 italic">Serving students nationwide.</p>
          <a 
            href="https://wa.me/2349131352366" 
            className="inline-block bg-emerald-600/10 text-emerald-400 px-4 py-2 rounded-lg font-bold hover:bg-emerald-600 hover:text-white transition-all text-sm"
          >
            Chat on WhatsApp
          </a>
        </div>
      </div>
      
      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-xs text-gray-500">
          © 2026 uniSupport Academic Services. All rights reserved.
        </div>
        
        {/* Subtle Staff Link */}
        <div className="flex gap-6 items-center">
            <Link href="/admin/login" className="text-[10px] text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold">
              Staff Portal
            </Link>
        </div>
      </div>
    </footer>
  );
}