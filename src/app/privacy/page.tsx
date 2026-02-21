import { ShieldCheck, Lock, EyeOff, UserCheck, RefreshCw, Globe } from "lucide-react";

export default function PrivacyPolicy() {
  const lastUpdated = "February 15, 2026";

  return (
    <main className="bg-white pt-32 pb-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-16 border-b border-gray-100 pb-12">
          <div className="flex items-center gap-3 text-emerald-600 mb-6">
            <Lock size={20} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Privacy Vault Protocol</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter uppercase italic leading-[0.85] mb-8">
            Privacy <br /><span className="text-emerald-500">Policy.</span>
          </h1>
          <p className="text-xl text-gray-500 font-medium italic max-w-2xl">
            This document outlines our uncompromising commitment to your anonymity and data sovereignty. At uniSupport, your privacy is our most valuable asset.
          </p>
        </div>

        {/* The 4 Pillars of Anonymity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
            <ShieldCheck className="text-emerald-600 mb-4" size={32} />
            <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Non-Disclosure</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              We operate under a universal NDA. No information regarding your identity or project scope is shared with academic institutions, third-party marketers, or government agencies.
            </p>
          </div>
          <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
            <EyeOff className="text-emerald-600 mb-4" size={32} />
            <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Writer Anonymity</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              Our experts never see your full name or university. Communication is handled via project IDs to prevent any "off-platform" data leakage.
            </p>
          </div>
        </div>

        {/* Detailed Clauses */}
        <div className="space-y-16">
          <section>
            <h2 className="text-2xl font-black uppercase italic tracking-tight text-gray-900 mb-6 flex items-center gap-3">
              <span className="text-emerald-500 text-sm font-black italic">01.</span> Data Collection & Usage
            </h2>
            <div className="prose prose-emerald text-gray-600 max-w-none font-medium leading-relaxed space-y-4">
              <p>
                To provide our specialized research services, we collect minimal personal identifiers, specifically: your WhatsApp number, name, and institutional affiliation. This data is used exclusively for <strong>Order Fulfillment</strong> and <strong>Priority Support</strong>.
              </p>
              <p>
                We do not use your data for automated profiling, behavioral advertising, or data brokerage.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase italic tracking-tight text-gray-900 mb-6 flex items-center gap-3">
              <span className="text-emerald-500 text-sm font-black italic">02.</span> Encryption & Security
            </h2>
            <div className="prose prose-emerald text-gray-600 max-w-none font-medium leading-relaxed space-y-4">
              <p>
                All data transmitted through uniSupport.com is protected via <strong>256-bit SSL (Secure Socket Layer) encryption</strong>. Our database is partitioned to ensure that payment records are stored separately from project files.
              </p>
              <p>
                Access to client records is restricted to senior admin staff only, authenticated via multi-factor security protocols.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase italic tracking-tight text-gray-900 mb-6 flex items-center gap-3">
              <span className="text-emerald-500 text-sm font-black italic">03.</span> The "Right to be Forgotten"
            </h2>
            <div className="prose prose-emerald text-gray-600 max-w-none font-medium leading-relaxed space-y-4">
              <p>
                We believe you should own your digital footprint. Our <strong>Scheduled Purge Policy</strong> ensures that all drafts, source materials, and discussion logs are permanently deleted 30 days after the project is marked "Completed" in our system.
              </p>
              <p>
                Clients may request an <strong>Instant Purge</strong> at any time by contacting our privacy officer via WhatsApp.
              </p>
            </div>
          </section>

          <section className="p-10 bg-gray-900 rounded-[3rem] text-white">
            <h2 className="text-2xl font-black uppercase italic tracking-tight mb-6">
              Third-Party Integrations
            </h2>
            <p className="text-gray-400 text-sm font-medium leading-relaxed mb-6">
              Our site utilizes the following secure third-party services:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-widest text-emerald-400">
              <li className="flex items-center gap-2 border border-white/10 p-4 rounded-2xl bg-white/5">
                <Globe size={14} /> Supabase (Encrypted DB)
              </li>
              <li className="flex items-center gap-2 border border-white/10 p-4 rounded-2xl bg-white/5">
                <RefreshCw size={14} /> WhatsApp Business API
              </li>
              <li className="flex items-center gap-2 border border-white/10 p-4 rounded-2xl bg-white/5">
                <UserCheck size={14} /> Secure Payment Gateways
              </li>
              <li className="flex items-center gap-2 border border-white/10 p-4 rounded-2xl bg-white/5">
                <Lock size={14} /> PXXL (Edge Security)
              </li>
            </ul>
          </section>
        </div>

        {/* Footer info */}
        <div className="mt-20 pt-12 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            Ref: USP-PRIVACY-V2.4 • Effective: {lastUpdated}
          </p>
          <div className="flex gap-4">
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Privacy Active</span>
          </div>
        </div>
      </div>
    </main>
  );
}