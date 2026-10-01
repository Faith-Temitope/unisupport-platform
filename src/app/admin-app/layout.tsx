import type { Metadata } from "next";

export const metadata: Metadata = { title: "Unisupport Console", manifest: "/admin-app/manifest.webmanifest" };

export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
