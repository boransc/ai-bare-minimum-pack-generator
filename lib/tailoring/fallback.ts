/**
 * Deterministic fallback slots.
 *
 * Used whenever tailoring is disabled, the model call fails, or a slot fails
 * validation. Built from the source's own words so the pack never renders
 * empty or invented text — it renders the untailored source instead.
 */

import { WHY_YOU_ARE_BEING_ASKED } from "@/content/v1/guidance";

export const FALLBACK_OPENING_CONTEXT = WHY_YOU_ARE_BEING_ASKED[0];

/**
 * `riskScenario` fallback is empty on purpose: the source's own three worked
 * examples (`THREE_THINGS_THAT_GO_WRONG`) already render alongside this slot
 * per §6.1, so a fallback here would just repeat them.
 */
export const FALLBACK_RISK_SCENARIO = "";
