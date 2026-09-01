/**
 * Building the remediation checklist.
 *
 * The checklist and the thirty-day plan are the same object seen two ways: the
 * checklist is what you tick, the plan is when you do it. Both are ordered by
 * the source, never by us.
 *
 * Ordering:
 *   1. Failed red lines first (points 4 and 6), because the source says so.
 *   2. Everything else in thirty-day-plan sequence.
 *   3. "Find out" items last, since they are uncertainty rather than a gap
 *      against the Standard.
 *
 * Wizard context never changes position. It changes emphasis and explanation,
 * which is the tailoring layer's job, not this one's. There is deliberately no
 * priority score here for a model to rationalise.
 */

import { CONTROLS_BY_NUMBER } from "@/content/v1/controls";
import { PLAN_CONTROL_ORDER } from "@/content/v1/guidance";
import { FIND_OUT_ACTIONS } from "@/content/v1/wizard";
import type {
  Assessment,
  ChecklistItem,
  ControlNumber,
  WizardAnswers,
} from "./types";

/** Position of a control in the source thirty-day plan. Unlisted controls sort last. */
function planPosition(control: ControlNumber): number {
  const index = PLAN_CONTROL_ORDER.indexOf(control);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

/**
 * Remediation items, one per unmet sub-statement.
 *
 * Sub-statement level, not control level: telling someone "your data rules are
 * not explicit" is not actionable, whereas telling them "check the data terms
 * for every tool cleared for personal data" is.
 */
function remediationItems(assessment: Assessment): ChecklistItem[] {
  const items = assessment.controls.flatMap((control) =>
    control.unmet.map((sub) => ({
      id: sub.id,
      title: sub.action.title,
      detail: sub.action.detail,
      controlNumber: control.number,
      redLine: control.redLine,
      planWeek: CONTROLS_BY_NUMBER.get(control.number)?.planWeek,
      kind: "remediation" as const,
    })),
  );

  return items.sort((a, b) => {
    // Red lines first, whatever the plan says.
    if (a.redLine !== b.redLine) return a.redLine ? -1 : 1;

    // Then the source's own thirty-day sequence.
    const byPlan =
      planPosition(a.controlNumber as ControlNumber) -
      planPosition(b.controlNumber as ControlNumber);
    if (byPlan !== 0) return byPlan;

    // Then sub-statement order within a control, so 4.1 precedes 4.2.
    return a.id.localeCompare(b.id, "en", { numeric: true });
  });
}

/** "Find out" items, from wizard answers of "don't know". */
function findOutItems(wizard: WizardAnswers): ChecklistItem[] {
  const uncertain = (
    Object.keys(FIND_OUT_ACTIONS) as Array<keyof typeof FIND_OUT_ACTIONS>
  ).filter((field) => {
    const value = wizard[field];
    return Array.isArray(value)
      ? value.includes("dont-know")
      : value === "dont-know";
  });

  return uncertain.flatMap((field) => {
    const action = FIND_OUT_ACTIONS[field];
    if (!action) return [];
    return [
      {
        id: `find-out:${field}`,
        title: action.title,
        detail: action.detail,
        redLine: false,
        kind: "find-out" as const,
      },
    ];
  });
}

export function buildChecklist(
  assessment: Assessment,
  wizard: WizardAnswers,
): ChecklistItem[] {
  return [...remediationItems(assessment), ...findOutItems(wizard)];
}

/**
 * The handful of items the result page leads with.
 *
 * Just the top of the same ordered list — not a separate judgement, and not
 * something a model gets to choose.
 */
export function whatToDoFirst(items: ChecklistItem[], count = 3): ChecklistItem[] {
  return items.filter((i) => i.kind === "remediation").slice(0, count);
}
