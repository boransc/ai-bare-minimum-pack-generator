/**
 * Cloudflare KV over the REST API.
 *
 * Write:  PUT    /accounts/{account}/storage/kv/namespaces/{ns}/values/{key}
 *         multipart/form-data with a `value` part, `expiration_ttl` as a query
 *         parameter (seconds, minimum 60).
 * Read:   GET     same path, returns the raw stored body.
 * Delete: DELETE  same path.
 *
 * Two behaviours worth knowing before relying on this:
 *
 *  - KV is eventually consistent. A write is not guaranteed to be readable
 *    immediately, so never write-then-redirect-then-read. Render from what you
 *    already have and treat KV as the copy for *later*.
 *  - A missing key is a 404, which is not an error here. `getJson` returns null
 *    so callers can distinguish "no such pack" from "KV is broken".
 */

import "server-only";
import { CF_API_BASE, authHeaders, cloudflareConfig } from "./config";

/** KV rejects a TTL below 60 seconds. */
const MIN_TTL_SECONDS = 60;

function valuesUrl(key: string): string {
  const { accountId, kvNamespaceId } = cloudflareConfig();
  return (
    `${CF_API_BASE}/accounts/${accountId}` +
    `/storage/kv/namespaces/${kvNamespaceId}/values/${encodeURIComponent(key)}`
  );
}

export class KvError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "KvError";
  }
}

export interface PutOptions {
  /** Seconds until Cloudflare deletes the key. Values below 60 are raised to 60. */
  expirationTtlSeconds?: number;
  /** Abort budget for the request. */
  timeoutMs?: number;
}

/**
 * Store a JSON value.
 *
 * The TTL is the real deletion guarantee for saved packs: when it lapses,
 * Cloudflare removes the data rather than us remembering to. That is a stronger
 * promise than a `deletedAt` column we have to police.
 */
export async function putJson(
  key: string,
  value: unknown,
  options: PutOptions = {},
): Promise<void> {
  const config = cloudflareConfig();
  const url = new URL(valuesUrl(key));

  if (options.expirationTtlSeconds !== undefined) {
    const ttl = Math.max(MIN_TTL_SECONDS, Math.floor(options.expirationTtlSeconds));
    url.searchParams.set("expiration_ttl", String(ttl));
  }

  // Deliberately not setting Content-Type: fetch derives the multipart
  // boundary from the FormData, and setting it by hand breaks the body.
  const form = new FormData();
  form.set("value", JSON.stringify(value));

  const response = await fetch(url, {
    method: "PUT",
    headers: authHeaders(config),
    body: form,
    signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
  });

  if (!response.ok) {
    throw new KvError(
      `KV write failed for "${key}": ${response.status} ${await safeText(response)}`,
      response.status,
    );
  }
}

/** Read a JSON value. Returns null when the key does not exist or has expired. */
export async function getJson<T>(
  key: string,
  options: { timeoutMs?: number } = {},
): Promise<T | null> {
  const config = cloudflareConfig();

  const response = await fetch(valuesUrl(key), {
    method: "GET",
    headers: authHeaders(config),
    // KV is the source of truth; never let a CDN or fetch cache stand in for it.
    cache: "no-store",
    signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new KvError(
      `KV read failed for "${key}": ${response.status} ${await safeText(response)}`,
      response.status,
    );
  }

  const body = await response.text();
  if (body.length === 0) return null;

  try {
    return JSON.parse(body) as T;
  } catch {
    // Corrupt value. Treat as absent rather than throwing into a page render;
    // the alternative is a saved pack that 500s forever with no way back.
    return null;
  }
}

export async function deleteKey(key: string): Promise<void> {
  const config = cloudflareConfig();
  const response = await fetch(valuesUrl(key), {
    method: "DELETE",
    headers: authHeaders(config),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok && response.status !== 404) {
    throw new KvError(
      `KV delete failed for "${key}": ${response.status}`,
      response.status,
    );
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "<no body>";
  }
}

// ---------------------------------------------------------------------------
// Key naming. One place, so nothing drifts.
// ---------------------------------------------------------------------------

export const kvKeys = {
  /** A saved pack. TTL carries the twelve-month deletion promise. */
  pack: (token: string) => `pack:${token}`,
  /** Cached tailoring, keyed by a hash of the exact inputs. */
  tailoring: (hash: string) => `tailor:${hash}`,
  /** Rate-limit counter for one client in one window. */
  rateLimit: (scope: string, client: string, window: string | number) =>
    `rl:${scope}:${client}:${window}`,
  /** Lead-list index, one key per day. */
  leadIndex: (isoDate: string) => `idx:leads:${isoDate}`,
} as const;
