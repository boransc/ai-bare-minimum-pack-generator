import { describe, expect, test } from "vitest";
import { assess } from "./assessment";
import { buildChecklist, whatToDoFirst } from "./checklist";
import { ALL_SUB_STATEMENT_IDS } from "@/content/v1/controls";
import { PLAN_CONTROL_ORDER } from "@/content/v1/guidance";
import type { AssessmentAnswers, WizardAnswers } from "./types";

const baseWizard: WizardAnswers = {
  orgName: "Test Org",
  sector: "housing",
  size: "51-250",
  currentAiUse: "some-teams",
  aiUseTypes: ["drafting", "data-analysis"],
  sensitiveData: "routinely",
  regulated: "yes",
  consequentialDecisions: "yes",
  boardOwner: "no",
};

function allYesExcept(...ids: string[]): AssessmentAnswers {
  const answers = Object.fromEntries(ALL_SUB_STATEMENT_IDS.map((id) => [id, true]));
  for (const id of ids) answers[id] = false;
  return answers;
}

/** Nothing evidenced at all — the worst case, and the fullest checklist. */
const NOTHING: AssessmentAnswers = {};

describe("ordering", () => {
  test("red lines come first even when the plan would put them later", () => {
    // Point 1 is week 1 of the plan; points 4 and 6 are week 2. Red lines win.
    const assessment = assess(NOTHING, baseWizard);
    const items = buildChecklist(assessment, baseWizard);

    const redLineCount = items.filter((i) => i.redLine).length;
    const firstNonRedLine = items.findIndex((i) => !i.redLine);

    expect(redLineCount).toBeGreaterThan(0);
    expect(firstNonRedLine).toBe(redLineCount);
    expect(items.slice(0, redLineCount).every((i) => i.redLine)).toBe(true);
  });

  test("red-line items are drawn only from points 4 and 6", () => {
    const items = buildChecklist(assess(NOTHING, baseWizard), baseWizard);
    const redLineControls = new Set(
      items.filter((i) => i.redLine).map((i) => i.controlNumber),
    );
    expect([...redLineControls].sort()).toEqual([4, 6]);
  });

  test("non-red-line items follow the source thirty-day sequence", () => {
    const items = buildChecklist(assess(NOTHING, baseWizard), baseWizard);
    const order = items
      .filter((i) => !i.redLine && i.kind === "remediation")
      .map((i) => i.controlNumber as number);

    const distinct = [...new Set(order)];
    const expected = PLAN_CONTROL_ORDER.filter((c) => c !== 4 && c !== 6);

    expect(distinct).toEqual(expected);
    // Which, spelled out, is week 1 (1, 2, 5), week 3 (3), then week 4 (7, 8).
    expect(distinct).toEqual([1, 2, 5, 3, 7, 8]);
  });

  test("sub-statements stay in order within a control", () => {
    const items = buildChecklist(assess(NOTHING, baseWizard), baseWizard);
    const pointFour = items.filter((i) => i.controlNumber === 4).map((i) => i.id);
    expect(pointFour).toEqual(["4.1", "4.2"]);
  });

  test("find-out items come last", () => {
    const wizard: WizardAnswers = { ...baseWizard, sensitiveData: "dont-know" };
    const items = buildChecklist(assess(NOTHING, wizard), wizard);
    const lastRemediation = items.map((i) => i.kind).lastIndexOf("remediation");
    const firstFindOut = items.map((i) => i.kind).indexOf("find-out");
    expect(firstFindOut).toBeGreaterThan(lastRemediation);
  });
});

describe("what the checklist contains", () => {
  test("one item per unmet sub-statement, not per control", () => {
    // Point 4 fails on both its statements; that is two actionable items.
    const assessment = assess(allYesExcept("4.1", "4.2"), baseWizard);
    const items = buildChecklist(assessment, baseWizard);
    expect(items.filter((i) => i.kind === "remediation")).toHaveLength(2);
    expect(items.map((i) => i.id)).toEqual(["4.1", "4.2"]);
  });

  test("a fully evidenced organisation gets no remediation items", () => {
    const assessment = assess(allYesExcept(), baseWizard);
    const items = buildChecklist(assessment, baseWizard);
    expect(items.filter((i) => i.kind === "remediation")).toHaveLength(0);
  });

  test("a disapplied sub-statement generates no item", () => {
    const wizard: WizardAnswers = { ...baseWizard, consequentialDecisions: "no" };
    const answers = allYesExcept();
    delete answers["6.3"];
    const items = buildChecklist(assess(answers, wizard), wizard);
    expect(items.find((i) => i.id === "6.3")).toBeUndefined();
  });

  test("every remediation item carries an actionable title and detail", () => {
    const items = buildChecklist(assess(NOTHING, baseWizard), baseWizard);
    for (const item of items) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.detail.length).toBeGreaterThan(0);
    }
  });

  test("nothing evidenced produces an item for all nineteen statements", () => {
    const items = buildChecklist(assess(NOTHING, baseWizard), baseWizard);
    expect(items.filter((i) => i.kind === "remediation")).toHaveLength(19);
  });
});

describe("find-out items", () => {
  test("each 'don't know' answer produces exactly one", () => {
    const wizard: WizardAnswers = {
      ...baseWizard,
      currentAiUse: "dont-know",
      regulated: "dont-know",
      boardOwner: "dont-know",
    };
    const items = buildChecklist(assess(allYesExcept(), wizard), wizard);
    const findOut = items.filter((i) => i.kind === "find-out");
    expect(findOut).toHaveLength(3);
    expect(findOut.every((i) => !i.redLine)).toBe(true);
  });

  test("'don't know' inside a multi-select counts too", () => {
    const wizard: WizardAnswers = { ...baseWizard, aiUseTypes: ["dont-know"] };
    const items = buildChecklist(assess(allYesExcept(), wizard), wizard);
    expect(items.filter((i) => i.kind === "find-out")).toHaveLength(1);
  });

  test("certainty produces none", () => {
    const items = buildChecklist(assess(allYesExcept(), baseWizard), baseWizard);
    expect(items.filter((i) => i.kind === "find-out")).toHaveLength(0);
  });
});

describe("what to do first", () => {
  test("leads with the failed red lines", () => {
    const assessment = assess(NOTHING, baseWizard);
    const first = whatToDoFirst(buildChecklist(assessment, baseWizard));
    expect(first).toHaveLength(3);
    expect(first.every((i) => i.redLine)).toBe(true);
  });

  test("falls through to plan order when no red line failed", () => {
    const assessment = assess(allYesExcept("1.1", "7.1"), baseWizard);
    const first = whatToDoFirst(buildChecklist(assessment, baseWizard));
    // Point 1 is week 1, point 7 is week 4.
    expect(first.map((i) => i.id)).toEqual(["1.1", "7.1"]);
  });

  test("excludes find-out items, which are not gaps against the Standard", () => {
    const wizard: WizardAnswers = { ...baseWizard, sensitiveData: "dont-know" };
    const first = whatToDoFirst(buildChecklist(assess(allYesExcept(), wizard), wizard));
    expect(first).toHaveLength(0);
  });
});
