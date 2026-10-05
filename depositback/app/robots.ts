import type { MetadataRoute } from "next";
import { headers } from "next/headers";

/**
 * Resolve the base URL for sitemap/robots.
 * Priority: NEXT_PUBLIC_APP_URL → Vercel system env vars → request host header.
 */
async function getBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  try {
    const h = await headers();
    const host = h.get("host");
    if (host) {
      const proto = host.includes("localhost") ? "http" : "https";
      return `${proto}://${host}`;
    }
  } catch {
    // headers() not available in static context
  }
  return "http://localhost:3000";
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/api/", "/setup/", "/checkout/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
