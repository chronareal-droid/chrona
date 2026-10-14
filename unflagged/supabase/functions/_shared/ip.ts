// Rate limiting keys off a salted SHA-256 of the client IP. The raw IP is never stored or logged.

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
}

export async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const SCANS_PER_IP_PER_DAY = 3;
