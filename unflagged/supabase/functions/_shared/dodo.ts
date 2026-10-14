// Dodo Payments: hosted checkout sessions + Standard Webhooks signature verification.
// API: POST {base}/checkouts with a product_cart → { session_id, checkout_url }.
// Webhooks follow the Standard Webhooks spec (https://www.standardwebhooks.com): headers webhook-id,
// webhook-timestamp, webhook-signature ("v1,<base64 HMAC-SHA256>" entries, space-separated) over
// `${id}.${timestamp}.${rawBody}`, keyed with the base64 part of the `whsec_...` secret.

export function dodoBaseUrl(): string {
  return Deno.env.get("DODO_MODE") === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
}

export interface CheckoutSession {
  session_id: string;
  checkout_url: string;
}

export async function createCheckoutSession(args: {
  apiKey: string;
  productId: string;
  scanId: string;
  returnUrl: string;
}): Promise<CheckoutSession> {
  const res = await fetch(`${dodoBaseUrl()}/checkouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${args.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      product_cart: [{ product_id: args.productId, quantity: 1 }],
      return_url: args.returnUrl,
      metadata: { scan_id: args.scanId },
    }),
  });
  if (!res.ok) throw new Error(`dodo checkout failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  if (!body?.checkout_url) throw new Error("dodo checkout response had no checkout_url");
  return body as CheckoutSession;
}

/** Reject webhooks whose timestamp is more than 5 minutes off (replay protection, per Standard Webhooks). */
export const WEBHOOK_TOLERANCE_S = 5 * 60;

function b64decode(s: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signWebhook(secret: string, id: string, timestamp: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    b64decode(secret.startsWith("whsec_") ? secret.slice(6) : secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  return b64encode(new Uint8Array(sig));
}

export async function verifyWebhook(
  secret: string,
  headers: Headers,
  rawBody: string,
  nowS = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !ts || !sigHeader || !/^\d+$/.test(ts)) return false;
  if (Math.abs(nowS - Number(ts)) > WEBHOOK_TOLERANCE_S) return false;
  const expected = await signWebhook(secret, id, ts, rawBody);
  return sigHeader
    .split(" ")
    .map((s) => s.split(",", 2))
    .some(([ver, sig]) => ver === "v1" && !!sig && timingSafeEqual(sig, expected));
}

export interface PaymentEvent {
  type: string;
  data?: { payment_id?: string; metadata?: Record<string, unknown>; status?: string };
}

/** Returns { scanId, paymentId } for a successful payment event, else null. */
export function paidScanFromEvent(evt: PaymentEvent): { scanId: string; paymentId: string } | null {
  if (evt.type !== "payment.succeeded") return null;
  const scanId = evt.data?.metadata?.scan_id;
  const paymentId = evt.data?.payment_id;
  if (typeof scanId !== "string" || typeof paymentId !== "string") return null;
  return { scanId, paymentId };
}
