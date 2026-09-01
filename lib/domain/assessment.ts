/**
 * Scoring the eight-point check.
 *
 * Pure functions, no I/O, no randomness, no dates. Given the same answers this
 * always produces the same assessment, which is what lets a saved pack be a
 * dated snapshot rather than a re-derivation.
 *
 * Three rules from the source govern everything here:
 *
 *  1. No partial credit. A control is met only when every applicable
 *     sub-statement is met.
 *  2. Points 4 and 6 are red lines. A no against either means the minimum is
 *     not met, whatever the total says.
 *  3. Applicability is conditioned only where the source itself conditions it.
 */

import { CONTROLS } from "@/content/v1/controls";
import { bandForScore } from "@/content/v1/scoring";
import type {
  Assessment,
  AssessmentAnswers,
  Applicability,
  Control,
  ControlResult,
  SubStatementResult,
  Verdict,
  WizardAnswers,
} from "./types";

/**
 * Whether a sub-statement counts for this organisation.
 *
 * Only 6.3 is ever disapplied, and only when the organisation has told us AI
 * plays no part in decisions about people. "Don't know" keeps it applicable:
 * uncertainty is not an exemption, and the source's evidence test means an
 * unevidenced statement scores no.
 */
function resolveApplicability(
  applicability: Applicability,
  wizard: WizardAnswers,
): { applicable: boolean; disapplyReason?: string } {
  switch (applicability.kind) {
    case "always":
      return { applicable: true };
    case "onlyWhenConsequentialDecisions":
      return wizard.consequentialDecisions === "no"
        ? { applicable: false, disapplyReason: applicability.disapplyReason }
        : { applicable: true };
  }
}

function scoreControl(
  control: Control,
  answers: AssessmentAnswers,
  wizard: WizardAnswers,
): ControlResult {
  const subStatements: SubStatementResult[] = control.subStatements.map((sub) => {
    const { applicable, disapplyReason } = resolveApplicability(
      sub.applicability,
      wizard,
    );

    // An unanswered statement is a no. The source is explicit: where you cannot
    // point to the evidence, score it no. Absence is never a pass.
    const met = applicable ? answers[sub.id] === true : null;

    return {
      id: sub.id,
      text: sub.text,
      applicable,
      met,
      ...(disapplyReason ? { disapplyReason } : {}),
      action: sub.action,
    };
  });

  const applicable = subStatements.filter((s) => s.applicable);
  const unmet = applicable.filter((s) => s.met !== true);

  return {
    number: control.number,
    title: control.title,
    summary: control.summary,
    redLine: control.redLine,
    // No partial credit: every applicable statement must be met.
    met: unmet.length === 0,
    subStatements,
    unmet,
  };
}

export function assess(
  answers: AssessmentAnswers,
  wizard: WizardAnswers,
): Assessment {
  const controls = CONTROLS.map((control) => scoreControl(control, answers, wizard));

  const score = controls.filter((c) => c.met).length;
  const band = bandForScore(score);
  const redLineFailures = controls.filter((c) => c.redLine && !c.met);

  // The red line decides first. The band only gets to speak when no red line
  // has failed, which is how a 7/8 organisation can still be "not met".
  const verdict: Verdict =
    redLineFailures.length > 0 ? "not-met" : score === 8 ? "met" : "not-met";

  return { verdict, score, band, redLineFailures, controls };
}

/** Controls that came back unmet, in control-number order. */
export function unmetControls(assessment: Assessment): ControlResult[] {
  return assessment.controls.filter((c) => !c.met);
}

/**
 * Whether the score alone would read more reassuringly than the verdict.
 *
 * When true, the result page must show the red-line override explicitly, or a
 * reader will take "7 of 8" as good news when the minimum is in fact not met.
 */
export function scoreContradictsVerdict(assessment: Assessment): boolean {
  return assessment.verdict === "not-met" && assessment.score >= 6;
}
