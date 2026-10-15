// The only place that talks to a model. Everything else calls generateJson().
// Switching provider later (paid Gemini, or Claude via the Anthropic API for the judge) means a new branch here
// keyed on the model name, plus a MODEL_JUDGE secret change; callers don't change.
import { GoogleGenAI } from "@google/genai";

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

export interface GenerateJsonArgs {
  model: string;
  system: string;
  parts: Part[];
  /** JSON schema for the response (Gemini `responseJsonSchema`). */
  schema: unknown;
  /** Absolute epoch-ms deadline for this call, retries included. */
  deadline: number;
  /** Cap on the reply length, so a runaway (repeating) reply fails fast instead of eating the time budget. */
  maxOutputTokens?: number;
}

export type GenerateJson = (args: GenerateJsonArgs) => Promise<unknown>;

/** Error codes stored in scans.error_code. The UI shows a friendly retry message for all of them. */
export type ErrorCode = "capacity" | "timeout" | "ai_failed" | "bad_output" | "no_videos" | "internal";

export class PipelineError extends Error {
  constructor(readonly code: ErrorCode, message: string) {
    super(message);
  }
}

const BACKOFF_MS = [2_000, 6_000, 15_000];
/** Don't start an attempt with less than this left: it would just time out. */
const MIN_ATTEMPT_MS = 8_000;

let client: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new PipelineError("ai_failed", "GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

function statusOf(err: unknown): number | undefined {
  const e = err as { status?: unknown; code?: unknown };
  if (typeof e?.status === "number") return e.status;
  if (typeof e?.code === "number") return e.code;
  return undefined;
}

export function isRetryable(err: unknown): boolean {
  const s = statusOf(err);
  return s === 429 || (s !== undefined && s >= 500);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGemini(args: GenerateJsonArgs, signal: AbortSignal): Promise<unknown> {
  const res = await gemini().models.generateContent({
    model: args.model,
    contents: [{ role: "user", parts: args.parts }],
    config: {
      systemInstruction: args.system,
      responseMimeType: "application/json",
      responseJsonSchema: args.schema,
      temperature: 0.2,
      maxOutputTokens: args.maxOutputTokens ?? 8192,
      abortSignal: signal,
    },
  });
  const text = res.text;
  const finish = res.candidates?.[0]?.finishReason ?? "unknown";
  if (!text) throw new PipelineError("bad_output", `model returned no text (finishReason ${finish})`);
  try {
    return JSON.parse(text);
  } catch {
    throw new PipelineError("bad_output", `model returned invalid JSON (finishReason ${finish})`);
  }
}

/**
 * One structured-output call with retries on 429/5xx (backoff 2 s, 6 s, 15 s), bounded by `deadline`.
 * Throws PipelineError: `capacity` when retries run out, `timeout` when the deadline passes, `ai_failed` otherwise.
 * `call` is injectable for tests.
 */
export async function generateJsonWith(
  call: (args: GenerateJsonArgs, signal: AbortSignal) => Promise<unknown>,
  args: GenerateJsonArgs,
): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    const left = args.deadline - Date.now();
    if (left < MIN_ATTEMPT_MS) throw new PipelineError("timeout", "out of time before AI call");
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), left);
    try {
      return await call(args, ac.signal);
    } catch (err) {
      if (err instanceof PipelineError) throw err;
      if (ac.signal.aborted) throw new PipelineError("timeout", "AI call hit the deadline");
      if (!isRetryable(err)) {
        throw new PipelineError("ai_failed", `AI call failed: ${(err as Error)?.message ?? err}`);
      }
      const wait = BACKOFF_MS[attempt];
      if (wait === undefined) throw new PipelineError("capacity", `AI at capacity (status ${statusOf(err)})`);
      if (args.deadline - Date.now() - wait < MIN_ATTEMPT_MS) {
        throw new PipelineError("capacity", "AI at capacity and no time left to retry");
      }
      await sleep(wait);
    } finally {
      clearTimeout(timer);
    }
  }
}

export const generateJson: GenerateJson = (args) => generateJsonWith(callGemini, args);
