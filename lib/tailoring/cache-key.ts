/**
 * Cache key for a tailoring request.
 *
 * Two identical requests — same content version, model, wizard answers and
 * unmet controls — must produce the same key regardless of object key order,
 * so JSON.stringify alone is not enough: it is sensitive to insertion order.
 * Sorting keys recursively before stringifying makes the hash a function of
 * content only.
 *
 * On what this cache does and does not protect
 * --------------------------------------------
 * The whole wizard object is hashed, including the free-text organisation
 * name. A security review flagged that as defeating the cache, since two
 * otherwise-identical organisations with different names never share an entry.
 * That is true, and it is nevertheless correct: the tailored text names the
 * organisation in its own prose ("Northgate Housing, a mid-size housing
 * provider..."), so a key that ignored the name would serve one organisation a
 * pack addressed to another. A wrong name in a governance document is a worse
 * outcome than a duplicated model call.
 *
 * The honest consequence is that this cache is a saving on genuinely repeated
 * requests, not a spend limit. The spend limit is the per-IP rate limiter in
 * lib/api/rate-limit.ts, plus the Cloudflare AI Gateway's own caching. Do not
 * reach for this cache as the budget control; it was never able to be one.
 */

import { createHash } from "node:crypto";
import type { ControlNumber, WizardAnswers } from "@/lib/domain/types";

export interface CacheKeyInput {
  contentVersion: string;
  model: string;
  wizard: WizardAnswers;
  unmetControls: ControlNumber[];
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
    const result: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      result[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}

/**
 * Bump whenever the prompt, the slot schema or the validators change.
 *
 * The cache key already covers the content version and the model, but not how
 * we ask. Without this, a prompt fix keeps serving answers produced by the old
 * prompt for the rest of the TTL.
 */
export const PROMPT_VERSION = "2";

export function tailoringCacheKey(input: CacheKeyInput): string {
  const canonical = canonicalize({
    promptVersion: PROMPT_VERSION,
    contentVersion: input.contentVersion,
    model: input.model,
    wizard: input.wizard,
    unmetControls: [...input.unmetControls].sort((a, b) => a - b),
  });
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
