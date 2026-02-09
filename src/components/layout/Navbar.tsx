"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation"; // Essential for active states

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname(); // Tracks current URL

  const navLinks = [
    { name: "Services", href: "/#services" }, // Fixed: Works from any page
    { name: "LMS Support", href: "/lms" },
    { name: "Specialized", href: "/special-services" },
    { name: "Blog", href: "/blog" },
  ];

  return (
    <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <div className="shrink-0 flex items-center">
            <Link href="/" className="text-2xl font-black text-emerald-700 tracking-tighter active:scale-95 transition-transform">
              uniSupport<span className="text-emerald-500">.</span>
            </Link>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex space-x-8 items-center">
            {navLinks.map((link) => {
              // Check if link is active
              const isActive = pathname === link.href;
              
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`font-bold text-sm transition-all duration-200 relative group ${
                    isActive ? "text-emerald-600" : "text-gray-500 hover:text-emerald-600"
                  }`}
                >
                  {link.name}
                  {/* Decorative underline for active/hover */}
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-emerald-500 transition-all duration-300 ${isActive ? "w-full" : "w-0 group-hover:w-full"}`}></span>
                </Link>
              );
            })}
            <Link
              href="/order"
              className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-100"
            >
              Start Project
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 overflow-hidden animate-in slide-in-from-top duration-300">
          <div className="px-4 pt-2 pb-6 space-y-2 sm:px-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-3 text-lg font-bold rounded-xl transition-colors ${
                    isActive ? "bg-emerald-50 text-emerald-600" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <div className="pt-4 px-4">
              <Link
                href="/order"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-md"
              >
                Start Project Now
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}