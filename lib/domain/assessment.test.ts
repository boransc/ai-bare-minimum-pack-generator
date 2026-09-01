import { describe, expect, test } from "vitest";
import { assess, scoreContradictsVerdict } from "./assessment";
import { ALL_SUB_STATEMENT_IDS, CONTROLS } from "@/content/v1/controls";
import type { AssessmentAnswers, WizardAnswers } from "./types";

const baseWizard: WizardAnswers = {
  orgName: "Test Org",
  sector: "professional-services",
  size: "11-50",
  currentAiUse: "some-teams",
  aiUseTypes: ["drafting"],
  sensitiveData: "occasionally",
  regulated: "no",
  consequentialDecisions: "yes", // keeps 6.3 applicable unless a test says otherwise
  boardOwner: "named-and-known",
};

/** All 19 sub-statements answered yes. */
function allYes(): AssessmentAnswers {
  return Object.fromEntries(ALL_SUB_STATEMENT_IDS.map((id) => [id, true]));
}

/** All yes, except the ids listed. */
function allYesExcept(...ids: string[]): AssessmentAnswers {
  const answers = allYes();
  for (const id of ids) answers[id] = false;
  return answers;
}

describe("source fidelity", () => {
  test("there are eight controls", () => {
    expect(CONTROLS).toHaveLength(8);
  });

  test("there are nineteen sub-statements", () => {
    expect(ALL_SUB_STATEMENT_IDS).toHaveLength(19);
  });

  test("sub-statement ids are unique", () => {
    expect(new Set(ALL_SUB_STATEMENT_IDS).size).toBe(ALL_SUB_STATEMENT_IDS.length);
  });

  test("points 4 and 6 are the red lines, and only those", () => {
    const redLines = CONTROLS.filter((c) => c.redLine).map((c) => c.number);
    expect(redLines).toEqual([4, 6]);
  });

  test("6.3 is the only conditional sub-statement", () => {
    const conditional = CONTROLS.flatMap((c) => c.subStatements)
      .filter((s) => s.applicability.kind !== "always")
      .map((s) => s.id);
    expect(conditional).toEqual(["6.3"]);
  });
});

describe("scoring", () => {
  test("all yes scores 8 and the minimum is in place", () => {
    const result = assess(allYes(), baseWizard);
    expect(result.score).toBe(8);
    expect(result.verdict).toBe("met");
    expect(result.redLineFailures).toHaveLength(0);
    expect(result.band.id).toBe("eight");
  });

  test("all no scores 0", () => {
    const result = assess({}, baseWizard);
    expect(result.score).toBe(0);
    expect(result.verdict).toBe("not-met");
    expect(result.band.id).toBe("zeroToTwo");
  });

  test("an unanswered sub-statement is a no, never a pass", () => {
    const answers = allYes();
    delete answers["1.1"];
    const result = assess(answers, baseWizard);
    expect(result.controls.find((c) => c.number === 1)?.met).toBe(false);
    expect(result.score).toBe(7);
  });

  test("no partial credit: one unmet sub-statement fails the whole control", () => {
    // Point 8 has three sub-statements. Failing only the third still fails point 8.
    const result = assess(allYesExcept("8.3"), baseWizard);
    const control8 = result.controls.find((c) => c.number === 8);
    expect(control8?.met).toBe(false);
    expect(control8?.unmet.map((s) => s.id)).toEqual(["8.3"]);
    expect(result.score).toBe(7);
  });
});

