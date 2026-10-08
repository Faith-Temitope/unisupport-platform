import type { Metadata } from "next";
import InternshipForm from "./InternshipForm";

export const metadata: Metadata = {
  title: "Offer internships and SIWES on Birdie",
  description: "Reach university students looking for internships and SIWES placements. Tell us the role and we'll put it in front of the right students.",
};

const STEPS = [
  ["Tell us about the role", "Two minutes. No account needed."],
  ["We confirm the details", "We call or WhatsApp you to check the role, who it's for and how to apply."],
  ["Students apply to you", "It shows under Internships & SIWES for students in the right school and area, until your deadline."],
];

export default function InternshipsPage() {
  return (
    <main className="min-h-[100dvh] bg-[#F4EFF8] px-4 py-10 text-[#1a1024]" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#C05BD6] to-[#8A2FA3] text-[16px] font-bold text-white">B</span>
          <span className="text-[20px] font-bold">Birdie</span>
        </div>
        <h1 className="text-[30px] font-bold leading-tight md:text-[36px]">Find interns and SIWES students</h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-[#4a3a5e]">Birdie is the study app university students use every day. Post your internship or SIWES placement and it shows up for students in the schools, courses and areas you choose.</p>
        <div className="mt-7 space-y-3">{STEPS.map(([t, d], i) => (
          <div key={t} className="flex gap-3 rounded-2xl bg-white p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1a1024] text-[13px] font-bold text-white">{i + 1}</span>
            <div><div className="text-[15px] font-bold">{t}</div><div className="text-[13.5px] text-[#6E6480]">{d}</div></div>
          </div>
        ))}</div>
        <InternshipForm />
        <p className="mt-6 text-center text-[13px] text-[#6E6480]">Run a shop near campus instead? <a href="/advertise" className="font-semibold text-[#8A2FA3] underline">List your business</a></p>
      </div>
    </main>
  );
}
