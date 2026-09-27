import { Inter } from "next/font/google";
import "./globals.css";
import { Metadata } from "next";
import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper";

const inter = Inter({ subsets: ["latin"] });

// The favicon comes from src/app/icon.svg (Birdie's face) via Next's file convention.
export const metadata: Metadata = {
  title: { default: "Birdie | Your study partner", template: "%s | Birdie" },
  description: "Birdie turns every course you take into a study partner that knows what you were taught. Study, explore, and get real help when you need it.",
  applicationName: "Birdie",
  openGraph: {
    title: "Birdie",
    description: "A study partner that knows your courses.",
    siteName: "Birdie",
    locale: "en_NG",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
