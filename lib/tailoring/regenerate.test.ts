import { describe, expect, test } from "vitest";
import { buildRegenerateMessages } from "./prompt";
import {
  applyRegeneratedSlot,
  regenerateRequestSchema,
  singleSlotCap,
  singleSlotJsonSchema,
  SingleSlotSchema,
  slotSelectorKey,
  type SlotSelector,
} from "./schema";
import { validateSlotText } from "./validate";
import type { TailoringResult, WizardAnswers } from "@/lib/domain/types";
import { CONTROLS_BY_NUMBER } from "@/content/v1/controls";

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

// ---------------------------------------------------------------------------
// The single-slot prompt shares the real builder, not a second looser path.
// ---------------------------------------------------------------------------

describe("buildRegenerateMessages", () => {
  test("uses the same system prompt (situations/obligations boundary, delimited org name) as first generation", () => {
    const messages = buildRegenerateMessages(baseWizard, [4, 6], { slot: "openingContext" }, "nonce-1");
    const system = messages.find((m) => m.role === "system")!.content;
    const user = messages.find((m) => m.role === "user")!.content;

    expect(system).toMatch(/SITUATIONS/);
    expect(system).toMatch(/OBLIGATIONS/);
    expect(user).toContain("<organisation_name_untrusted_data>");
    expect(user).toContain("Test Org");
  });

  test("openingContext and riskScenario carry the shared source excerpt only", () => {
    const messages = buildRegenerateMessages(baseWizard, [4, 6], { slot: "riskScenario" }, "nonce-2");
    const user = messages.find((m) => m.role === "user")!.content;

    // No per-control source text leaks into a slot that never draws on it.
    expect(user).not.toContain("Control 4 source");
    expect(user).not.toContain("Control 6 source");
  });

  test("controlEmphasis carries only that one control's source excerpt, not the others", () => {
    const messages = buildRegenerateMessages(
      baseWizard,
      [4, 6],
      { slot: "controlEmphasis", control: 4 },
      "nonce-3",
    );
    const user = messages.find((m) => m.role === "user")!.content;

    expect(user).toContain("Control 4 source");
    // The unmet-controls listing still names control 6 (that context is
    // shared, same as first generation) but its fuller source excerpt —
    // goodEnough / mistakeToAvoid — never appears, only control 4's does.
    expect(user).not.toContain("Control 6 source");
    expect(user).not.toContain(CONTROLS_BY_NUMBER.get(6)!.goodEnough);
  });

  test("asks for exactly one named value, not the three-slot object", () => {
    const messages = buildRegenerateMessages(
      baseWizard,
      [4],
      { slot: "controlEmphasis", control: 4 },
      "nonce-4",
    );
    const user = messages.find((m) => m.role === "user")!.content;

    expect(user).toContain('"value"');
    expect(user).not.toContain('"openingContext"');
    expect(user).not.toContain('"controlEmphasis"');
  });

  test("only permitted enums reach the prompt — no document-field free text, because there is nowhere to pass it", () => {
    // `buildRegenerateMessages` takes a WizardAnswers and nothing else: there
    // is no parameter through which a StoredPack's documentFields (the
    // organisation's own free-text policy answers) could ever reach it. This
    // asserts the closed enum values are what actually appear, as a check
    // against a future change accidentally widening the input.
    const messages = buildRegenerateMessages(baseWizard, [4], { slot: "openingContext" }, "nonce-5");
    const user = messages.find((m) => m.role === "user")!.content;

    expect(user).toContain("sector: housing");
    expect(user).toContain("size: 51-250 people");
    expect(user).not.toContain("documentFields");
  });

  test("the nonce appears once, outside the delimited org-name block", () => {
    const messages = buildRegenerateMessages(baseWizard, [4], { slot: "openingContext" }, "unique-nonce-xyz");
    const user = messages.find((m) => m.role === "user")!.content;
    const blockEnd = user.indexOf("</organisation_name_untrusted_data>");

    expect(user).toContain("unique-nonce-xyz");
    expect(user.indexOf("unique-nonce-xyz")).toBeGreaterThan(blockEnd);
  });
});

// ---------------------------------------------------------------------------
// A regenerated slot still has to pass the same layer-2 validators.
// ---------------------------------------------------------------------------

