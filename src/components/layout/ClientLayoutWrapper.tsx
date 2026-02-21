"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import MobileFAB from "@/components/ui/MobileFAB";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const isAdminPage = pathname?.startsWith("/admin");
  const isAuthOrOrder = pathname === "/auth" || pathname === "/order";

  return (
    <>
      {!isAdminPage && (
        <>
          <Navbar />
          {!isAuthOrOrder && <MobileFAB />}
        </>
      )}
      
      <main className={!isAdminPage ? "pt-20" : ""}>
        {children}
      </main>
    </>
  );
}