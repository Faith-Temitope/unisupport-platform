"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { 
  LayoutDashboard, 
  Users, 
  PenTool, 
  MessageSquare,
  LogOut,
  PlusCircle,
  Radio, // Icon for Broadcasts
  ShieldCheck,
  ChevronRight
} from "lucide-react";

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const menuItems = [
    { name: "Overview", icon: <LayoutDashboard size={18} />, href: "/admin" },
    { name: "Create Order", icon: <PlusCircle size={18} />, href: "/admin/orders/new/" },
    { name: "Broadcast", icon: <Radio size={18} />, href: "/admin/broadcast" }, // NEW: Broadcast feature
    { name: "Writers", icon: <Users size={18} />, href: "/admin/writers" },
    { name: "Blog Posts", icon: <PenTool size={18} />, href: "/admin/blog" },
    { name: "Testimonials", icon: <MessageSquare size={18} />, href: "/admin/testimonials" },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-6 hidden md:flex flex-col fixed left-0 top-0 border-r border-white/5">
      {/* Brand Header */}
      <div className="mb-12 flex items-center gap-3 px-2">
        <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <ShieldCheck size={24} className="text-gray-900" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-tighter italic">
            Vault <span className="text-emerald-400">Admin</span>
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Founder Access</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-1 flex-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                isActive 
                ? "bg-emerald-500 text-gray-900 font-bold shadow-lg shadow-emerald-500/10" 
                : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="text-xs font-black uppercase tracking-widest">{item.name}</span>
              </div>
              {isActive && <ChevronRight size={14} />}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="pt-6 border-t border-white/5">
         <button 
           onClick={handleLogout}
           className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all w-full group"
         >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Terminate Session</span>
         </button>
      </div>
    </aside>
  );
}