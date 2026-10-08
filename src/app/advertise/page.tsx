import type { Metadata } from "next";
import AdvertiseForm from "./AdvertiseForm";

export const metadata: Metadata = {
  title: "List your business on Birdie",
  description: "Food spots, print shops, hostels and repair shops near campus: show up for students at the school next to you, with a student offer.",
};

const STEPS = [
  ["Tell us about your business", "Two minutes. No account needed."],
  ["We call you on WhatsApp", "We agree your student offer and the monthly fee, and set it up for you."],
  ["Students near you find you", "Your listing shows in Birdie for students at the school you serve, with your offer and a WhatsApp button."],
];

export default function AdvertisePage() {
  return (
    <main className="min-h-[100dvh] bg-[#F4EFF8] px-4 py-10 text-[#1a1024]" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#C05BD6] to-[#8A2FA3] text-[16px] font-bold text-white">B</span>
          <span className="text-[20px] font-bold">Birdie</span>
        </div>
        <h1 className="text-[30px] font-bold leading-tight md:text-[36px]">Get your business in front of students on campus</h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-[#4a3a5e]">Birdie is the app students use to study: their notes, past questions and exam prep. List your food spot, print shop, hostel or repair shop, and you show up for students at the school next to you, right where they look for places near campus.</p>

        <div className="mt-7 space-y-3">{STEPS.map(([t, d], i) => (
          <div key={t} className="flex gap-3 rounded-2xl bg-white p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1a1024] text-[13px] font-bold text-white">{i + 1}</span>
            <div><div className="text-[15px] font-bold">{t}</div><div className="text-[13.5px] text-[#6E6480]">{d}</div></div>
          </div>
        ))}</div>

        <div className="mt-7 rounded-2xl bg-white p-4 text-[13.5px] leading-relaxed text-[#4a3a5e]">
          <b className="text-[#1a1024]">What you get:</b> your listing and student offer in Birdie for the school you serve, a WhatsApp button straight to you, and a monthly count of how many students saw your listing and tapped it. Every listing is clearly marked as sponsored.
        </div>

        <AdvertiseForm />
        <p className="mt-6 text-center text-[12px] text-[#6E6480]">Birdie is built by Unisupport. Questions? Mention them in the form and we&apos;ll answer when we call.</p>
      </div>
    </main>
  );
}
