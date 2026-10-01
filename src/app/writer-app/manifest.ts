import type { MetadataRoute } from "next";

// Serves /writer-app/manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Unisupport Writer",
    short_name: "Uni Writer",
    description: "Unisupport writer app: see your assigned students, quote jobs, deliver work.",
    start_url: "/writer-app",
    id: "/writer-app",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4EFF9",
    theme_color: "#1a1024",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
