import { describe, expect, it } from "vitest";
import {
  computeAccessExpiresAt,
  isAccessExpired,
  retentionDeadline,
  ttlSecondsRemaining,
} from "./packs-pure";

describe("computeAccessExpiresAt", () => {
  it("is exactly 90 days after createdAt", () => {
    const createdAt = "2026-01-01T00:00:00.000Z";
    const expiresAt = computeAccessExpiresAt(createdAt);
    const diffDays =
      (new Date(expiresAt).getTime() - new Date(createdAt).getTime()) /
      (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(90);
  });
});

describe("isAccessExpired", () => {
  const createdAt = "2026-01-01T00:00:00.000Z";
  const accessExpiresAt = computeAccessExpiresAt(createdAt);

  it("is not expired the instant it is created", () => {
    expect(isAccessExpired(accessExpiresAt, new Date(createdAt))).toBe(false);
  });

  it("is not expired one day before the deadline", () => {
    const oneDayBefore = new Date(new Date(accessExpiresAt).getTime() - 24 * 60 * 60 * 1000);
    expect(isAccessExpired(accessExpiresAt, oneDayBefore)).toBe(false);
  });

  it("is expired exactly at the deadline", () => {
    expect(isAccessExpired(accessExpiresAt, new Date(accessExpiresAt))).toBe(true);
  });

  it("is expired well after the deadline", () => {
    const wellAfter = new Date(new Date(accessExpiresAt).getTime() + 1000);
    expect(isAccessExpired(accessExpiresAt, wellAfter)).toBe(true);
  });

  it("returning does not slide the expiry: the same accessExpiresAt is used across repeated reads", () => {
    const day1 = isAccessExpired(accessExpiresAt, new Date(createdAt));
    const day89 = isAccessExpired(
      accessExpiresAt,
      new Date(new Date(createdAt).getTime() + 89 * 24 * 60 * 60 * 1000),
    );
    // Neither read mutates accessExpiresAt itself -- it stays the same value
    // regardless of how many times it was checked, which is the point.
    expect(day1).toBe(false);
    expect(day89).toBe(false);
    expect(computeAccessExpiresAt(createdAt)).toBe(accessExpiresAt);
  });
});

describe("retentionDeadline", () => {
  it("is 12 calendar months after createdAt", () => {
    const createdAt = "2026-01-15T10:00:00.000Z";
    const deadline = retentionDeadline(createdAt);
    expect(deadline.getUTCFullYear()).toBe(2027);
    expect(deadline.getUTCMonth()).toBe(0); // January, 0-indexed
    expect(deadline.getUTCDate()).toBe(15);
  });

  it("handles a leap-year edge (29 Feb 2028 as a start date) without throwing", () => {
    const createdAt = "2028-02-29T00:00:00.000Z";
    expect(() => retentionDeadline(createdAt)).not.toThrow();
  });
});

describe("ttlSecondsRemaining", () => {
  it("returns close to a full 12 months of seconds right after creation", () => {
    const createdAt = "2026-01-01T00:00:00.000Z";
    const seconds = ttlSecondsRemaining(createdAt, new Date(createdAt));
    // ~365 days, give or take a day for month-length variance.
    expect(seconds).toBeGreaterThan(364 * 24 * 60 * 60);
    expect(seconds).toBeLessThan(367 * 24 * 60 * 60);
  });

  it("shrinks as time passes, preserving the original deadline rather than resetting it", () => {
    const createdAt = "2026-01-01T00:00:00.000Z";
    const early = ttlSecondsRemaining(createdAt, new Date(createdAt));
    const later = ttlSecondsRemaining(
      createdAt,
      new Date(new Date(createdAt).getTime() + 30 * 24 * 60 * 60 * 1000),
    );
    expect(later).toBeLessThan(early);
    // Roughly 30 days' worth of seconds less, not reset back to a full 12 months.
    expect(early - later).toBeGreaterThan(29 * 24 * 60 * 60);
    expect(early - later).toBeLessThan(31 * 24 * 60 * 60);
  });

  it("never goes below KV's 60-second minimum, even past the deadline", () => {
    const createdAt = "2026-01-01T00:00:00.000Z";
    const wellPast = new Date(new Date(createdAt).getTime() + 400 * 24 * 60 * 60 * 1000);
    expect(ttlSecondsRemaining(createdAt, wellPast)).toBe(60);
  });

  it("a checklist write at day 30 owes the same deadline as one at day 0, not a fresh 12 months", () => {
    const createdAt = "2026-01-01T00:00:00.000Z";
    const day0Ttl = ttlSecondsRemaining(createdAt, new Date(createdAt));
    const day30Now = new Date(new Date(createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
    const day30Ttl = ttlSecondsRemaining(createdAt, day30Now);
    const day30DeletionTime = day30Now.getTime() + day30Ttl * 1000;
    const day0DeletionTime = new Date(createdAt).getTime() + day0Ttl * 1000;
    // Both TTLs should point at (very nearly) the same absolute deletion instant.
    expect(Math.abs(day30DeletionTime - day0DeletionTime)).toBeLessThan(2000);
  });
});
