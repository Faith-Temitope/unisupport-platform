import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve "/" as "/prototype" directly instead of a client-visible redirect. A redirect means the
  // browser/TWA has to make a full request, wait for a 307, then make a second request before
  // anything paints -- on a cold app launch over a slow mobile connection that round trip is real,
  // visible dead time with zero feedback, easily read as "the app is broken." A rewrite serves the
  // same content on the first request, no extra hop, with zero change to how the pages are written.
  async rewrites() {
    return [{ source: "/", destination: "/prototype" }];
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;