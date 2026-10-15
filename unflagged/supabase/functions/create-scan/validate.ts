import { z } from "zod";
import { AnswersSchema } from "../_shared/schemas.ts";
import { wordCount } from "../_shared/signals.ts";

export const MAX_IMAGE_BYTES = 700 * 1024;
export const MAX_REQUEST_BYTES = 4 * 1024 * 1024 + 256 * 1024; // ~4 MB of payload plus JSON overhead
export const SCRIPT_MIN_WORDS = 150;
export const SCRIPT_MAX_WORDS = 2_500;

/** Accepts raw base64 or a data: URL; returns raw base64 of a JPEG no larger than MAX_IMAGE_BYTES. */
const JpegBase64 = z
  .string()
  .transform((s) => s.replace(/^data:image\/jpeg;base64,/, ""))
  .refine((s) => /^[A-Za-z0-9+/]+={0,2}$/.test(s), "image must be base64")
  .refine((s) => s.startsWith("/9j/"), "image must be a JPEG") // FF D8 FF
  .refine((s) => Math.floor((s.length * 3) / 4) <= MAX_IMAGE_BYTES, "image is larger than 700 KB");

const Script = z
  .string()
  .max(30_000)
  .refine((s) => {
    const w = wordCount(s);
    return w === 0 || (w >= SCRIPT_MIN_WORDS && w <= SCRIPT_MAX_WORDS);
  }, `scripts must be ${SCRIPT_MIN_WORDS}–${SCRIPT_MAX_WORDS} words`);

export const CreateScanSchema = z.object({
  images: z.array(JpegBase64).min(2).max(4),
  scripts: z.array(Script).max(3).default([]),
  answers: AnswersSchema,
  niche: z.string().trim().max(80).optional().transform((s) => s || null),
  // Optional "launch news" email: a typo here must never block the free scan, so an invalid one is just dropped.
  email: z
    .union([z.literal(""), z.string().trim().toLowerCase().email().max(254)])
    .optional()
    .catch(undefined)
    .transform((s) => s || null),
  ageConfirmed: z.literal(true),
  src: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_-]{1,24}$/)
    .optional()
    .catch(undefined)
    .transform((s) => s ?? null),
  rescanOf: z.string().uuid().optional(),
});
export type CreateScanInput = z.infer<typeof CreateScanSchema>;
