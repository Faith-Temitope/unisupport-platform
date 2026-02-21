import { Inter } from "next/font/google";
import "./globals.css";
import { Metadata } from "next";
import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper";

const inter = Inter({ subsets: ["latin"] });

// HIGH-LEVEL SEO & BRANDING FOR getunisupport.xyz
export const metadata: Metadata = {
  metadataBase: new URL('https://getunisupport.xyz'),
  title: {
    default: 'uniSupport | The Academic Research Vault',
    template: '%s | uniSupport'
  },
  description: 'Secure, encrypted portal for premium academic research blueprints and project intelligence.',
  
  // THE FIX: Explicitly defining the icons kills the default Next.js favicon
  icons: {
    icon: [
      { url: '/icon.png' }, // Ensure icon.png is in your /public folder or /app folder
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/icon.png' },
    ],
  },

  openGraph: {
    title: 'uniSupport Vault',
    description: 'Get premium academic blueprints and earn rewards.',
    url: 'https://getunisupport.xyz',
    siteName: 'uniSupport',
    images: [{ url: '/og-image.png' }], 
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
      <head>
        {/* Secondary backup for stubborn browsers */}
        <link rel="icon" href="/icon.png" />
      </head>
      <body className={inter.className}>
        <ClientLayoutWrapper>
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}