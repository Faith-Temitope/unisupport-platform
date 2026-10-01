import type { Metadata } from "next";

// Overrides the root layout's manifest link (which points at Birdie's /manifest.webmanifest) so
// this segment installs as its own app. Points at a static file in public/ rather than Next's
// manifest.ts file convention -- that convention only generates a route at the app root, not at
// nested segments (confirmed: a nested app/desk-app/manifest.ts compiles but 404s at runtime).
// Metadata exports must live in a Server Component, hence a separate layout.tsx rather than
// page.tsx (that file is "use client", re-exporting the real staff page).
export const metadata: Metadata = { title: "Unisupport Desk", manifest: "/desk-app.webmanifest" };

export default function DeskAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
