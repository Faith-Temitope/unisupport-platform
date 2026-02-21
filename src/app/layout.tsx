import { Inter } from "next/font/google";
import "./globals.css";
import { Metadata } from "next";
import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper";

const inter = Inter({ subsets: ["latin"] });

// HIGH-LEVEL SEO FOR getunisupport.xyz
export const metadata: Metadata = {
  metadataBase: new URL('https://getunisupport.xyz'),
  title: {
    default: 'uniSupport | The Academic Research Vault',
    template: '%s | uniSupport'
  },
  description: 'Secure, encrypted portal for premium academic research blueprints and project intelligence.',
  openGraph: {
    title: 'uniSupport Vault',
    description: 'Get premium academic blueprints and earn rewards.',
    url: 'https://getunisupport.xyz',
    siteName: 'uniSupport',
    images: [{ url: '/og-image.png' }], // Make sure to add this image to your public folder later
    locale: 'en_NG',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        {/* We move the logic for Navbar/FAB here to keep the layout clean */}
        <ClientLayoutWrapper>
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}