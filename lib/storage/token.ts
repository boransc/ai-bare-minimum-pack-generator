/**
 * The personal return link's credential.
 *
 * There are no accounts, so the token itself carries the access right: anyone
 * with the URL can see the pack. That means it has to be genuinely
 * unguessable (128 bits, drawn from a CSPRNG) and cheap to reject when it
 * isn't — a malformed token should 404 before it ever reaches a KV lookup,
 * both to save the round trip and so we never hand an attacker a timing
 * signal between "bad shape" and "not found".
 */

import { randomBytes } from "node:crypto";

/** 16 bytes = 128 bits of entropy, base64url-encoded to ~22 characters. */
const TOKEN_BYTES = 16;

/** base64url alphabet only: unpadded, URL-safe, no ambiguity in a link. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22,64}$/;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** True for anything shaped like a token we could have issued. */
export function isValidToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}
