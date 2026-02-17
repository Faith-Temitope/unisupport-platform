import { Scale, CreditCard, FileWarning, HelpCircle, ShieldAlert, History } from "lucide-react";

export default function TermsOfService() {
  const lastUpdated = "February 15, 2026";

  return (
    <main className="bg-white pt-32 pb-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-16 border-b border-gray-100 pb-12">
          <div className="flex items-center gap-3 text-emerald-600 mb-6">
            <Scale size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Operational Framework</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter uppercase italic leading-[0.85] mb-8">
            Terms of <br /><span className="text-emerald-500">Operation.</span>
          </h1>
          <p className="text-xl text-gray-500 font-medium italic max-w-2xl">
            By engaging uniSupport, you enter a binding agreement for high-level research consultancy. Please review our protocols carefully.
          </p>
        </div>

        {/* Quick Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="p-6 bg-gray-900 rounded-4xl text-white">
            <CreditCard className="text-emerald-400 mb-4" size={24} />
            <h4 className="text-xs font-black uppercase tracking-widest mb-2 italic">Payment</h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase leading-relaxed">50% Deposit Required. Balance before final file delivery.</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-4xl border border-gray-100">
            <History className="text-emerald-600 mb-4" size={24} />
            <h4 className="text-xs font-black uppercase tracking-widest mb-2 italic">Revisions</h4>
            <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed">Free adjustments within 7 days of delivery.</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-4xl border border-gray-100">
            <ShieldAlert className="text-emerald-600 mb-4" size={24} />
            <h4 className="text-xs font-black uppercase tracking-widest mb-2 italic">Usage</h4>
            <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed">Models intended for research assistance only.</p>
          </div>
        </div>

        {/* Detailed Clauses */}
        <div className="space-y-16">
          <section>
            <h2 className="text-2xl font-black uppercase italic tracking-tight text-gray-900 mb-6 flex items-center gap-3">
              <span className="text-emerald-500 text-sm font-black italic">01.</span> Nature of Service
            </h2>
            <div className="prose prose-emerald text-gray-600 max-w-none font-medium leading-relaxed space-y-4">
              <p>
                uniSupport provides custom-written research models, data analysis, and technical documentation. These materials are intended to serve as <strong>foundational drafts</strong> or <strong>comprehensive study guides</strong>. 
              </p>
              <p>
                The Client assumes full responsibility for how they utilize the provided research within their respective academic or professional institutions. uniSupport does not endorse or facilitate academic dishonesty.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase italic tracking-tight text-gray-900 mb-6 flex items-center gap-3">
              <span className="text-emerald-500 text-sm font-black italic">02.</span> Financial Commitment
            </h2>
            <div className="prose prose-emerald text-gray-600 max-w-none font-medium leading-relaxed space-y-4">
              <ul className="list-none space-y-4">
                <li className="flex gap-4">
                  <span className="text-emerald-500 font-black italic text-xs">A.</span>
                  <span><strong>Deposit:</strong> A non-refundable deposit of 50% is mandatory to secure an expert and commence research.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-emerald-500 font-black italic text-xs">B.</span>
                  <span><strong>Final Release:</strong> Upon completion, a blurred or partial preview will be provided. The remaining 50% balance must be cleared before the full, unencrypted document is released.</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase italic tracking-tight text-gray-900 mb-6 flex items-center gap-3">
              <span className="text-emerald-500 text-sm font-black italic">03.</span> Revision & Quality Guarantee
            </h2>
            <div className="prose prose-emerald text-gray-600 max-w-none font-medium leading-relaxed space-y-4">
              <p>
                We offer <strong>unlimited free revisions</strong> for up to 7 days following the initial delivery, provided the revision requests do not deviate from the original project instructions. 
              </p>
              <p>
                Changes to the core topic, additional page requirements, or new source materials added after the project has started will incur a "Scope Modification" fee.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase italic tracking-tight text-gray-900 mb-6 flex items-center gap-3">
              <span className="text-emerald-500 text-sm font-black italic">04.</span> LMS & Long-term Support
            </h2>
            <div className="prose prose-emerald text-gray-600 max-w-none font-medium leading-relaxed space-y-4">
              <p>
                For LMS (Learning Management System) services, uniSupport acts as a technical assistant. The Client is responsible for providing stable login credentials. We are not liable for institutional portal downtime or changes in university grading rubrics mid-semester.
              </p>
            </div>
          </section>

          {/* Refund Policy Highlight */}
          <section className="p-10 bg-emerald-50 rounded-[3rem] border border-emerald-100">
            <h2 className="text-2xl font-black uppercase italic tracking-tight text-emerald-900 mb-6 flex items-center gap-3">
              <FileWarning size={24} /> Refund Policy
            </h2>
            <p className="text-emerald-800 text-sm font-medium leading-relaxed">
              Refunds are only considered in the event of a total failure to deliver the service by the agreed-upon deadline. Once a project is completed and delivered according to specifications, no refunds will be issued due to the bespoke and intellectual nature of the work.
            </p>
          </section>
        </div>

        {/* Support CTA */}
        <div className="mt-20 text-center">
            <p className="text-gray-400 text-xs font-bold uppercase mb-6">Confused about a clause?</p>
            <a href="https://wa.me/2349131352366" className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all">
                Speak with Legal Support <HelpCircle size={14} />
            </a>
            <p className="mt-12 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              © 2026 UNISUPPORT ACADEMIC CONSULTANCY • VERSION 4.1-TERMS
            </p>
        </div>
      </div>
    </main>
  );
}