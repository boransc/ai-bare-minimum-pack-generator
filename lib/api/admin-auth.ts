/**
 * Passcode gate for /admin.
 *
 * The whole product is public — the visitor-facing wizard and pack pages must
 * never be protected by this. Only the admin lead list needs a gate, and it
 * is deliberately the simplest thing that is not embarrassing: one shared
 * passcode from the environment, compared with a timing-safe check, backing
 * an httpOnly cookie.
 *
 * The cookie does not carry the raw passcode. It carries a SHA-256 digest of
 * it, so a leaked cookie (log line, browser extension, XSS in some other
 * part of the page) does not hand over the passcode itself — just a token
 * that is only useful as this cookie. Proxy compares digests, not secrets in
 * the clear, and does so with `timingSafeEqual` on two fixed-length buffers
 * so a wrong guess cannot be timed to learn how many leading bytes matched.
 */

import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "admin_auth";

/** 12 hours: long enough not to be annoying, short enough that a shared laptop is not a standing risk. */
export const ADMIN_COOKIE_MAX_AGE_SECONDS = 12 * 60 * 60;

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** Undefined/empty means "not configured" — callers must refuse access, not allow it. */
export function adminPasscodeConfigured(): boolean {
  return Boolean(process.env.APP_PASSCODE && process.env.APP_PASSCODE.length > 0);
}

/**
 * The value the cookie should hold once a visitor proves they know the
 * passcode. Also what `isValidAdminCookie` compares an incoming cookie
 * against, so both sides derive it the same way.
 */
export function adminCookieToken(): string | null {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) return null;
  return digest(passcode).toString("hex");
}

/**
 * Timing-safe comparison of a submitted passcode against the configured one.
 * Both sides are hashed to a fixed 32-byte digest first: `timingSafeEqual`
 * throws on unequal-length buffers, and comparing raw strings of whatever
 * length the visitor typed would either throw on a length mismatch (a signal
 * in itself) or, if guarded with a length check first, leak length through
 * timing anyway. Hashing first removes both problems.
 */
export function verifyPasscode(submitted: string): boolean {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) return false;
  return timingSafeEqual(digest(submitted), digest(passcode));
}

/** Same fixed-length-buffer comparison, applied to the cookie value on every gated request. */
export function isValidAdminCookie(cookieValue: string | undefined): boolean {
  const expected = adminCookieToken();
  if (!expected || !cookieValue) return false;
  // Cookie values are attacker-influenced; only compare once both sides are
  // the same known length, which the hex-encoded digest guarantees when it
  // parses, and reject anything that does not even look like one.
  // Node's Buffer.from(x, "hex") silently truncates at the first non-hex
  // character rather than throwing, which would otherwise turn a malformed
  // cookie into a length mismatch that crashes `timingSafeEqual` below.
  if (cookieValue.length !== expected.length || !/^[0-9a-f]+$/i.test(cookieValue)) return false;
  return timingSafeEqual(Buffer.from(cookieValue, "hex"), Buffer.from(expected, "hex"));
}
