import type { MetadataRoute } from "next";

// Serves /manifest.webmanifest via Next's file convention. This is what makes Birdie installable
// (Add to Home Screen / Play Store via a TWA) instead of just a browser tab.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Birdie",
    short_name: "Birdie",
    description: "A study partner that knows your courses, with real human help from Unisupport when you need it.",
    start_url: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#EAE2F2",
    theme_color: "#6E2488",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