describe("regenerated text against the shared validators", () => {
  test("a clean regenerated sentence passes validateSlotText at the slot's own cap", () => {
    const selector: SlotSelector = { slot: "controlEmphasis", control: 4 };
    const text = "Getting this right matters because unreviewed AI output can reach a client unchecked.";
    const verdict = validateSlotText(text, singleSlotCap(selector));
    expect(verdict.ok).toBe(true);
  });

  test("a regenerated slot that names a regulator still fails, exactly as first generation would", () => {
    const verdict = validateSlotText(
      "The ICO would take a dim view of this.",
      singleSlotCap({ slot: "openingContext" }),
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toMatch(/named regulator/);
  });

  test("SingleSlotSchema accepts the { value } shape the single-slot JSON schema asks for", () => {
    const parsed = SingleSlotSchema.safeParse({ value: "A short sentence." });
    expect(parsed.success).toBe(true);
  });

  test("singleSlotJsonSchema caps match the shared SLOT_CAPS for each slot kind", () => {
    const openingSchema = singleSlotJsonSchema({ slot: "openingContext" }) as {
      properties: { value: { maxLength: number } };
    };
    const emphasisSchema = singleSlotJsonSchema({ slot: "controlEmphasis", control: 2 }) as {
      properties: { value: { maxLength: number } };
    };
    expect(openingSchema.properties.value.maxLength).toBe(350);
    expect(emphasisSchema.properties.value.maxLength).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Merging a regenerated slot back into a TailoringResult.
// ---------------------------------------------------------------------------

describe("applyRegeneratedSlot", () => {
  const existing: TailoringResult = {
    slots: {
      openingContext: "old opening",
      riskScenario: "old risk",
      controlEmphasis: { 4: "old emphasis" },
    },
    provenance: { openingContext: "model", riskScenario: "fallback", "controlEmphasis.4": "model" },
    rejections: [{ slot: "riskScenario", reason: "named regulator" }],
    model: "@cf/openai/gpt-oss-120b",
    generatedAt: "2026-01-01T00:00:00.000Z",
  };

  test("replaces only the named slot's text, leaving the others untouched", () => {
    const updated = applyRegeneratedSlot(existing, { slot: "riskScenario" }, "new risk text");
    expect(updated.slots.riskScenario).toBe("new risk text");
    expect(updated.slots.openingContext).toBe("old opening");
    expect(updated.slots.controlEmphasis[4]).toBe("old emphasis");
  });

  test("marks the slot as model provenance and clears its rejection", () => {
    const updated = applyRegeneratedSlot(existing, { slot: "riskScenario" }, "new risk text");
    expect(updated.provenance.riskScenario).toBe("model");
    expect(updated.rejections.find((r) => r.slot === "riskScenario")).toBeUndefined();
  });

  test("controlEmphasis updates only the named control number", () => {
    const updated = applyRegeneratedSlot(
      existing,
      { slot: "controlEmphasis", control: 4 },
      "new emphasis for 4",
    );
    expect(updated.slots.controlEmphasis[4]).toBe("new emphasis for 4");
    expect(slotSelectorKey({ slot: "controlEmphasis", control: 4 })).toBe("controlEmphasis.4");
  });
});

// ---------------------------------------------------------------------------
// The endpoint's request schema rejects anything outside the three slots.
// ---------------------------------------------------------------------------

describe("regenerateRequestSchema", () => {
  test("accepts openingContext with no control", () => {
    expect(regenerateRequestSchema.safeParse({ token: "abc", slot: "openingContext" }).success).toBe(true);
  });

  test("accepts controlEmphasis with a control number", () => {
    expect(
      regenerateRequestSchema.safeParse({ token: "abc", slot: "controlEmphasis", control: 3 }).success,
    ).toBe(true);
  });

  test("rejects an unknown slot name rather than passing it through", () => {
    expect(regenerateRequestSchema.safeParse({ token: "abc", slot: "somethingElse" }).success).toBe(false);
  });

  test("rejects controlEmphasis with no control number", () => {
    expect(regenerateRequestSchema.safeParse({ token: "abc", slot: "controlEmphasis" }).success).toBe(false);
  });

  test("rejects openingContext with a stray control number", () => {
    expect(
      regenerateRequestSchema.safeParse({ token: "abc", slot: "openingContext", control: 3 }).success,
    ).toBe(false);
  });

  test("rejects an unrecognised extra field", () => {
    expect(
      regenerateRequestSchema.safeParse({ token: "abc", slot: "openingContext", prompt: "do X" }).success,
    ).toBe(false);
  });

  test("rejects a control number outside the 1-8 range", () => {
    expect(
      regenerateRequestSchema.safeParse({ token: "abc", slot: "controlEmphasis", control: 9 }).success,
    ).toBe(false);
  });
});
