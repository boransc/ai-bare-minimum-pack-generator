/**
 * Static slot -> source-section map.
 *
 * This is the entire grounding mechanism for tailoring: if a fact is not
 * quoted here, the model has no way to say it. No retrieval, no embeddings —
 * the source is one small fixed document with known sections, so a hand-authored
 * map is correct and a search layer would only add a failure mode.
 *
 * Strings are imported from the canonical content files, never retyped, so the
 * map cannot drift from the transcribed source.
 */

import type { ControlNumber } from "@/lib/domain/types";
import { CONTROLS_BY_NUMBER } from "@/content/v1/controls";
import {
  THE_PATTERN,
  THREE_THINGS_THAT_GO_WRONG,
  WHY_YOU_ARE_BEING_ASKED,
  GOVERNING_PRINCIPLE,
} from "@/content/v1/guidance";

/** The only material the model ever sees to write `openingContext` and `riskScenario`. */
export const SHARED_SOURCE_EXCERPT = [
  ...WHY_YOU_ARE_BEING_ASKED,
  ...THREE_THINGS_THAT_GO_WRONG.map((t) => `${t.title}. ${t.body}`),
  THE_PATTERN,
  GOVERNING_PRINCIPLE.body.join(" "),
].join("\n");

/**
 * Per-control excerpt for `controlEmphasis`. Built from the control's own
 * summary, "good enough" and "mistake to avoid" text — nothing invented.
 */
export function controlSourceExcerpt(controlNumber: ControlNumber): string {
  const control = CONTROLS_BY_NUMBER.get(controlNumber);
  if (!control) {
    throw new Error(`No source excerpt mapped for control ${controlNumber}`);
  }
  return [control.summary, control.goodEnough, control.mistakeToAvoid].join(" ");
}
