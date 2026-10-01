import type { Metadata } from "next";

// See desk-app/layout.tsx for why this points at a static public/ file instead of a nested
// manifest.ts (that file convention only works at the app root).
export const metadata: Metadata = { title: "Unisupport Writer", manifest: "/writer-app.webmanifest" };

export default function WriterAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
