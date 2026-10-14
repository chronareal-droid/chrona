import { assertEquals, assertRejects } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { type GenerateJsonArgs, generateJsonWith, PipelineError } from "./ai.ts";

const args = (deadlineIn = 140_000): GenerateJsonArgs => ({
  model: "m",
  system: "s",
  parts: [{ text: "x" }],
  schema: {},
  deadline: Date.now() + deadlineIn,
});

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

Deno.test("retries 429/5xx with 2s/6s/15s backoff, then succeeds", async () => {
  using time = new FakeTime();
  let calls = 0;
  const p = generateJsonWith(async () => {
    calls++;
    if (calls < 3) throw httpError(calls === 1 ? 429 : 503);
    return { ok: true };
  }, args());
  await time.tickAsync(2_000);
  await time.tickAsync(6_000);
  assertEquals(await p, { ok: true });
  assertEquals(calls, 3);
});

Deno.test("gives up with capacity after the third backoff", async () => {
  using time = new FakeTime();
  let calls = 0;
  const p = generateJsonWith(async () => {
    calls++;
    throw httpError(429);
  }, args());
  const check = assertRejects(() => p, PipelineError, "capacity");
  await time.tickAsync(2_000);
  await time.tickAsync(6_000);
  await time.tickAsync(15_000);
  await check;
  assertEquals(calls, 4);
});

Deno.test("non-retryable errors fail fast as ai_failed (e.g. an invalid model name)", async () => {
  const err = await assertRejects(() => generateJsonWith(async () => {
    throw httpError(404);
  }, args()), PipelineError);
  assertEquals(err.code, "ai_failed");
});

Deno.test("refuses to start a call with no time left", async () => {
  const err = await assertRejects(() => generateJsonWith(async () => ({}), args(1_000)), PipelineError);
  assertEquals(err.code, "timeout");
});
