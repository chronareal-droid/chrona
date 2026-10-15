import { assertEquals, assertRejects } from "@std/assert";
import { readBodyLimited, TooLarge } from "./http.ts";
import { clientIp, networkOf } from "./ip.ts";

const req = (headers: Record<string, string>) => new Request("https://x.test/", { headers });

Deno.test("clientIp ignores the client-controlled left end of X-Forwarded-For", () => {
  // Cloudflare appends the real address; a spoofed first entry must not change the key.
  assertEquals(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.9", "cf-connecting-ip": "203.0.113.9" })), "203.0.113.9");
  assertEquals(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" })), "203.0.113.9");
  assertEquals(clientIp(req({ "x-real-ip": "198.51.100.4", "x-forwarded-for": "1.1.1.1" })), "198.51.100.4");
  assertEquals(clientIp(req({})), "unknown");
});

Deno.test("IPv6 clients are limited per /64", () => {
  assertEquals(networkOf("2001:db8:abcd:12:1:2:3:4"), "2001:db8:abcd:12::/64");
  assertEquals(networkOf("2001:db8:abcd:12::9"), "2001:db8:abcd:12::/64");
  assertEquals(networkOf("2001:db8::1"), "2001:db8:0:0::/64");
  assertEquals(networkOf("203.0.113.9"), "203.0.113.9");
});

Deno.test("readBodyLimited stops a chunked body that runs past the limit", async () => {
  const big = new ReadableStream<Uint8Array>({
    pull(c) {
      c.enqueue(new Uint8Array(64 * 1024));
    },
  });
  const r = new Request("https://x.test/", { method: "POST", body: big, headers: { "content-type": "application/json" } });
  await assertRejects(() => readBodyLimited(r, 256 * 1024), TooLarge);
  const lying = new Request("https://x.test/", { method: "POST", body: "{}", headers: { "content-length": "abc" } });
  await assertRejects(() => readBodyLimited(lying, 1024), TooLarge);
  assertEquals(await readBodyLimited(new Request("https://x.test/", { method: "POST", body: '{"a":1}' }), 1024), '{"a":1}');
});
