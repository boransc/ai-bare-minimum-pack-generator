import { describe, expect, test } from "vitest";
import { tailoringStatusMessage } from "./tailored-block";
import type { TailoringResult } from "@/lib/domain/types";

function result(provenance: Record<string, "model" | "fallback">): TailoringResult {
  return {
    slots: { openingContext: "", riskScenario: "", controlEmphasis: {} },
    provenance,
    rejections: [],
    model: "test-model",
    generatedAt: new Date().toISOString(),
  };
}

describe("tailoringStatusMessage", () => {
  test("loading always wins, regardless of any tailoring already held", () => {
    expect(tailoringStatusMessage(null, "loading")).toBe(
      "The contextual notes for your organisation are still being prepared.",
    );
    expect(
      tailoringStatusMessage(result({ openingContext: "model" }), "loading"),
    ).toBe("The contextual notes for your organisation are still being prepared.");
  });

  test("unavailable with no tailoring reads as no AI-written text", () => {
    expect(tailoringStatusMessage(null, "unavailable")).toBe(
      "No AI-written text appears in this pack.",
    );
  });

  test("ready with at least one model-provenance slot names the model", () => {
    const withModel = result({ openingContext: "model", riskScenario: "fallback" });
    expect(tailoringStatusMessage(withModel, "ready")).toBe(
      "A language model wrote a small number of sentences below, set in italics; it cannot alter any requirement.",
    );
  });

  test("ready with every slot a fallback reads as no AI-written text", () => {
    const allFallback = result({ openingContext: "fallback", riskScenario: "fallback" });
    expect(tailoringStatusMessage(allFallback, "ready")).toBe(
      "No AI-written text appears in this pack.",
    );
  });

  test("ready with an empty provenance map reads as no AI-written text", () => {
    expect(tailoringStatusMessage(result({}), "ready")).toBe(
      "No AI-written text appears in this pack.",
    );
  });
});
