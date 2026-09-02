/**
 * Layer 1: strict structured output shape for the three tailoring slots.
 *
 * Zod validates what comes BACK. The JSON Schema sent to the model is built
 * separately by `slotsJsonSchema`, and deliberately so.
 *
 * Deriving it with `z.toJSONSchema(SlotsSchema)` was the obvious move and it
 * fails: `z.record()` emits `propertyNames`, and Workers AI answers
 *
 *   400 Grammar error: Unimplemented keys: ["propertyNames"]
 *
 * so every call errored and every slot silently fell back to source text. The
 * pack still rendered, which is exactly why this needed a live check to catch.
 *
 * Building the schema by hand also steers better: naming the requested control
 * numbers as explicit required properties tells the model precisely which keys
 * to produce, where a record only says "some strings".
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

/**
 * Sent as `response_format.json_schema`.
 *
 * Restricted to the JSON Schema keywords Workers AI's grammar engine actually
 * implements: type, properties, required, additionalProperties, maxLength.
 * No `propertyNames`, no `$schema`, no `patternProperties`.
 */
export function slotsJsonSchema(
  unmetControls: readonly ControlNumber[],
): Record<string, unknown> {
  const emphasisProperties = Object.fromEntries(
    unmetControls.map((n) => [
      String(n),
      { type: "string", maxLength: SLOT_CAPS.controlEmphasis },
    ]),
  );

  return {
    type: "object",
    properties: {
      openingContext: { type: "string", maxLength: SLOT_CAPS.openingContext },
      riskScenario: { type: "string", maxLength: SLOT_CAPS.riskScenario },
      controlEmphasis: {
        type: "object",
        properties: emphasisProperties,
        required: unmetControls.map(String),
        additionalProperties: false,
      },
    },
    required: ["openingContext", "riskScenario", "controlEmphasis"],
    additionalProperties: false,
  };
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
