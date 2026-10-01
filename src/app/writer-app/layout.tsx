import type { Metadata } from "next";

export const metadata: Metadata = { title: "Unisupport Writer", manifest: "/writer-app/manifest.webmanifest" };

export default function WriterAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
