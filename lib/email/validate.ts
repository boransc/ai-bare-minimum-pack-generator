/**
 * Email validation, kept free of any server-only import so it can be
 * unit-tested directly under Vitest (same reasoning as packs-pure.ts).
 *
 * Deliberately simple: this is a courtesy check before we hand the address
 * to Resend, not a guarantee of deliverability. Reject the obviously wrong
 * shape and an implausible length; let the provider be the real judge.
 */

/** Comfortably above any real address; guards against a pasted essay. */
export const MAX_EMAIL_LENGTH = 254;

// Deliberately conservative: one "@", no whitespace, at least one "." after
// the "@". Not a full RFC 5322 parser — we don't need one for this.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  if (value.length === 0 || value.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_PATTERN.test(value);
}
