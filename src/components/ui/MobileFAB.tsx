"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function MobileFAB() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button only after scrolling down 200px to keep hero clean
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  return (
    <Link 
      href="/order" 
      className={`md:hidden fixed bottom-8 right-6 z-[60] flex flex-col items-center gap-2 transition-all duration-500 transform ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      }`}
    >
      {/* Tooltip-style label */}
      <span className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
        Start Project
      </span>
      
      {/* The Actual Button */}
      <div className="bg-emerald-600 text-white w-16 h-16 rounded-full shadow-[0_10px_40px_rgba(16,185,129,0.4)] flex items-center justify-center border-4 border-white active:scale-90 transition-transform">
        <Plus size={32} strokeWidth={3} />
      </div>
    </Link>
  );
}