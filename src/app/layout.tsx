"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import MobileFAB from "@/components/ui/MobileFAB"; // Import the new FAB
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Check if the current page starts with /admin
  const isAdminPage = pathname?.startsWith("/admin");
  // Don't show the FAB on auth or order pages either, as it might be redundant
  const isAuthOrOrder = pathname === "/auth" || pathname === "/order";

  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
      <body className={inter.className}>
        {/* Only show Navbar and FAB if we are NOT on an admin page */}
        {!isAdminPage && (
          <>
            <Navbar />
            {!isAuthOrOrder && <MobileFAB />}
          </>
        )}
        
        <main className={!isAdminPage ? "pt-20" : ""}>
          {children}
        </main>
      </body>
    </html>
  );
}