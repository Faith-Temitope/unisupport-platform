// The old marketing site's Navbar/MobileFAB are gone (moved to the standalone Unisupport website
// repo). Every route left here — the app, /terms, /privacy — draws its own chrome, so this is just
// a pass-through kept for the layout.tsx import site.
export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
