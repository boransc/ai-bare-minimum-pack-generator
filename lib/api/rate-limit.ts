/**
 * Rate limiting for the generation endpoint.
 *
 * This endpoint is public, unauthenticated, and (once tailoring is wired up)
 * spends money on every call. Without a cap, one loop empties the Workers AI
 * budget and takes the demo down with it.
 *
 * The store is an in-memory sliding window. On Vercel that means per-instance,
 * not global: a determined attacker spread across instances gets a higher
 * effective limit than the number below suggests. That is an accepted
 * trade-off for now — it stops accidents and casual abuse, costs nothing, and
 * adds no dependency. The upgrade, when it is worth it, is a KV-backed counter
 * using the same interface.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;

/** Bounded so a flood of unique IPs cannot grow the map without limit. */
const MAX_TRACKED_KEYS = 10_000;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the caller may retry. Only meaningful when not allowed. */
  retryAfter: number;
  remaining: number;
}

export function checkRateLimit(key: string, now = Date.now()): RateLimitResult {
  const cutoff = now - WINDOW_MS;

  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, timestamps] of hits) {
      if (timestamps.every((t) => t <= cutoff)) hits.delete(k);
    }
    // Still oversized after the sweep: drop everything rather than grow.
    if (hits.size > MAX_TRACKED_KEYS) hits.clear();
  }

  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    hits.set(key, recent);
    const oldest = recent[0];
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
      remaining: 0,
    };
  }

  recent.push(now);
  hits.set(key, recent);
  return {
    allowed: true,
    retryAfter: 0,
    remaining: MAX_REQUESTS_PER_WINDOW - recent.length,
  };
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
