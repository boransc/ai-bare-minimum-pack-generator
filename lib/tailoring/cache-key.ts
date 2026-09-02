/**
 * Cache key for a tailoring request.
 *
 * Two identical requests — same content version, model, wizard answers and
 * unmet controls — must produce the same key regardless of object key order,
 * so JSON.stringify alone is not enough: it is sensitive to insertion order.
 * Sorting keys recursively before stringifying makes the hash a function of
 * content only.
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
