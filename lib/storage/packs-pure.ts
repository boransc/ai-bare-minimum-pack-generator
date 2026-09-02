/**
 * The date arithmetic behind pack persistence, kept free of any KV or
 * "server-only" import so it can be unit-tested directly under Vitest — the
 * moment this file pulls in `lib/cloudflare/kv`, importing it anywhere
 * throws ("This module cannot be imported from a Client Component module"),
 * because the `server-only` guard has no special case for a plain Node test
 * runner. `packs.ts` re-exports these for its callers.
 *
 * Two lifetimes apply to the same record and must not be confused:
 *
 *  - `accessExpiresAt` (90 days from creation) is the *link's* lifetime. It
 *    is a value we store and check on read. Returning to the pack never
 *    slides it — that would need a deliberate product decision, not a side
 *    effect of a GET.
 *  - the KV TTL (12 months from creation) is the *data's* lifetime, and it
 *    is Cloudflare's own deletion, not a flag we police. Every write that
 *    touches an existing record must recompute the TTL from the original
 *    `createdAt` rather than resetting the clock, or "delete after 12
 *    months" quietly becomes "delete after 12 months since you last ticked a
 *    box".
 */

const ACCESS_WINDOW_DAYS = 90;
const RETENTION_MONTHS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The 90-day link deadline, computed once at save time. */
export function computeAccessExpiresAt(createdAt: string): string {
  return new Date(new Date(createdAt).getTime() + ACCESS_WINDOW_DAYS * DAY_MS).toISOString();
}

/**
 * Add calendar months rather than a fixed span of days, so "12 months" means
 * the same thing regardless of leap years or which months it spans.
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/** The 12-month retention deadline: when the KV TTL should delete the record. */
export function retentionDeadline(createdAt: string): Date {
  return addMonths(new Date(createdAt), RETENTION_MONTHS);
}

/**
 * Seconds of TTL still owed to a record, measured from its original
 * `createdAt` rather than from now. This is what keeps a checklist tick from
 * ever extending the 12-month promise: the deadline is fixed at creation, and
 * every subsequent write just re-states how much of it is left.
 *
 * Floored at KV's own 60-second minimum. If a record is already past its
 * deadline, callers should not be writing it at all (see saveChecklistState).
 */
export function ttlSecondsRemaining(createdAt: string, now: Date): number {
  const remainingMs = retentionDeadline(createdAt).getTime() - now.getTime();
  return Math.max(60, Math.floor(remainingMs / 1000));
}

/** True once the 90-day link window has passed, checked against the clock at read time. */
export function isAccessExpired(accessExpiresAt: string, now: Date): boolean {
  return now.getTime() >= new Date(accessExpiresAt).getTime();
}
