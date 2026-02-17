"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, GraduationCap, User, LayoutDashboard, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoaded, setAuthLoaded] = useState(false); // New: prevents flickering
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoaded(true);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    setIsOpen(false);
  };

  const navLinks = [
    { name: "Experts", href: "/experts" },
    { name: "LMS Support", href: "/lms" },
    { name: "Specialized", href: "/special-services" },
    { name: "Insights", href: "/blog" },
  ];

  return (
    <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-24 items-center">
          
          <div className="shrink-0 flex items-center">
            <Link href="/" className="text-3xl font-black text-gray-900 tracking-tighter italic uppercase">
              uniSupport<span className="text-emerald-500">.</span>
            </Link>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex space-x-10 items-center">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all relative group ${
                  pathname === link.href ? "text-emerald-600" : "text-gray-400 hover:text-gray-900"
                }`}
              >
                {link.name}
                <span className={`absolute -bottom-2 left-0 h-1 bg-emerald-500 transition-all rounded-full ${pathname === link.href ? "w-6" : "w-0 group-hover:w-4"}`}></span>
              </Link>
            ))}

            {/* STRICT AUTH CHECK: Only show Vault if user.id exists */}
            {authLoaded && user?.id ? (
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                  pathname === "/dashboard" ? "text-emerald-600" : "text-gray-400 hover:text-gray-900"
                }`}
              >
                <LayoutDashboard size={14} /> My Vault
              </Link>
            ) : authLoaded ? (
              <Link
                href="/auth"
                className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-900 flex items-center gap-2"
              >
                <User size={14} /> Login
              </Link>
            ) : null}
            
            <Link
              href="/order"
              className="bg-gray-900 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-xl shadow-gray-200"
            >
              Start Project
            </Link>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-3 rounded-2xl bg-gray-50 text-gray-900">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 top-24 bg-white z-40 px-6 py-10 overflow-y-auto">
          <div className="space-y-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block text-4xl font-black uppercase italic tracking-tighter ${pathname === link.href ? "text-emerald-600" : "text-gray-900"}`}
              >
                {link.name}
              </Link>
            ))}

            <div className="pt-6 border-t border-gray-100">
              {user?.id ? (
                <div className="space-y-6">
                  <Link href="/dashboard" onClick={() => setIsOpen(false)} className="block text-4xl font-black uppercase italic tracking-tighter text-emerald-600">
                    My Vault
                  </Link>
                  <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-red-500">
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              ) : (
                <Link href="/auth" onClick={() => setIsOpen(false)} className="block text-4xl font-black uppercase italic tracking-tighter text-gray-400">
                  Login
                </Link>
              )}
            </div>
            
            <div className="pt-10">
              <Link href="/order" onClick={() => setIsOpen(false)} className="flex items-center justify-center w-full py-6 bg-emerald-600 text-white rounded-4xl text-lg font-black uppercase tracking-widest">
                Hire an Expert Now
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}