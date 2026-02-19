"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, User, LayoutDashboard, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";
import NotificationBell from "./NotificationBell"; // Import the bell

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Handle Auth
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

  // Lock body scroll when the modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

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
    <>
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 h-24 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full flex justify-between items-center">
          
          {/* LOGO */}
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
              </Link>
            ))}

            {authLoaded && user?.id && (
              <div className="flex items-center gap-4 border-l border-gray-100 pl-6">
                <NotificationBell /> {/* Desktop Notification Bell */}
                <Link href="/dashboard" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-900 flex items-center gap-2">
                  <LayoutDashboard size={14} /> My Vault
                </Link>
              </div>
            )}

            {!user?.id && authLoaded && (
              <Link href="/auth" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-900 flex items-center gap-2">
                <User size={14} /> Login
              </Link>
            )}
            
            <Link href="/order" className="bg-gray-900 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 shadow-xl transition-all">
              Start Project
            </Link>
          </div>

          {/* Mobile Right Icons */}
          <div className="md:hidden flex items-center gap-4">
            {user?.id && <NotificationBell />} {/* Mobile Notification Bell */}
            <button 
              onClick={() => setIsOpen(true)} 
              className="p-3 rounded-2xl bg-gray-50 text-gray-900 active:scale-90 transition-transform"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE MODAL OVERLAY */}
      <div 
        className={`fixed inset-0 z-[60] bg-white transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center h-24 px-6 border-b border-gray-50">
          <span className="text-2xl font-black italic uppercase">Menu</span>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-3 rounded-2xl bg-gray-900 text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex flex-col h-[calc(100vh-6rem)] p-8 overflow-y-auto">
          <div className="space-y-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block text-5xl font-black uppercase italic tracking-tighter ${
                  pathname === link.href ? "text-emerald-600" : "text-gray-900"
                }`}
              >
                {link.name}
              </Link>
            ))}

            <div className="pt-8 border-t border-gray-100">
              {user?.id ? (
                <div className="space-y-8">
                  <Link 
                    href="/dashboard" 
                    onClick={() => setIsOpen(false)} 
                    className="block text-5xl font-black uppercase italic tracking-tighter text-emerald-600"
                  >
                    My Vault
                  </Link>
                  <button 
                    onClick={handleLogout} 
                    className="flex items-center gap-4 text-xl font-black uppercase italic tracking-tighter text-red-500"
                  >
                    <LogOut size={24} /> Sign Out
                  </button>
                </div>
              ) : (
                <Link 
                  href="/auth" 
                  onClick={() => setIsOpen(false)} 
                  className="block text-5xl font-black uppercase italic tracking-tighter text-gray-300"
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          <div className="mt-auto pt-10">
            <Link 
              href="/order" 
              onClick={() => setIsOpen(false)} 
              className="flex items-center justify-center w-full py-8 bg-emerald-600 text-white rounded-[2rem] text-xl font-black uppercase tracking-widest shadow-2xl"
            >
              Hire an Expert Now
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}