describe("the red-line rule", () => {
  test("7/8 failing point 4 is NOT MET, despite the reassuring total", () => {
    const result = assess(allYesExcept("4.1"), baseWizard);
    expect(result.score).toBe(7);
    expect(result.band.id).toBe("sixToSeven");
    expect(result.verdict).toBe("not-met");
    expect(result.redLineFailures.map((c) => c.number)).toEqual([4]);
  });

  test("7/8 failing point 6 is NOT MET", () => {
    const result = assess(allYesExcept("6.2"), baseWizard);
    expect(result.score).toBe(7);
    expect(result.verdict).toBe("not-met");
    expect(result.redLineFailures.map((c) => c.number)).toEqual([6]);
  });

  test("7/8 failing a non-red-line point is also not met, but for the score", () => {
    // Only 8/8 is "met". The distinction that matters is that redLineFailures
    // is empty, so the page does not show the red-line override block.
    const result = assess(allYesExcept("7.1"), baseWizard);
    expect(result.score).toBe(7);
    expect(result.verdict).toBe("not-met");
    expect(result.redLineFailures).toHaveLength(0);
  });

  test("both red lines failing reports both", () => {
    const result = assess(allYesExcept("4.2", "6.1"), baseWizard);
    expect(result.redLineFailures.map((c) => c.number)).toEqual([4, 6]);
  });

  test("scoreContradictsVerdict flags exactly the misleading cases", () => {
    // 7/8 with a red line down: the number reads better than the truth.
    expect(scoreContradictsVerdict(assess(allYesExcept("4.1"), baseWizard))).toBe(true);
    // 2/8: nothing misleading about it.
    expect(
      scoreContradictsVerdict(
        assess(allYesExcept("1.1", "2.1", "3.1", "4.1", "5.1", "6.1"), baseWizard),
      ),
    ).toBe(false);
    // 8/8: met, nothing to flag.
    expect(scoreContradictsVerdict(assess(allYes(), baseWizard))).toBe(false);
  });
});

describe("conditional applicability of 6.3", () => {
  const noConsequential: WizardAnswers = {
    ...baseWizard,
    consequentialDecisions: "no",
  };

  test("6.3 is disapplied when AI plays no part in decisions about people", () => {
    const answers = allYes();
    delete answers["6.3"];
    const result = assess(answers, noConsequential);

    const control6 = result.controls.find((c) => c.number === 6);
    const sub63 = control6?.subStatements.find((s) => s.id === "6.3");

    expect(sub63?.applicable).toBe(false);
    expect(sub63?.met).toBeNull();
    expect(sub63?.disapplyReason).toBeTruthy();
    // Point 6 still passes on its other two statements.
    expect(control6?.met).toBe(true);
    expect(result.score).toBe(8);
  });

  test("a disapplied statement generates no action", () => {
    const answers = allYes();
    delete answers["6.3"];
    const result = assess(answers, noConsequential);
    const control6 = result.controls.find((c) => c.number === 6);
    expect(control6?.unmet).toHaveLength(0);
  });

  test("'don't know' keeps 6.3 applicable — uncertainty is not an exemption", () => {
    const answers = allYes();
    delete answers["6.3"];
    const result = assess(answers, {
      ...baseWizard,
      consequentialDecisions: "dont-know",
    });

    const control6 = result.controls.find((c) => c.number === 6);
    expect(control6?.subStatements.find((s) => s.id === "6.3")?.applicable).toBe(true);
    expect(control6?.met).toBe(false);
    expect(result.redLineFailures.map((c) => c.number)).toEqual([6]);
  });

  test("disapplying 6.3 never disapplies the rest of point 6", () => {
    const result = assess(allYesExcept("6.1"), noConsequential);
    expect(result.controls.find((c) => c.number === 6)?.met).toBe(false);
    expect(result.redLineFailures.map((c) => c.number)).toEqual([6]);
  });
});

describe("bands cover every score", () => {
  test.each([0, 1, 2, 3, 4, 5, 6, 7, 8])("score %i resolves to a band", (target) => {
    // Turn on sub-statements control by control until we hit the target score.
    const answers: AssessmentAnswers = {};
    for (const control of CONTROLS.slice(0, target)) {
      for (const sub of control.subStatements) answers[sub.id] = true;
    }
    const result = assess(answers, baseWizard);
    expect(result.score).toBe(target);
    expect(result.band).toBeDefined();
    expect(target).toBeGreaterThanOrEqual(result.band.min);
    expect(target).toBeLessThanOrEqual(result.band.max);
  });
});
