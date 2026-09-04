/**
 * Content fidelity audit: does content/v1 actually say what Karl's document says?
 *
 * This is the project's one genuine pre-launch blocker. Every pack the product
 * will ever generate inherits these strings, so a transcription slip becomes an
 * error in every document issued to every organisation — and roughly two
 * hundred strings were transcribed, some of them by different hands.
 *
 * Unlike most of this project's checks, this one is mechanically decidable:
 * either a string appears in the source document or it does not. It is not a
 * substitute for the source owner's sign-off, but it turns that sign-off from
 * "read 25 pages and hope" into "look at the handful of strings that differ".
 *
 *     npm run content-check
 *
 * Skips cleanly when the .docx is not present locally, since it is deliberately
 * not committed.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTROLS } from "@/content/v1/controls";
import {
  BANDS,
  DRIVERS,
  DRIVERS_NOTE,
  HOW_TO_SCORE,
} from "@/content/v1/scoring";
import {
  GOVERNING_PRINCIPLE,
  ONE_RULE_TO_REMEMBER,
  THE_PATTERN,
  THIRTY_DAY_PLAN,
  THIRTY_DAY_PLAN_INTRO,
  THREE_THINGS_THAT_GO_WRONG,
  WHAT_THE_BARE_MINIMUM_BUYS_YOU,
  WHAT_THE_BARE_MINIMUM_DOES_NOT_GIVE_YOU,
  WHAT_THIS_DOES_NOT_COVER,
  WHY_YOU_ARE_BEING_ASKED,
  CLOSING_THOUGHT,
} from "@/content/v1/guidance";
import { APPENDIX_A, APPENDIX_B, POLICY_SECTIONS } from "@/content/v1/policy";
import {
  AMNESTY,
  DO_DONT_AT_A_GLANCE,
  FIVE_RULES,
  ONE_LINE_SUMMARY,
  STAFF_NOTE_INTRO,
  STAFF_NOTE_SIGN_OFF,
  WHAT_YOU_DO_NOT_NEED_TO_DO,
  WHERE_TO_FIND_THINGS,
} from "@/content/v1/staff-note";

const SOURCE_JSON = ".source-text.json";
const REPORT = "docs/audit-content-fidelity.md";

/**
 * Normalise both sides before comparing.
 *
 * Word and a hand-typed TypeScript string will never agree byte for byte:
 * curly quotes, en and em dashes, non-breaking spaces and the ™ symbol all
 * differ, and pulling text out of the .docx mangles some characters outright.
 * None of that is a transcription error, so it is normalised away. What is NOT
 * normalised away is a changed, added or dropped word — which is the only thing
 * this audit is trying to detect.
 */
function normalise(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/ /g, " ")
    // Anything outside plain ASCII (™, £, the extraction's replacement
    // characters) is dropped from both sides rather than guessed at.
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

interface Claim {
  /** Where the string lives, so a failure points at a file not a haystack. */
  where: string;
  text: string;
}

/**
 * The strings that claim to be verbatim.
 *
 * Deliberately excluded, because they are ours and were never claimed to be
 * Karl's: the action titles and details on each sub-statement (condensed from
 * his guidance into imperatives), our verdict headlines, all wizard question
 * wording, and every string in the UI outside content/v1.
 */
