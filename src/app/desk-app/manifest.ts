import type { MetadataRoute } from "next";

// Serves /desk-app/manifest.webmanifest, making this route independently installable
// (Add to Home Screen / a separate TWA) under its own name and icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Unisupport Desk",
    short_name: "Uni Desk",
    description: "Unisupport help desk: assign writers, collect session fees, keep students moving.",
    start_url: "/desk-app",
    id: "/desk-app",
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
