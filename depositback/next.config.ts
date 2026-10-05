import { resolve } from "node:path";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Ensure Turbopack resolves the workspace root to this project
  turbopack: { root: resolve(".") },

  // Inline CSS into HTML to eliminate render-blocking stylesheet requests
  experimental: { inlineCss: true, prefetchInlining: true },

  // Allow Whop CDN images (user profile pictures)
  images: {
    remotePatterns: [
      { hostname: "whop-cdn.com" },
      { hostname: "*.whop.com" },
      { hostname: "s3.us-east-2.amazonaws.com", pathname: "/assets.whop.com/**" },
    ],
  },

  // Security headers for all routes
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
