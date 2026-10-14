// CORS + JSON helpers shared by every function. Only SITE_URL and the Vite dev server may call us from a browser.

const DEV_ORIGIN = "http://localhost:5173";

export function allowedOrigins(): string[] {
  const site = Deno.env.get("SITE_URL")?.replace(/\/+$/, "");
  return [site, DEV_ORIGIN].filter((o): o is string => !!o);
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = allowedOrigins();
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] ?? "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Returns a response for CORS preflight / wrong method, or null to continue. */
export function preflight(req: Request, method: "GET" | "POST"): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== method) return json(req, { error: "method_not_allowed" }, 405);
  return null;
}

export function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

export function siteUrl(): string {
  return requireEnv("SITE_URL").replace(/\/+$/, "");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID_RE.test(s);
