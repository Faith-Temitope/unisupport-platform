/* eslint-disable @next/next/no-img-element -- sponsor logos are arbitrary https URLs */
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

// Public certificate verification page: anyone with the link can confirm a Birdie certificate.
export const dynamic = "force-dynamic";
type Cert = { code: string; name: string; title: string; sponsor: string; sponsor_logo: string | null; score_pct: number; issued_at: string };

async function load(code: string): Promise<Cert | null> {
  if (!/^BC-[A-F0-9]{8}$/i.test(code)) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data } = await sb.rpc("verify_certificate", { p_code: code });
  return (data as Cert) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const c = await load((await params).code);
  return c ? { title: `${c.name} · ${c.title} certificate`, description: `Issued by ${c.sponsor} on Birdie. Certificate ${c.code}.` } : { title: "Certificate not found · Birdie" };
}

export default async function CertPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const c = await load(code);
  return (
    <main className="flex min-h-[100dvh] items-start justify-center bg-[#F4EFF8] px-4 py-10 text-[#1a1024]" style={{ fontFamily: "system-ui, sans-serif" }}>
      {!c ? (
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-[20px] font-bold">Certificate not found</h1>
          <p className="mt-2 text-[14px] text-[#6E6480]">No Birdie certificate has the code <b>{code}</b>. Check the code and try again.</p>
        </div>
      ) : (
        <div className="w-full max-w-2xl rounded-3xl border-8 border-[#F1DDF8] bg-white p-8 text-center shadow-sm md:p-12">
          <div className="flex items-center justify-center gap-3">
            {c.sponsor_logo && <img src={c.sponsor_logo} alt="" className="h-12 w-12 rounded-xl object-cover" />}
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#C05BD6] to-[#8A2FA3] text-[20px] font-bold text-white">B</span>
          </div>
          <div className="mt-6 text-[12px] font-bold uppercase tracking-[0.25em] text-[#8b3fa6]">Certificate of completion</div>
          <div className="mt-4 text-[14px] text-[#6E6480]">This certifies that</div>
          <h1 className="mt-1 text-[30px] font-bold leading-tight md:text-[36px]">{c.name}</h1>
          <div className="mt-3 text-[14px] text-[#6E6480]">passed the exam for</div>
          <div className="mt-1 text-[20px] font-bold">{c.title}</div>
          <div className="mt-1 text-[14px] text-[#6E6480]">offered by {c.sponsor}, with a score of {c.score_pct}%</div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[12.5px] text-[#6E6480]">
            <span>Issued {new Date(c.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span>Certificate <b className="font-mono text-[#1a1024]">{c.code}</b></span>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#DDF5EC] px-3 py-1.5 text-[12px] font-bold text-[#0a7a56]">Verified by Birdie</div>
        </div>
      )}
    </main>
  );
}
