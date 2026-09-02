/**
 * Rate limiting for the generation endpoint.
 *
 * This endpoint is public, unauthenticated, and spends money on every call.
 * Without a cap, one loop empties the Workers AI budget and takes the demo
 * down with it. Two windows are enforced together:
 *
 *  - 20 requests per rolling-ish (fixed-window) minute — the brief's own
 *    "sensible default: 20 AI calls per minute per user".
 *  - 60 requests per hour — the brief also asks to "limit generations per
 *    visitor and per hour". 3x the per-minute cap is not measured from real
 *    traffic (there is none yet); it is chosen so a client sitting exactly at
 *    the minute cap for three minutes straight is stopped for the rest of the
 *    hour, while a legitimate visitor who bursts near the minute cap once or
 *    twice while retrying a flaky connection is not punished for it. Revisit
 *    once real usage exists.
 *
 * Both windows use a fixed-window bucket (the bucket id is the timestamp
 * truncated to the window size) rather than a sliding window, because KV has
 * no atomic increment: every check is a plain read-then-write, and a fixed
 * bucket keyed by its own id is the simplest thing that self-expires via TTL
 * instead of needing us to prune old entries. The read-then-write is racy
 * under concurrent requests from the same client (two requests can both read
 * "19" and both write "20", letting one extra through) — acceptable here
 * because the cost of over-admitting by a handful of requests is far lower
 * than the cost of a second KV round trip to make it exact.
 *
 * KV-down fallback: if Cloudflare is not configured, or a KV call throws
 * (network error, timeout, non-2xx), we fall back to the in-memory window
 * below rather than failing open with no limit at all. That fallback is
 * per-instance, not global — on a multi-instance deployment a client spread
 * across instances gets a higher effective limit than the number suggests —
 * but it still stops accidents and casual abuse at zero extra cost, which is
 * the same trade-off the original in-memory-only version accepted.
 */

import { cloudflareConfigured } from "@/lib/cloudflare/config";
import { getJson, putJson, kvKeys } from "@/lib/cloudflare/kv";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export const MAX_PER_MINUTE = 20;
export const MAX_PER_HOUR = 60;

/** Bounded so a flood of unique IPs cannot grow the in-memory map without limit. */
const MAX_TRACKED_KEYS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the caller may retry. Only meaningful when not allowed. */
  retryAfter: number;
  remaining: number;
}

// ---------------------------------------------------------------------------
// KV-backed fixed-window counters.
// ---------------------------------------------------------------------------

interface Counter {
  count: number;
}

/**
 * One window's check-and-increment against a single KV bucket.
 *
 * Exported (not just internal) so the bucketing arithmetic — which bucket a
 * given timestamp falls into, and how much TTL that bucket is owed — can be
 * exercised directly in tests without going near the network.
 */
export function windowBucket(now: number, windowMs: number): { bucket: number; resetAt: number } {
  const bucket = Math.floor(now / windowMs);
  return { bucket, resetAt: (bucket + 1) * windowMs };
}

async function checkKvWindow(
  scope: string,
  client: string,
  now: number,
  windowMs: number,
  max: number,
): Promise<RateLimitResult> {
  const { bucket, resetAt } = windowBucket(now, windowMs);
  const key = kvKeys.rateLimit(scope, client, bucket);

  // A few seconds of slack past the window's own end so a bucket read right
  // at the boundary is never evicted a moment before its last writer expects.
  const ttlSeconds = Math.max(60, Math.ceil((resetAt - now) / 1000) + 5);

  const existing = await getJson<Counter>(key);
  const count = existing?.count ?? 0;

  if (count >= max) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  await putJson(key, { count: count + 1 }, { expirationTtlSeconds: ttlSeconds });
  return { allowed: true, retryAfter: 0, remaining: max - count - 1 };
}

async function checkRateLimitKv(client: string, now: number): Promise<RateLimitResult> {
  const minute = await checkKvWindow("min", client, now, MINUTE_MS, MAX_PER_MINUTE);
  if (!minute.allowed) return minute;

  const hour = await checkKvWindow("hr", client, now, HOUR_MS, MAX_PER_HOUR);
  if (!hour.allowed) return hour;

  // Both windows admitted the request; report the tighter (minute) remaining
  // count, since that is the one a caller will hit first.
  return minute;
}

// ---------------------------------------------------------------------------
// In-memory fallback. Same two-window shape, kept deliberately simple.
// ---------------------------------------------------------------------------

const hits = new Map<string, number[]>();

export function checkRateLimitInMemory(key: string, now: number): RateLimitResult {
  const minuteCutoff = now - MINUTE_MS;
  const hourCutoff = now - HOUR_MS;

  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, timestamps] of hits) {
      if (timestamps.every((t) => t <= hourCutoff)) hits.delete(k);
    }
    // Still oversized after the sweep: drop everything rather than grow.
    if (hits.size > MAX_TRACKED_KEYS) hits.clear();
  }

  // One timestamp list per client serves both windows: the hour window is a
  // superset filter of the same array, so there is no need to track it twice.
  const withinHour = (hits.get(key) ?? []).filter((t) => t > hourCutoff);
  const withinMinute = withinHour.filter((t) => t > minuteCutoff);

  if (withinMinute.length >= MAX_PER_MINUTE) {
    hits.set(key, withinHour);
    const oldest = withinMinute[0];
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((oldest + MINUTE_MS - now) / 1000)),
      remaining: 0,
    };
  }

  if (withinHour.length >= MAX_PER_HOUR) {
    hits.set(key, withinHour);
    const oldest = withinHour[0];
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((oldest + HOUR_MS - now) / 1000)),
      remaining: 0,
    };
  }

  withinHour.push(now);
  hits.set(key, withinHour);
  return {
    allowed: true,
    retryAfter: 0,
    remaining: Math.min(
      MAX_PER_MINUTE - withinMinute.length - 1,
      MAX_PER_HOUR - withinHour.length,
    ),
  };
}

// ---------------------------------------------------------------------------
// Public entry point.
// ---------------------------------------------------------------------------

export async function checkRateLimit(key: string, now = Date.now()): Promise<RateLimitResult> {
  if (!cloudflareConfigured()) {
    return checkRateLimitInMemory(key, now);
  }

  try {
    return await checkRateLimitKv(key, now);
  } catch {
    // KV unreachable, timed out, or returned an error: degrade to the
    // in-memory window rather than let the request through uncounted.
    return checkRateLimitInMemory(key, now);
  }
}

/**
 * Best-effort client identity.
 *
 * x-forwarded-for is spoofable in general, but on Vercel the platform sets it
 * and the leftmost entry is the real client. We fall back to a shared bucket
 * rather than to "unlimited", so a missing header throttles rather than opens
 * the door.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

/** Test seam. */
export function __resetRateLimit() {
  hits.clear();
}
