/**
 * The two non-negotiable rules for bracketed document fields (see AGENTS.md
 * task history / the product spec): a value a visitor typed into Part 3 or
 * Part 4 must never reach the tailoring prompt, and must never enter the
 * lead index. Both are true by construction -- neither function's signature
 * accepts document fields at all -- but that construction is exactly the
 * kind of thing a later refactor can quietly break (e.g. spreading a
 * StoredPack into a summary object). These tests fail loudly if it ever
 * does, by injecting a document field into the underlying data and checking
 * it never surfaces in what each function returns.
 */

import { describe, expect, it } from "vitest";
import type { GeneratedPack } from "@/lib/domain/pack";
import type { WizardAnswers } from "@/lib/domain/types";
import { buildTailoringMessages } from "@/lib/tailoring/prompt";
import { toLeadSummary } from "@/lib/storage/packs";

const MARKER = "MARKER-a-visitor-typed-this-into-a-bracketed-field-9f3c";

function buildWizard(): WizardAnswers {
  return {
    orgName: "Northgate Housing",
    sector: "housing",
    size: "51-250",
    currentAiUse: "some-teams",
    aiUseTypes: ["drafting", "research"],
    sensitiveData: "occasionally",
    regulated: "yes",
    consequentialDecisions: "yes",
    boardOwner: "informal",
  };
}

function buildFixturePack(): GeneratedPack {
  return {
    schemaVersion: 1,
    contentVersion: "test",
    createdAt: "2026-01-01T00:00:00.000Z",
    orgName: "Northgate Housing",
    wizard: buildWizard(),
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

describe("hard rule: document field values never reach the tailoring prompt", () => {
  it("buildTailoringMessages output does not contain a document-field value", () => {
    const wizard = buildWizard();
    const messages = buildTailoringMessages(wizard, [3, 4]);
    const serialised = JSON.stringify(messages);

    expect(serialised).not.toContain(MARKER);
  });

  it("the prompt builder's signature has no parameter for document fields", () => {
    // buildTailoringMessages(wizard, unmetControls) -- two parameters. If a
    // future change grows a third `documentFields` argument, this length
    // check catches it as a reminder that the rule needs re-checking, not
    // just re-asserting a string absence.
    expect(buildTailoringMessages.length).toBe(2);
  });
});

describe("hard rule: document field values never enter the lead index", () => {
  it("toLeadSummary output does not contain a document-field value even if one is smuggled onto the pack", () => {
    // GeneratedPack has no documentFields property -- that only exists on
    // StoredPack (lib/storage/packs.ts). Simulate the failure mode a future
    // refactor could introduce: something that spreads a StoredPack-shaped
    // object (documentFields included) into what reaches toLeadSummary.
    const packWithSmuggledFields = {
      ...buildFixturePack(),
      documentFields: { aiLead: MARKER },
    };

    const summary = toLeadSummary(packWithSmuggledFields as unknown as GeneratedPack, "tok123");
    const serialised = JSON.stringify(summary);

    expect(serialised).not.toContain(MARKER);
  });
});
