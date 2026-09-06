/**
 * Basic per-IP rate limiting — Tech Design §9: "an exposed unauthenticated
 * AI endpoint will get drained." Both /api/explain and /api/speak hold paid
 * provider keys behind no auth, and this project has already hit its own
 * Gemini free-tier quota by hand more than once this session — an
 * unauthenticated caller doing it on purpose is a real risk, not a
 * hypothetical one.
 *
 * Deliberately basic, per the Tech Design's own scope: a fixed-window
 * counter in memory, not a distributed store. It only limits requests
 * hitting the same warm serverless instance, and resets on cold start or
 * redeploy. That is a known, accepted gap for an MVP — good enough to stop
 * casual draining, not good enough to be a real API gateway.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  { windowMs = WINDOW_MS, max = MAX_REQUESTS }: { windowMs?: number; max?: number } = {},
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= max) return false;

  bucket.count += 1;
  return true;
}

/** Vercel sets x-forwarded-for; falls back to a shared bucket if absent. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "unknown";
}
