import { describe, expect, it } from "vitest";
import { ALL_BRACKET_FIELD_IDS } from "@/content/v1/brackets";
import { applyFieldValue, collectFieldIds } from "./document-fields";

describe("collectFieldIds", () => {
  it("collapses several bracket texts that share a field id down to one id", () => {
    // "[role]" and "[Role]" are the same field in the source; so are
    // "[AI lead]" and "[AI lead name and contact]".
    const ids = collectFieldIds([
      "Reviewed by [role].",
      "Retained by [Role].",
      "Ask [AI lead] first.",
      "Contact: [AI lead name and contact].",
    ]);

    expect(ids).toEqual(["role", "aiLead", "aiLeadNameContact"]);
  });

  it("returns ids in first-seen order across multiple source strings", () => {
    const ids = collectFieldIds(["First [date].", "Then [name]."]);
    expect(ids).toEqual(["date", "name"]);
  });

  it("ignores a bracket that doesn't match any declared field", () => {
    const ids = collectFieldIds(["A stray [not a real field]."]);
    expect(ids).toEqual([]);
  });

  it("returns nothing for text with no brackets", () => {
    expect(collectFieldIds(["Plain prose, no blanks here."])).toEqual([]);
  });

  it("every declared field id is reachable through at least one of its bracket texts", () => {
    // Guards against a future bracket added to BRACKET_FIELDS without a
    // corresponding case in this scan-based approach ever silently working
    // differently to what the components render.
    const idsFromBracketsModule = new Set(ALL_BRACKET_FIELD_IDS);
    expect(idsFromBracketsModule.size).toBeGreaterThan(0);
  });
});

describe("applyFieldValue", () => {
  it("sets a trimmed value for a new field", () => {
    const next = applyFieldValue({}, "location", "  The shared drive  ");
    expect(next).toEqual({ location: "The shared drive" });
  });

  it("an empty value clears the field rather than storing an empty string", () => {
    const next = applyFieldValue({ location: "The shared drive" }, "location", "");
    expect(next).toEqual({});
    expect("location" in next).toBe(false);
  });

  it("a whitespace-only value also clears the field", () => {
    const next = applyFieldValue({ location: "The shared drive" }, "location", "   ");
    expect("location" in next).toBe(false);
  });

  it("leaves other fields untouched", () => {
    const next = applyFieldValue({ location: "Somewhere", name: "Alex" }, "location", "");
    expect(next).toEqual({ name: "Alex" });
  });

  it("does not mutate the input map", () => {
    const original = { location: "Somewhere" };
    applyFieldValue(original, "location", "Elsewhere");
    expect(original).toEqual({ location: "Somewhere" });
  });
});
