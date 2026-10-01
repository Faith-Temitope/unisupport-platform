import type { Metadata } from "next";

// Overrides the root layout's manifest link (which points at Birdie's /manifest.webmanifest) so
// this segment installs as its own app using /desk-app/manifest.webmanifest instead. Metadata
// exports must live in a Server Component, which is why this is a separate layout.tsx rather than
// living in page.tsx (that file is "use client", re-exporting the real staff page).
export const metadata: Metadata = { title: "Unisupport Desk", manifest: "/desk-app/manifest.webmanifest" };

export default function DeskAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
