import { Inter } from "next/font/google";
import "./globals.css";
import { Metadata, Viewport } from "next";
import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper";
import SwRegister from "@/components/layout/SwRegister";

const inter = Inter({ subsets: ["latin"] });

// The favicon comes from src/app/icon.svg (Birdie's face) via Next's file convention.
// manifest.ts (also a file convention) is what makes this installable as an app.
export const metadata: Metadata = {
  title: { default: "Birdie | Your study partner", template: "%s | Birdie" },
  description: "Birdie turns every course you take into a study partner that knows what you were taught. Study, explore, and get real help when you need it.",
  applicationName: "Birdie",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Birdie" },
  openGraph: {
    title: "Birdie",
    description: "A study partner that knows your courses.",
    siteName: "Birdie",
    locale: "en_NG",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#6E2488",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        <SwRegister />
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
