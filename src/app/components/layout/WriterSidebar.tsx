"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { 
  History, 
  MessageSquare, 
  LogOut, 
  LayoutDashboard, 
  ShieldCheck, 
  Banknote 
} from "lucide-react";

export default function WriterSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // WhatsApp Support Config
  const WHATSAPP_NUMBER = "2349131352366"; 
  const supportMsg = encodeURIComponent("Hello Admin, I am an Expert Writer on uniSupport and I need assistance.");
  const supportLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${supportMsg}`;

  // Handle Sign Out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/writer/login");
    router.refresh();
  };

  const menuItems = [
    { 
      name: "My Workspace", 
      icon: <LayoutDashboard size={20} />, 
      path: "/writer/dashboard" 
    },
    { 
      name: "Finished Work", 
      icon: <History size={20} />, 
      path: "/writer/history" 
    },
    { 
      name: "My Wallet", 
      icon: <Banknote size={20} />, 
      path: "/writer/wallet" 
    },
    { 
      name: "Support", 
      icon: <MessageSquare size={20} />, 
      path: supportLink,
      isExternal: true 
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 hidden md:flex flex-col z-50">
      {/* Branding */}
      <div className="p-8">
        <h2 className="text-2xl font-black text-gray-900 italic">
          uniSupport<span className="text-emerald-500">.pro</span>
        </h2>
        <div className="flex items-center gap-2 mt-2">
          <ShieldCheck size={12} className="text-emerald-500" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expert Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const content = (
            <>
              {item.icon}
              {item.name}
            </>
          );

          const className = `flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-black transition-all ${
            pathname === item.path 
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" 
              : "text-gray-400 hover:bg-gray-50 hover:text-gray-900"
          }`;

          return item.isExternal ? (
            <a key={item.name} href={item.path} target="_blank" rel="noopener noreferrer" className={className}>
              {content}
            </a>
          ) : (
            <Link key={item.path} href={item.path} className={className}>
              {content}
            </Link>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-8 border-t border-gray-50">
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-3 text-gray-400 font-black text-xs uppercase hover:text-red-500 transition-colors w-full group"
        >
          <LogOut size={18} className="group-hover:rotate-12 transition-transform" /> 
          Sign Out
        </button>
      </div>
    </aside>
  );
}