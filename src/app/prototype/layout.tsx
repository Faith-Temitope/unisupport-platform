import { Space_Grotesk } from "next/font/google";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"] });

export const metadata = { title: { absolute: "Birdie | Your study partner" } };

export default function PrototypeLayout({ children }: { children: React.ReactNode }) {
  return <div className={`proto-root ${display.variable}`}>{children}</div>;
}
