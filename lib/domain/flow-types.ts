/**
 * Types shared between the client flow and the API boundary.
 *
 * Kept apart from types.ts so client components can import them without
 * pulling in the scoring engine.
 */

import type { WizardAnswers } from "./types";

/** The eight question ids, i.e. every wizard field except the organisation name. */
export type WizardQuestionId = keyof Omit<WizardAnswers, "orgName">;

export type { AssessmentAnswers, WizardAnswers } from "./types";
