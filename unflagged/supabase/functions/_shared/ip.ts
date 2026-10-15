// Rate limiting keys off a salted SHA-256 of the client IP. The raw IP is never stored or logged.

/**
 * The caller's IP as seen by the platform, not as claimed by the caller.
 * Supabase's edge (Cloudflare) sets cf-connecting-ip and *appends* to any X-Forwarded-For the client sent, so the
 * leftmost X-Forwarded-For entry is attacker-controlled and must never be used. Fallbacks: x-real-ip, then the
 * rightmost X-Forwarded-For hop (the one our own proxy added).
 */
export function clientIp(req: Request): string {
  const h = (name: string) => req.headers.get(name)?.trim() || "";
  const forwarded = h("x-forwarded-for").split(",").map((s) => s.trim()).filter(Boolean);
  const ip = h("cf-connecting-ip") || h("x-real-ip") || forwarded[forwarded.length - 1] || "unknown";
  return networkOf(ip);
}

/** IPv6 clients can rotate through a whole /64 at will, so they're limited per /64. IPv4 stays per address. */
export function networkOf(ip: string): string {
  if (!ip.includes(":")) return ip;
  const [head, tail = ""] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const full = [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right];
  return full.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":") + "::/64";
}

export async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Successful (or user-caused failed) scans per IP per rolling 24 h. */
export const SCANS_PER_IP_PER_DAY = 3;
/** Every attempt per IP per 24 h, including ones that failed on our side. */
export const ATTEMPTS_PER_IP_PER_DAY = 10;
/** Waitlist sign-ups per IP per 24 h. */
export const WAITLIST_PER_IP_PER_DAY = 5;