function verbatimClaims(): Claim[] {
  const claims: Claim[] = [];

  for (const control of CONTROLS) {
    claims.push({ where: `controls[${control.number}].title`, text: control.title });
    claims.push({ where: `controls[${control.number}].summary`, text: control.summary });
    claims.push({
      where: `controls[${control.number}].goodEnough`,
      text: control.goodEnough,
    });
    claims.push({
      where: `controls[${control.number}].mistakeToAvoid`,
      text: control.mistakeToAvoid,
    });
    for (const sub of control.subStatements) {
      claims.push({ where: `sub-statement ${sub.id}`, text: sub.text });
    }
  }

  for (const [key, value] of Object.entries(HOW_TO_SCORE)) {
    claims.push({ where: `HOW_TO_SCORE.${key}`, text: value });
  }

  for (const band of BANDS) {
    claims.push({ where: `band ${band.id}.whereThatLeavesYou`, text: band.whereThatLeavesYou });
    claims.push({ where: `band ${band.id}.whatToDoNext`, text: band.whatToDoNext });
  }

  for (const driver of DRIVERS) {
    claims.push({ where: `driver ${driver.name}`, text: driver.whatItLooksLike });
  }
  claims.push({ where: "DRIVERS_NOTE", text: DRIVERS_NOTE });

  WHY_YOU_ARE_BEING_ASKED.forEach((text, i) =>
    claims.push({ where: `WHY_YOU_ARE_BEING_ASKED[${i}]`, text }),
  );
  WHAT_THE_BARE_MINIMUM_BUYS_YOU.forEach((text, i) =>
    claims.push({ where: `WHAT_THE_BARE_MINIMUM_BUYS_YOU[${i}]`, text }),
  );
  WHAT_THIS_DOES_NOT_COVER.forEach((text, i) =>
    claims.push({ where: `WHAT_THIS_DOES_NOT_COVER[${i}]`, text }),
  );
  for (const item of THREE_THINGS_THAT_GO_WRONG) {
    claims.push({ where: `THREE_THINGS "${item.title}"`, text: item.body });
  }
  claims.push({ where: "THE_PATTERN", text: THE_PATTERN });
  GOVERNING_PRINCIPLE.body.forEach((text, i) =>
    claims.push({ where: `GOVERNING_PRINCIPLE.body[${i}]`, text }),
  );
  claims.push({ where: "THIRTY_DAY_PLAN_INTRO", text: THIRTY_DAY_PLAN_INTRO });
  for (const week of THIRTY_DAY_PLAN) {
    claims.push({ where: `plan week ${week.week}.whatYouDo`, text: week.whatYouDo });
  }
  claims.push({
    where: "WHAT_THE_BARE_MINIMUM_DOES_NOT_GIVE_YOU.intro",
    text: WHAT_THE_BARE_MINIMUM_DOES_NOT_GIVE_YOU.intro,
  });
  for (const item of WHAT_THE_BARE_MINIMUM_DOES_NOT_GIVE_YOU.items) {
    claims.push({ where: `does-not-give-you "${item.title}"`, text: item.body });
  }
  claims.push({
    where: "WHAT_THE_BARE_MINIMUM_DOES_NOT_GIVE_YOU.outro",
    text: WHAT_THE_BARE_MINIMUM_DOES_NOT_GIVE_YOU.outro,
  });
  claims.push({ where: "ONE_RULE_TO_REMEMBER", text: ONE_RULE_TO_REMEMBER.body });
  claims.push({ where: "CLOSING_THOUGHT", text: CLOSING_THOUGHT });

  // Part 3 — the policy. The largest block of verbatim text in the project,
  // and the most recently transcribed, so the most worth checking.
  for (const section of POLICY_SECTIONS) {
    claims.push({
      where: `policy §${section.number} heading`,
      text: section.heading,
    });

    if (section.kind === "prose" || section.kind === "review-table") {
      section.body.forEach((text, i) =>
        claims.push({ where: `policy §${section.number}.body[${i}]`, text }),
      );
    }

    if (section.kind === "roles-table") {
      for (const row of section.rows) {
        claims.push({ where: `policy §3 role "${row.who}"`, text: row.who });
        claims.push({
          where: `policy §3 responsibility "${row.who}"`,
          text: row.responsibilities,
        });
      }
    }

    if (section.kind === "transparency-table") {
      section.intro.forEach((text, i) =>
        claims.push({ where: `policy §8.intro[${i}]`, text }),
      );
      for (const row of section.rows) {
        claims.push({ where: `policy §8 ${row.level} label`, text: row.label });
        claims.push({
          where: `policy §8 ${row.level} whatItMeans`,
          text: row.whatItMeans,
        });
        claims.push({
          where: `policy §8 ${row.level} whatYouDo`,
          text: row.whatYouDo,
        });
      }
    }
  }

  claims.push({ where: "APPENDIX_A.intro", text: APPENDIX_A.intro });
  APPENDIX_A.columns.forEach((text, i) =>
    claims.push({ where: `APPENDIX_A.columns[${i}]`, text }),
  );
  claims.push({ where: "APPENDIX_B.intro", text: APPENDIX_B.intro });
  claims.push({ where: "APPENDIX_B.statement", text: APPENDIX_B.statement });

  // Part 4 — the staff note.
  STAFF_NOTE_INTRO.forEach((text, i) =>
    claims.push({ where: `STAFF_NOTE_INTRO[${i}]`, text }),
  );
  claims.push({ where: "ONE_LINE_SUMMARY", text: ONE_LINE_SUMMARY.text });
  for (const rule of FIVE_RULES) {
    claims.push({ where: `rule "${rule.heading}" heading`, text: rule.heading });
    rule.body.forEach((text, i) =>
      claims.push({ where: `rule "${rule.heading}".body[${i}]`, text }),
    );
  }
  claims.push({
    where: "WHAT_YOU_DO_NOT_NEED_TO_DO.intro",
    text: WHAT_YOU_DO_NOT_NEED_TO_DO.intro,
  });
  WHAT_YOU_DO_NOT_NEED_TO_DO.items.forEach((text, i) =>
    claims.push({ where: `WHAT_YOU_DO_NOT_NEED_TO_DO.items[${i}]`, text }),
  );
  claims.push({
    where: "WHAT_YOU_DO_NOT_NEED_TO_DO.outro",
    text: WHAT_YOU_DO_NOT_NEED_TO_DO.outro,
  });
  AMNESTY.body.forEach((text, i) =>
    claims.push({ where: `AMNESTY.body[${i}]`, text }),
  );
  for (const row of WHERE_TO_FIND_THINGS.rows) {
    claims.push({ where: `WHERE_TO_FIND "${row.what}"`, text: row.what });
  }
  claims.push({ where: "STAFF_NOTE_SIGN_OFF.closing", text: STAFF_NOTE_SIGN_OFF.closing });
  DO_DONT_AT_A_GLANCE.pairs.forEach((pair, i) => {
    claims.push({ where: `do/don't[${i}].do`, text: pair.doText });
    claims.push({ where: `do/don't[${i}].dont`, text: pair.dontText });
  });

  return claims;
}

