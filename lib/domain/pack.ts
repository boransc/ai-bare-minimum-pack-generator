/**
 * A generated pack: the thing a user sees, prints, and comes back to.
 *
 * This is the shape that crosses the wire and, later, the shape that goes into
 * KV. It is deliberately self-contained: everything needed to render the pack
 * is inside it, so a saved pack renders identically months later without
 * re-running the scoring engine or the model. That is what makes it a dated
 * snapshot rather than a re-derivation.
 */

import { CONTENT_VERSION } from "@/content/v1";
import { assess } from "./assessment";
import { buildChecklist } from "./checklist";
import type {
  Assessment,
  AssessmentAnswers,
  ChecklistItem,
  ControlNumber,
  TailoringResult,
  WizardAnswers,
} from "./types";

/** Which of the source's Full Playbook arguments apply with extra force here. */
export interface PlaybookTriggers {
  noBoardOwner: boolean;
  consequentialDecisions: boolean;
  noPolicy: boolean;
  /** True when any trigger fired: the pathway is shown to everyone, but harder here. */
  anyTriggered: boolean;
}

export interface GeneratedPack {
  /** Bumped when the shape of this record changes, so old records stay readable. */
  schemaVersion: 1;
  /** Which version of the canonical content produced this pack. */
  contentVersion: string;
  /** ISO 8601. Set once, at generation; never recomputed on read. */
  createdAt: string;
  orgName: string | null;
  wizard: WizardAnswers;
  answers: AssessmentAnswers;
  assessment: Assessment;
  checklist: ChecklistItem[];
  playbookTriggers: PlaybookTriggers;
  /** Null when tailoring is off or unavailable. The pack still renders. */
  tailoring: TailoringResult | null;
}

/**
 * The three triggers the client named, each readable straight from data we
 * already hold. No inference, no scoring, no model involvement.
 */
export function playbookTriggers(
  assessment: Assessment,
  wizard: WizardAnswers,
): PlaybookTriggers {
  const controlMet = (n: ControlNumber) =>
    assessment.controls.find((c) => c.number === n)?.met === true;

  const noBoardOwner = !controlMet(1) || wizard.boardOwner !== "named-and-known";
  const consequentialDecisions = wizard.consequentialDecisions === "yes";
  const noPolicy = !controlMet(3);

  return {
    noBoardOwner,
    consequentialDecisions,
    noPolicy,
    anyTriggered: noBoardOwner || consequentialDecisions || noPolicy,
  };
}

/**
 * Assemble a pack from answers.
 *
 * `now` is injected rather than read from the clock so this stays pure and
 * testable, and so a regenerated pack can carry a deliberate timestamp.
 */
export function buildPack(input: {
  wizard: WizardAnswers;
  answers: AssessmentAnswers;
  tailoring: TailoringResult | null;
  now: Date;
}): GeneratedPack {
  const { wizard, answers, tailoring, now } = input;
  const assessment = assess(answers, wizard);

  return {
    schemaVersion: 1,
    contentVersion: CONTENT_VERSION,
    createdAt: now.toISOString(),
    orgName: wizard.orgName,
    wizard,
    answers,
    assessment,
    checklist: buildChecklist(assessment, wizard),
    playbookTriggers: playbookTriggers(assessment, wizard),
    tailoring,
  };
}

/** The name to print on the cover. Never blank. */
export function displayName(pack: Pick<GeneratedPack, "orgName">): string {
  return pack.orgName?.trim() || "Your organisation";
}
