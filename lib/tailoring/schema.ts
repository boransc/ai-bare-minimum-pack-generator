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
import type { ControlNumber, TailoringResult } from "@/lib/domain/types";

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

// ---------------------------------------------------------------------------
// Regenerate: one slot, not the whole set.
//
// Deliberately kept in this file (no "server-only" import anywhere above)
// rather than lib/tailoring/index.ts, because both a server route and the
// client component that renders the regenerate button need the same
// definition of "which slot" and the same merge logic for applying a
// regenerated slot's text back into a TailoringResult. index.ts pulls in
// server-only modules (Workers AI, KV) that must never reach the browser
// bundle, so the shared, side-effect-free pieces live here instead.
// ---------------------------------------------------------------------------

/**
 * Which single slot to redo. The discriminated union is the whole point: it
 * is impossible to construct a `controlEmphasis` selector without a control
 * number, and impossible to attach one to `openingContext` or `riskScenario`.
 */
export type SlotSelector =
  | { slot: "openingContext" }
  | { slot: "riskScenario" }
  | { slot: "controlEmphasis"; control: ControlNumber };

/** The `provenance`/`rejections` key a selector corresponds to. */
export function slotSelectorKey(selector: SlotSelector): string {
  return selector.slot === "controlEmphasis"
    ? `controlEmphasis.${selector.control}`
    : selector.slot;
}

export function singleSlotCap(selector: SlotSelector): number {
  return SLOT_CAPS[selector.slot];
}

/**
 * The JSON Schema for a single-slot regeneration call. Same restricted
 * keyword set as `slotsJsonSchema` (Workers AI's grammar engine has no
 * `propertyNames`), just for an object with one named string property
 * instead of three.
 */
export function singleSlotJsonSchema(selector: SlotSelector): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      value: { type: "string", maxLength: singleSlotCap(selector) },
    },
    required: ["value"],
    additionalProperties: false,
  };
}

export const SingleSlotSchema = z.object({ value: z.string() });

/**
 * Merge one regenerated slot's text into an existing `TailoringResult`.
 *
 * Pure and shared: the regenerate endpoint uses it to build what gets
 * persisted, and the client uses the identical function to update the page
 * optimistically once the endpoint confirms success, so the two can never
 * disagree about what "regenerating riskScenario" means.
 */
/**
 * The regenerate endpoint's request shape. Lives here rather than in the
 * route file so the offline test suite can exercise it directly without
 * pulling in anything that imports "server-only" (route.ts -> lib/tailoring
 * -> Workers AI / KV), and so the route and any future caller share one
 * definition of "which slot names and control pairings are even legal".
 */
export const regenerateRequestSchema = z
  .object({
    token: z.string(),
    slot: z.enum(["openingContext", "riskScenario", "controlEmphasis"]),
    control: z.number().int().min(1).max(8).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.slot === "controlEmphasis" ? value.control !== undefined : value.control === undefined,
    { message: "control is required for controlEmphasis and must be absent otherwise" },
  );

export function applyRegeneratedSlot(
  tailoring: TailoringResult,
  selector: SlotSelector,
  text: string,
): TailoringResult {
  const slotKey = slotSelectorKey(selector);

  return {
    ...tailoring,
    slots:
      selector.slot === "controlEmphasis"
        ? {
            ...tailoring.slots,
            controlEmphasis: { ...tailoring.slots.controlEmphasis, [selector.control]: text },
          }
        : { ...tailoring.slots, [selector.slot]: text },
    provenance: { ...tailoring.provenance, [slotKey]: "model" },
    // The slot just succeeded, so any earlier fallback reason no longer applies.
    rejections: tailoring.rejections.filter((r) => r.slot !== slotKey),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Does this result contain any actual model text?
 *
 * Gates persistence. A wholly-fallback result is the same static prose the page
 * shows anyway, and storing it against the pack would be worse than storing
 * nothing: the next visit would find stored tailoring, hand it straight back
 * and never call the model again, freezing one transient failure into the
 * pack's permanent state. The 30-day slot cache had this exact bug once.
 */
export function hasModelText(
  tailoring: TailoringResult | null,
): tailoring is TailoringResult {
  if (!tailoring) return false;
  return Object.values(tailoring.provenance).some((p) => p === "model");
}
