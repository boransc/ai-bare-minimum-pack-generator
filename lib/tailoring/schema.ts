/**
 * Layer 1: strict structured output shape for the three tailoring slots.
 *
 * The Zod schema is the single source of truth; the JSON Schema handed to
 * Workers AI's `response_format` is derived from it with `z.toJSONSchema`, so
 * the two can never drift apart.
 */

import { z } from "zod";
import type { ControlNumber } from "@/lib/domain/types";

export const SLOT_CAPS = {
  openingContext: 350,
  riskScenario: 600,
  controlEmphasis: 200,
} as const;

export const SlotsSchema = z.object({
  openingContext: z.string().max(SLOT_CAPS.openingContext),
  riskScenario: z.string().max(SLOT_CAPS.riskScenario),
  controlEmphasis: z.record(z.string(), z.string().max(SLOT_CAPS.controlEmphasis)),
});

export type ParsedSlots = z.infer<typeof SlotsSchema>;

/** Sent as `response_format.json_schema`. Not every Workers AI model honours it. */
export function slotsJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(SlotsSchema) as Record<string, unknown>;
}

/**
 * The model returns `controlEmphasis` keyed by string (JSON has no numeric
 * keys). This turns those back into `ControlNumber`s, dropping anything that
 * is not a control we actually asked about.
 */
export function controlEmphasisKeys(
  controlEmphasis: Record<string, string>,
  expected: ControlNumber[],
): Partial<Record<ControlNumber, string>> {
  const result: Partial<Record<ControlNumber, string>> = {};
  for (const [key, value] of Object.entries(controlEmphasis)) {
    const n = Number(key) as ControlNumber;
    if (expected.includes(n)) result[n] = value;
  }
  return result;
}