const sourcePresent = existsSync(SOURCE_JSON);

describe.skipIf(!sourcePresent)("content fidelity", () => {
  it("every verbatim string appears in Karl's document", () => {
    const { source, paragraphs } = JSON.parse(readFileSync(SOURCE_JSON, "utf8")) as {
      source: string;
      paragraphs: string[];
    };

    // One normalised haystack. The source splits sentences across paragraphs
    // and table cells unpredictably, so matching against the joined text is
    // more faithful to "did he write these words" than matching per paragraph.
    const haystack = normalise(paragraphs.join(" "));

    const claims = verbatimClaims();
    const missing = claims.filter((c) => !haystack.includes(normalise(c.text)));

    const lines = [
      "# Content fidelity audit",
      "",
      "Does `content/v1` say what Karl's document says?",
      "",
      "Generated by `npm run content-check`. Every string below claims to be",
      "verbatim from the source; the check asserts each one appears in it.",
      "Quotes, dashes, non-breaking spaces and `™` are normalised away on both",
      "sides — a changed, added or dropped **word** is the only thing this is",
      "looking for.",
      "",
      `Source: \`${source}\``,
      "",
      "## Result",
      "",
      `- Verbatim strings checked: **${claims.length}**`,
      `- Found in the source: **${claims.length - missing.length}**`,
      `- Not found: **${missing.length}**`,
      "",
      "### Deliberately not checked",
      "",
      "These are ours, and were never claimed to be Karl's words:",
      "",
      "- the action title and detail on each sub-statement — condensed from his",
      "  guidance into imperatives for the checklist",
      "- our verdict headlines and the wizard's question wording",
      "- every UI string outside `content/v1`",
      "",
    ];

    if (missing.length === 0) {
      lines.push("## Nothing to review");
      lines.push("");
      lines.push(
        "Every string claiming to be verbatim was found in the source document.",
      );
      lines.push(
        "That is not the same as sign-off — the source owner still has to confirm",
      );
      lines.push(
        "that what has been *selected* and how it is *presented* is faithful — but",
      );
      lines.push("no wording has drifted.");
    } else {
      lines.push("## Strings not found in the source");
      lines.push("");
      lines.push(
        "Each of these needs a human decision: a genuine transcription error, or",
      );
      lines.push("an artefact of how the text was pulled out of Word.");
      lines.push("");
      for (const item of missing) {
        lines.push(`### \`${item.where}\``);
        lines.push("");
        lines.push("> " + item.text);
        lines.push("");
      }
    }

    writeFileSync(REPORT, lines.join("\n"), "utf8");

    // eslint-disable-next-line no-console
    console.log(
      `\n  checked ${claims.length} verbatim strings, ${missing.length} not found\n  report: ${REPORT}\n`,
    );

    expect(
      missing.map((m) => m.where),
      "strings claiming to be verbatim but not found in the source document",
    ).toEqual([]);
  });
});
