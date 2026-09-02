import { describe, expect, it, beforeEach } from "vitest";
import {
  checkRateLimit,
  checkRateLimitInMemory,
  windowBucket,
  clientKey,
  __resetRateLimit,
  MAX_PER_MINUTE,
  MAX_PER_HOUR,
} from "./rate-limit";

// None of these tests set CF_ACCOUNT_ID / CF_API_TOKEN / CF_KV_NAMESPACE_ID, so
// cloudflareConfigured() is false and checkRateLimit always takes the
// in-memory path below. That is deliberate: it is what keeps this file free
// of network calls while still exercising the real public entry point.

beforeEach(() => {
  __resetRateLimit();
});

describe("windowBucket", () => {
  it("truncates a timestamp to the window size", () => {
    const windowMs = 60_000;
    expect(windowBucket(0, windowMs).bucket).toBe(0);
    expect(windowBucket(59_999, windowMs).bucket).toBe(0);
    expect(windowBucket(60_000, windowMs).bucket).toBe(1);
  });

  it("reports the end of the bucket as resetAt", () => {
    const windowMs = 60_000;
    expect(windowBucket(500, windowMs).resetAt).toBe(60_000);
    expect(windowBucket(60_500, windowMs).resetAt).toBe(120_000);
  });
});

describe("checkRateLimitInMemory", () => {
  it("allows requests up to the per-minute cap", () => {
    const now = 1_000_000;
    let last;
    for (let i = 0; i < MAX_PER_MINUTE; i++) {
      last = checkRateLimitInMemory("client-a", now);
      expect(last.allowed).toBe(true);
    }
    expect(last!.remaining).toBe(0);
  });

  it("denies the request one past the per-minute cap, with a sensible retryAfter", () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_PER_MINUTE; i++) {
      checkRateLimitInMemory("client-b", now);
    }
    const result = checkRateLimitInMemory("client-b", now + 1_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    // The oldest hit in the window was at `now`; the minute window ends at
    // now + 60_000, so retryAfter should be about 59 seconds from now + 1_000.
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(60);
  });

  it("resets once the minute window has fully elapsed", () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_PER_MINUTE; i++) {
      checkRateLimitInMemory("client-c", now);
    }
    const result = checkRateLimitInMemory("client-c", now + 60_001);
    expect(result.allowed).toBe(true);
  });

  it("enforces the per-hour cap even when each minute individually clears", () => {
    // Spend the per-minute cap in one minute, then wait a minute and repeat,
    // enough times to exceed the per-hour cap before an hour has passed.
    const client = "client-d";
    let now = 0;
    let sawDenied = false;
    const minutesNeeded = Math.ceil(MAX_PER_HOUR / MAX_PER_MINUTE) + 1;

    for (let minute = 0; minute < minutesNeeded; minute++) {
      now = minute * 60_000;
      for (let i = 0; i < MAX_PER_MINUTE; i++) {
        const result = checkRateLimitInMemory(client, now);
        if (!result.allowed) sawDenied = true;
      }
    }

    expect(sawDenied).toBe(true);
  });

  it("tracks separate clients independently", () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_PER_MINUTE; i++) {
      checkRateLimitInMemory("client-e", now);
    }
    const other = checkRateLimitInMemory("client-f", now);
    expect(other.allowed).toBe(true);
  });
});

describe("checkRateLimit (falls back to in-memory when Cloudflare is not configured)", () => {
  it("allows up to the per-minute cap then denies", async () => {
    const now = 2_000_000;
    for (let i = 0; i < MAX_PER_MINUTE; i++) {
      const result = await checkRateLimit("client-g", now);
      expect(result.allowed).toBe(true);
    }
    const denied = await checkRateLimit("client-g", now);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfter).toBeGreaterThan(0);
  });
});

describe("clientKey", () => {
  it("prefers the leftmost x-forwarded-for entry", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(clientKey(headers)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "9.9.9.9" });
    expect(clientKey(headers)).toBe("9.9.9.9");
  });

  it("falls back to a shared bucket rather than unlimited", () => {
    const headers = new Headers();
    expect(clientKey(headers)).toBe("unknown");
  });
});
