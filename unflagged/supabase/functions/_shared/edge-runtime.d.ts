// Supabase Edge Runtime global (keeps the worker alive for background work after the response is sent).
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;
