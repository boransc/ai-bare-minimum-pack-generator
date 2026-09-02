import { describe, expect, it } from "vitest";
import { WIZARD_QUESTIONS } from "@/content/v1/wizard";
import type { GeneratedPack } from "@/lib/domain/pack";
import { leadAnswerLabel, leadAnswerLabels, NOT_RECORDED, toLeadSummary } from "./packs";

/** A minimal but complete GeneratedPack, just enough for toLeadSummary to read from. */
function buildFixturePack(): GeneratedPack {
  return {
    schemaVersion: 1,
    contentVersion: "test",
    createdAt: "2026-01-01T00:00:00.000Z",
    orgName: "Northgate Housing",
    wizard: {
      orgName: "Northgate Housing",
      sector: "housing",
      size: "51-250",
      currentAiUse: "some-teams",
      aiUseTypes: ["drafting", "research"],
      sensitiveData: "occasionally",
      regulated: "yes",
      consequentialDecisions: "yes",
      boardOwner: "informal",
    },
    answers: {},
    assessment: {
      verdict: "not-met",
      score: 5,
      band: { id: "threeToFive", min: 3, max: 5, whereThatLeavesYou: "", whatToDoNext: "" },
      redLineFailures: [],
      controls: [],
    },
    checklist: [],
    playbookTriggers: {
      noBoardOwner: true,
      consequentialDecisions: true,
      noPolicy: false,
      anyTriggered: true,
    },
    tailoring: null,
  };
}

describe("toLeadSummary", () => {
  it("captures all eight wizard answers, not just sector and size", () => {
    const summary = toLeadSummary(buildFixturePack(), "tok123");

    expect(summary.sector).toBe("housing");
    expect(summary.size).toBe("51-250");
    expect(summary.currentAiUse).toBe("some-teams");
    expect(summary.aiUseTypes).toEqual(["drafting", "research"]);
    expect(summary.sensitiveData).toBe("occasionally");
    expect(summary.regulated).toBe("yes");
    expect(summary.consequentialDecisions).toBe("yes");
    expect(summary.boardOwner).toBe("informal");
  });
});

describe("leadAnswerLabel / leadAnswerLabels: backward compatibility", () => {
  it("an old-shape lead row (missing the new fields) reads back without throwing, reporting them as not recorded", () => {
    // Simulates a row written before these fields existed: the properties
    // are simply absent, not present-and-empty.
    const oldRow: { sector?: string; boardOwner?: string; aiUseTypes?: string[] } = {
      sector: "housing",
    };

    expect(() => leadAnswerLabel("boardOwner", oldRow.boardOwner)).not.toThrow();
    expect(leadAnswerLabel("boardOwner", oldRow.boardOwner)).toBe(NOT_RECORDED);
    expect(leadAnswerLabels("aiUseTypes", oldRow.aiUseTypes)).toBe(NOT_RECORDED);

    // The field that *was* recorded still resolves to its real label.
    expect(leadAnswerLabel("sector", oldRow.sector)).toBe("Housing");
  });

  it("a value that matches no known option degrades to not-recorded rather than rendering raw", () => {
    expect(leadAnswerLabel("boardOwner", "some-future-value-not-yet-an-option")).toBe(NOT_RECORDED);
    expect(leadAnswerLabels("aiUseTypes", ["drafting", "some-future-value"])).toBe(NOT_RECORDED);
  });
});

describe("wizard answer label coverage", () => {
  // Every enum value WizardAnswers can hold is, by construction, one of the
  // option values listed in content/v1/wizard.ts (that file's whole job is to
  // be the single source of these labels). If a question's options ever grow
  // an entry whose label lookup fails, that is exactly the drift this guards
  // against: an unmapped value must fail this test, not render raw in the
  // admin UI.
  for (const question of WIZARD_QUESTIONS) {
    for (const option of question.options) {
      it(`${question.id} = "${option.value}" maps to a real label`, () => {
        const label =
          question.type === "multi"
            ? leadAnswerLabels(question.id, [option.value])
            : leadAnswerLabel(question.id, option.value);

        expect(label).toBe(option.label);
        expect(label).not.toBe(NOT_RECORDED);
      });
    }
  }
});
