"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  PenTool, 
  Settings, 
  MessageSquare,
  LogOut,
  PlusCircle
} from "lucide-react";

export default function AdminSidebar() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const menuItems = [
    { name: "Overview", icon: <LayoutDashboard size={20} />, href: "/admin" },
    { name: "Create Order", icon: <PlusCircle size={20} />, href: "/admin/create-order" },
    { name: "Writers", icon: <Users size={20} />, href: "/admin/writers" },
    { name: "Blog Posts", icon: <PenTool size={20} />, href: "/admin/blog" },
    { name: "Testimonials", icon: <MessageSquare size={20} />, href: "/admin/testimonials" },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-6 hidden md:block fixed left-0 top-0">
      <div className="mb-10">
        <h2 className="text-xl font-bold text-emerald-400">uniSupport Admin</h2>
        <p className="text-xs text-gray-400">Founder Access</p>
      </div>
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
          >
            {item.icon}
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>
      <div className="absolute bottom-6 left-6 w-[calc(100%-3rem)]">
         <button 
           onClick={handleLogout}
           className="flex items-center gap-3 text-gray-400 hover:text-red-400 transition-colors w-full"
         >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
         </button>
      </div>
    </aside>
  );
}