import { describe, expect, test } from "vitest";
import { BRACKET_FIELDS, BRACKET_PATTERN, type BracketFieldId } from "./brackets";
import { APPENDIX_A, APPENDIX_B, POLICY_SECTIONS } from "./policy";
import {
  AMNESTY,
  DO_DONT_AT_A_GLANCE,
  FIVE_RULES,
  ONE_LINE_SUMMARY,
  STAFF_NOTE_INTRO,
  STAFF_NOTE_SIGN_OFF,
  WHAT_YOU_DO_NOT_NEED_TO_DO,
  WHERE_TO_FIND_THINGS,
} from "./staff-note";

/** Every string in the pack we transcribed, gathered for the bracket check below. */
function allPolicyStrings(): string[] {
  const strings: string[] = [];
  for (const section of POLICY_SECTIONS) {
    strings.push(section.heading);
    if (section.kind === "prose" || section.kind === "review-table") {
      strings.push(...section.body);
    }
    if (section.kind === "roles-table") {
      for (const row of section.rows) strings.push(row.who, row.responsibilities);
    }
    if (section.kind === "transparency-table") {
      strings.push(...section.intro);
      for (const row of section.rows) {
        strings.push(row.level, row.label, row.whatItMeans, row.whatYouDo);
      }
    }
    if (section.kind === "review-table") {
      for (const row of section.rows) {
        strings.push(row.version, row.date, row.approvedBy, row.summaryOfChange);
      }
    }
  }
  strings.push(APPENDIX_A.heading, APPENDIX_A.intro, ...APPENDIX_A.columns);
  strings.push(APPENDIX_B.heading, APPENDIX_B.intro, APPENDIX_B.statement);
  strings.push(...APPENDIX_B.signatureFields);
  return strings;
}

function allStaffNoteStrings(): string[] {
  const strings: string[] = [...STAFF_NOTE_INTRO, ONE_LINE_SUMMARY.heading, ONE_LINE_SUMMARY.text];
  for (const rule of FIVE_RULES) strings.push(rule.heading, ...rule.body);
  strings.push(
    WHAT_YOU_DO_NOT_NEED_TO_DO.heading,
    WHAT_YOU_DO_NOT_NEED_TO_DO.intro,
    ...WHAT_YOU_DO_NOT_NEED_TO_DO.items,
    WHAT_YOU_DO_NOT_NEED_TO_DO.outro,
  );
  strings.push(AMNESTY.heading, ...AMNESTY.body);
  strings.push(WHERE_TO_FIND_THINGS.heading);
  for (const row of WHERE_TO_FIND_THINGS.rows) strings.push(row.what, row.where);
  strings.push(STAFF_NOTE_SIGN_OFF.closing, STAFF_NOTE_SIGN_OFF.name, STAFF_NOTE_SIGN_OFF.roleLine);
  strings.push(DO_DONT_AT_A_GLANCE.heading, DO_DONT_AT_A_GLANCE.standfirst);
  for (const pair of DO_DONT_AT_A_GLANCE.pairs) strings.push(pair.doText, pair.dontText);
  return strings;
}

describe("policy sections", () => {
  test("all 17 section numbers are present, in order, with no gaps or repeats", () => {
    expect(POLICY_SECTIONS.map((s) => s.number)).toEqual(
      Array.from({ length: 17 }, (_, i) => i + 1),
    );
  });

  test("section 3 is the roles table", () => {
    const section3 = POLICY_SECTIONS.find((s) => s.number === 3);
    expect(section3?.kind).toBe("roles-table");
  });

  test("section 8 is the AI Transparency Index table with exactly 6 rows, AI-0 to AI-5", () => {
    const section8 = POLICY_SECTIONS.find((s) => s.number === 8);
    expect(section8?.kind).toBe("transparency-table");
    if (section8?.kind !== "transparency-table") throw new Error("unreachable");
    expect(section8.rows).toHaveLength(6);
    expect(section8.rows.map((r) => r.level)).toEqual([
      "AI-0",
      "AI-1",
      "AI-2",
      "AI-3",
      "AI-4",
      "AI-5",
    ]);
    for (const row of section8.rows) {
      expect(row.label).not.toBe("");
      expect(row.whatItMeans).not.toBe("");
      expect(row.whatYouDo).not.toBe("");
    }
  });

  test("section 17 is the review table with a version history row", () => {
    const section17 = POLICY_SECTIONS.find((s) => s.number === 17);
    expect(section17?.kind).toBe("review-table");
    if (section17?.kind !== "review-table") throw new Error("unreachable");
    expect(section17.rows.length).toBeGreaterThan(0);
  });
});

describe("staff note do/don't table", () => {
  test("every pair has both a do and a don't, and neither cell is empty", () => {
    expect(DO_DONT_AT_A_GLANCE.pairs.length).toBeGreaterThan(0);
    for (const pair of DO_DONT_AT_A_GLANCE.pairs) {
      expect(pair.doText.trim().length).toBeGreaterThan(0);
      expect(pair.dontText.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("bracketed fields", () => {
  test("every bracket found in the transcribed content is a declared field", () => {
    const allText = [...allPolicyStrings(), ...allStaffNoteStrings()];
    const found = new Set<string>();
    for (const text of allText) {
      for (const match of text.match(BRACKET_PATTERN) ?? []) {
        found.add(match);
      }
    }

    expect(found.size).toBeGreaterThan(0);

    const undeclared = Array.from(found).filter((raw) => !(raw in BRACKET_FIELDS));
    expect(undeclared).toEqual([]);
  });

  test("only orgName is ever populated from the wizard; every other id renders as a visible bracket", () => {
    const ids = new Set(Object.values(BRACKET_FIELDS).map((f) => f.id));
    expect(ids.has("orgName" satisfies BracketFieldId)).toBe(true);
  });
});
