"use client";

import FadeIn from "@/components/ui/FadeIn";
import Footer from "@/components/layout/Footer";
import { ShieldCheck, Monitor, Clock, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";

export default function LMSPage() {
  const benefits = [
    { title: "Discussion Boards", desc: "Thoughtful, high-quality responses to peer posts.", icon: <Monitor className="text-emerald-600" /> },
    { title: "Weekly Quizzes", desc: "Timely completion of all module assessments.", icon: <CheckCircle2 className="text-emerald-600" /> },
    { title: "Grade Monitoring", desc: "We aim for nothing less than an A or B.", icon: <ShieldCheck className="text-emerald-600" /> },
    { title: "Deadline Defense", desc: "Zero late submissions. We work ahead of schedule.", icon: <Clock className="text-emerald-600" /> },
  ];

  return (
    <main className="bg-white">
      {/* Hero Section */}
      <FadeIn>
        <section className="py-20 px-4 text-center max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
              <Lock size={16} /> 100% Encrypted & Private Access
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6">
            Complete <span className="text-emerald-600">LMS & Portal</span> Management
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Stop stressing over weekly logins. We handle your Canvas, Moodle, Blackboard, 
            or University Portals so you can focus on your life and career.
          </p>
        </section>
      </FadeIn>

      {/* Value Grid */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          {benefits.map((b, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4">{b.icon}</div>
                <h3 className="font-bold text-lg mb-2">{b.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{b.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* How it Works (Security Focus) */}
      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-black mb-8">How we handle your <span className="text-emerald-600">Privacy</span></h2>
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-bold text-xl mb-1">Encrypted Credentials</h4>
                  <p className="text-gray-600">Your login details are stored in an encrypted database and only accessible by your assigned expert writer.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-2xl items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-bold text-xl mb-1">VPN-Protected Logins</h4>
                  <p className="text-gray-600">We use local IP matching to ensure your university doesn't flag "suspicious login locations."</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-bold">3</div>
                <div>
                  <h4 className="font-bold text-xl mb-1">Weekly Reporting</h4>
                  <p className="text-gray-600">Every Sunday, you receive a summary of all posts made, quizzes taken, and current grades.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-emerald-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-6">Portal Pricing</h3>
                <p className="mb-8 text-emerald-100">LMS management is custom-billed based on the number of modules and duration.</p>
                <div className="space-y-4 mb-10">
                    <div className="flex justify-between border-b border-emerald-800 pb-2"><span>Monthly Retainer</span><span className="font-bla">From ₦50k</span></div>
                    <div className="flex justify-between border-b border-emerald-800 pb-2"><span>Full Semester</span><span className="font-bold text-emerald-400 italic font-black">SAVE 15%</span></div>
                    <div className="flex justify-between border-b border-emerald-800 pb-2"><span>Single Module</span><span className="font-bold">Contact Us</span></div>
                </div>
                <Link href="/order?service=LMS" className="w-full btn-primary bg-white text-emerald-900 hover:bg-emerald-50 text-center block py-4 rounded-2xl">
                    Get Custom Quote
                </Link>
            </div>
            {/* Background design element */}
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-emerald-800 rounded-full opacity-50 blur-3xl"></div>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  );
}