import { assert, assertEquals } from "@std/assert";
import { CreateScanSchema } from "./validate.ts";

const words = (n: number) => Array(n).fill("word").join(" ");
const ok = {
  images: ["data:image/jpeg;base64,/9j/4AAQSkZJRg==", "/9j/4AAQSkZJRg=="],
  scripts: [words(200), ""],
  answers: { monetization: "rejected", voice: "ai", visuals: "stock", scripts: "self_written", opinion: "sometimes", uploads: "3-6" },
  niche: "history",
  email: "",
  ageConfirmed: true,
  src: "IG",
};

Deno.test("accepts a valid request and normalizes it", () => {
  const r = CreateScanSchema.parse(ok);
  assertEquals(r.images[0], "/9j/4AAQSkZJRg==");
  assertEquals(r.email, null);
  assertEquals(r.src, "ig");
});

Deno.test("rejects missing 18+, too few/too many images, non-JPEGs, oversize images and bad scripts", () => {
  const bad = (over: Record<string, unknown>) => !CreateScanSchema.safeParse({ ...ok, ...over }).success;
  assert(bad({ ageConfirmed: false }));
  assert(bad({ images: ["/9j/AAAA"] }));
  assert(bad({ images: Array(5).fill("/9j/AAAA") }));
  assert(bad({ images: ["iVBORw0KGgo=", "/9j/AAAA"] })); // PNG
  assert(bad({ images: ["/9j/" + "A".repeat(1_000_000), "/9j/AAAA"] }));
  assert(bad({ scripts: [words(100)] }));
  assert(bad({ scripts: [words(2600)] }));
  assert(bad({ answers: { ...ok.answers, voice: "robot" } }));
});

Deno.test("an invalid optional email is dropped instead of failing the scan", () => {
  assertEquals(CreateScanSchema.parse({ ...ok, email: "me@gmail" }).email, null);
  assertEquals(CreateScanSchema.parse({ ...ok, email: " Me@Example.com " }).email, "me@example.com");
});

Deno.test("a junk src is ignored rather than failing the scan", () => {
  assertEquals(CreateScanSchema.parse({ ...ok, src: "<script>" }).src, null);
});
