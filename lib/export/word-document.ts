/**
 * Builds Parts 3 and 4 as Word-openable HTML, for the "Download as a Word
 * document" links.
 *
 * Why HTML rather than a real .docx: Word opens HTML natively when served
 * with an `application/msword` content type and a `.doc` filename, and the
 * result is fully editable in Word. Hand-rolling a genuine .docx zip (or
 * adding a docx-generation dependency) is the time sink the project brief
 * warns against for a document this simple — so this stays plain,
 * table-based HTML with inline styles, deliberately avoiding anything Word's
 * renderer ignores (CSS variables, flexbox, grid).
 *
 * Pure module: no I/O, no Next imports, so it is unit-testable directly. It
 * intentionally does not import BRACKET_FIELDS' React rendering counterpart
 * (components/bracketed-text.tsx) — this is a server-side, non-React
 * substitution over the same source strings.
 */

import { BRACKET_FIELDS, BRACKET_PATTERN } from "@/content/v1/brackets";
import { PACK_FOOTER } from "@/content/v1/guidance";
import {
  APPENDIX_A,
  APPENDIX_B,
  POLICY_SECTIONS,
  POLICY_STANDFIRST,
  POLICY_TITLE,
} from "@/content/v1/policy";
import {
  AMNESTY,
  DO_DONT_AT_A_GLANCE,
  FIVE_RULES,
  FIVE_RULES_HEADING,
  ONE_LINE_SUMMARY,
  STAFF_NOTE_INTRO,
  STAFF_NOTE_SIGN_OFF,
  STAFF_NOTE_STANDFIRST,
  STAFF_NOTE_TITLE,
  WHAT_YOU_DO_NOT_NEED_TO_DO,
  WHERE_TO_FIND_THINGS,
} from "@/content/v1/staff-note";

/** The content version these documents are generated from, recorded in the footer. */
const CONTENT_VERSION = "v1";

export interface WordDocumentInput {
  orgName: string | null;
  fields: Record<string, string>;
}

// ---------------------------------------------------------------------------
// HTML escaping. Field values are visitor-supplied free text destined for a
// document that gets opened in Word and emailed onward — an unescaped value
// here is an injection into a document that circulates outside the product.
// Kept self-contained (rather than imported from lib/email/send.ts) so this
// module has no dependency beyond the content files it formats.
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Substitute every bracket in a source string.
 *
 * `[Organisation Name]` becomes the org name when we have one. Every other
 * bracket becomes the organisation's saved value when they have filled it
 * in — and stays its literal bracket text, unescaped-but-verbatim, when they
 * have not, so there is something visible left to complete in Word. We never
 * invent a value for an unfilled bracket.
 */
function substituteBrackets(text: string, orgName: string | null, fields: Record<string, string>): string {
  // The literal prose between brackets is escaped too. It comes from
  // content/v1, so this is not a security boundary — it is a correctness one:
  // the day someone adds "R&D" or "<24 hours" to Karl's policy, an unescaped
  // segment would render as a broken entity in Word and nobody would notice
  // until a client opened the document.
  //
  // A fresh regex rather than BRACKET_PATTERN itself: it is a shared global
  // regex, and `exec` advances `lastIndex` on the shared object.
  const pattern = new RegExp(BRACKET_PATTERN.source, "g");

  let out = "";
  let cursor = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    out += escapeHtml(text.slice(cursor, match.index));
    out += resolveBracket(match[0], orgName, fields);
    cursor = match.index + match[0].length;
  }
  return out + escapeHtml(text.slice(cursor));
}

function resolveBracket(raw: string, orgName: string | null, fields: Record<string, string>): string {
  const field = BRACKET_FIELDS[raw];
  // An unrecognised bracket is a transcription bug elsewhere — render it
  // verbatim (escaped) rather than swallow it.
  if (!field) return escapeHtml(raw);

  if (field.id === "orgName") {
    return orgName ? escapeHtml(orgName) : escapeHtml(raw);
  }

  const value = fields[field.id];
  return value ? escapeHtml(value) : escapeHtml(raw);
}

// ---------------------------------------------------------------------------
// Shared HTML shell.
// ---------------------------------------------------------------------------

const STYLE = `
  body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 11pt; color: #1a1a1a; }
  h1 { font-family: Arial, sans-serif; font-size: 20pt; margin-bottom: 4pt; }
  h2 { font-family: Arial, sans-serif; font-size: 14pt; margin-top: 20pt; margin-bottom: 6pt; }
  h3 { font-family: Arial, sans-serif; font-size: 12pt; margin-top: 12pt; margin-bottom: 4pt; }
  p { line-height: 1.4; margin: 0 0 8pt 0; }
  .standfirst { font-family: Arial, sans-serif; font-size: 11pt; color: #444444; margin-bottom: 16pt; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0 12pt 0; }
  th, td { border: 1px solid #999999; padding: 6pt 8pt; text-align: left; vertical-align: top; font-size: 10.5pt; }
  th { background: #eeeeee; font-family: Arial, sans-serif; }
  ul { margin: 0 0 8pt 18pt; padding: 0; }
  li { line-height: 1.4; margin-bottom: 4pt; }
  .footer { margin-top: 28pt; padding-top: 10pt; border-top: 1px solid #999999; font-family: Arial, sans-serif; font-size: 8.5pt; color: #555555; }
  .footer p { margin: 0 0 4pt 0; }
`;

function shell(title: string, bodyHtml: string, footerHtml: string): string {
  return [
    "<!DOCTYPE html>",
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
    "<head>",
    '<meta charset="utf-8">',
    `<title>${escapeHtml(title)}</title>`,
    `<style>${STYLE}</style>`,
    "</head>",
    "<body>",
    bodyHtml,
    footerHtml,
    "</body>",
    "</html>",
  ].join("\n");
}

function footerHtml(): string {
  return [
    '<div class="footer">',
    `<p>${escapeHtml(PACK_FOOTER.disclaimer)}</p>`,
    `<p>${escapeHtml(PACK_FOOTER.fullReview)}</p>`,
    `<p>${escapeHtml(PACK_FOOTER.builtOn)}</p>`,
    `<p>${escapeHtml(PACK_FOOTER.organisation)}</p>`,
    `<p>${escapeHtml(PACK_FOOTER.trademarks)}</p>`,
    `<p>Generated from The AI Bare Minimum Pack content ${escapeHtml(CONTENT_VERSION)}.</p>`,
    "</div>",
  ].join("\n");
}

function p(text: string, orgName: string | null, fields: Record<string, string>): string {
  return `<p>${substituteBrackets(text, orgName, fields)}</p>`;
}

// ---------------------------------------------------------------------------
// Policy (Part 3).
// ---------------------------------------------------------------------------

export function buildPolicyDocument({ orgName, fields }: WordDocumentInput): string {
  const sub = (text: string) => substituteBrackets(text, orgName, fields);

  const sections = POLICY_SECTIONS.map((section) => {
    const heading = `<h2>${section.number}. ${escapeHtml(section.heading)}</h2>`;

    if (section.kind === "prose") {
      return heading + section.body.map((line) => p(line, orgName, fields)).join("\n");
    }

    if (section.kind === "roles-table") {
      const rows = section.rows
        .map(
          (row) =>
            `<tr><td>${sub(row.who)}</td><td>${sub(row.responsibilities)}</td></tr>`,
        )
        .join("\n");
      return `${heading}<table><thead><tr><th>Who</th><th>What they are responsible for</th></tr></thead><tbody>${rows}</tbody></table>`;
    }

    if (section.kind === "transparency-table") {
      const intro = section.intro.map((line) => p(line, orgName, fields)).join("\n");
      const rows = section.rows
        .map(
          (row) =>
            `<tr><td>${escapeHtml(row.level)} ${escapeHtml(row.label)}</td><td>${escapeHtml(row.whatItMeans)}</td><td>${escapeHtml(row.whatYouDo)}</td></tr>`,
        )
        .join("\n");
      return `${heading}${intro}<table><thead><tr><th>Level</th><th>What it means</th><th>What you do</th></tr></thead><tbody>${rows}</tbody></table>`;
    }

    // review-table
    const body = section.body.map((line) => p(line, orgName, fields)).join("\n");
    const rows = section.rows
      .map(
        (row) =>
          `<tr><td>${escapeHtml(row.version)}</td><td>${sub(row.date)}</td><td>${sub(row.approvedBy)}</td><td>${escapeHtml(row.summaryOfChange)}</td></tr>`,
      )
      .join("\n");
    return `${heading}${body}<table><thead><tr><th>Version</th><th>Date</th><th>Approved by</th><th>Summary of change</th></tr></thead><tbody>${rows}</tbody></table>`;
  }).join("\n");

  const appendixA = [
    `<h2>${escapeHtml(APPENDIX_A.heading)}</h2>`,
    p(APPENDIX_A.intro, orgName, fields),
    "<table><thead><tr>",
    APPENDIX_A.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join(""),
    "</tr></thead><tbody><tr>",
    APPENDIX_A.columns.map(() => "<td>&nbsp;</td>").join(""),
    "</tr></tbody></table>",
  ].join("\n");

  const appendixB = [
    `<h2>${escapeHtml(APPENDIX_B.heading)}</h2>`,
    p(APPENDIX_B.intro, orgName, fields),
    p(APPENDIX_B.statement, orgName, fields),
    "<table><tbody><tr>",
    APPENDIX_B.signatureFields.map((f) => `<td>${escapeHtml(f)}:</td>`).join(""),
    "</tr></tbody></table>",
  ].join("\n");

  const body = [
    `<h1>${escapeHtml(POLICY_TITLE)}</h1>`,
    `<p class="standfirst">${escapeHtml(POLICY_STANDFIRST)}</p>`,
    sections,
    appendixA,
    appendixB,
  ].join("\n");

  return shell(POLICY_TITLE, body, footerHtml());
}

// ---------------------------------------------------------------------------
// Staff note (Part 4).
// ---------------------------------------------------------------------------

export function buildStaffNoteDocument({ orgName, fields }: WordDocumentInput): string {
  const sub = (text: string) => substituteBrackets(text, orgName, fields);

  const intro = STAFF_NOTE_INTRO.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n");

  const oneLiner = [
    `<h2>${escapeHtml(ONE_LINE_SUMMARY.heading)}</h2>`,
    `<p>${escapeHtml(ONE_LINE_SUMMARY.text)}</p>`,
  ].join("\n");

  const rules = [
    `<h2>${escapeHtml(FIVE_RULES_HEADING)}</h2>`,
    ...FIVE_RULES.map((rule) =>
      [
        `<h3>${rule.number}. ${escapeHtml(rule.heading)}</h3>`,
        ...rule.body.map((line) => p(line, orgName, fields)),
      ].join("\n"),
    ),
  ].join("\n");

  const notNeeded = [
    `<h2>${escapeHtml(WHAT_YOU_DO_NOT_NEED_TO_DO.heading)}</h2>`,
    `<p>${escapeHtml(WHAT_YOU_DO_NOT_NEED_TO_DO.intro)}</p>`,
    "<ul>",
    WHAT_YOU_DO_NOT_NEED_TO_DO.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n"),
    "</ul>",
    `<p>${escapeHtml(WHAT_YOU_DO_NOT_NEED_TO_DO.outro)}</p>`,
  ].join("\n");

  const amnesty = [
    `<h2>${escapeHtml(AMNESTY.heading)}</h2>`,
    AMNESTY.body.map((line) => p(line, orgName, fields)).join("\n"),
  ].join("\n");

  const whereRows = WHERE_TO_FIND_THINGS.rows
    .map((row) => `<tr><td>${escapeHtml(row.what)}</td><td>${sub(row.where)}</td></tr>`)
    .join("\n");
  const where = [
    `<h2>${escapeHtml(WHERE_TO_FIND_THINGS.heading)}</h2>`,
    `<table><thead><tr><th>What</th><th>Where</th></tr></thead><tbody>${whereRows}</tbody></table>`,
  ].join("\n");

  const signOff = [
    `<p>${escapeHtml(STAFF_NOTE_SIGN_OFF.closing)}</p>`,
    `<p>${sub(STAFF_NOTE_SIGN_OFF.name)}</p>`,
    `<p>${sub(STAFF_NOTE_SIGN_OFF.roleLine)}</p>`,
  ].join("\n");

  const doDontRows = DO_DONT_AT_A_GLANCE.pairs
    .map((pair) => `<tr><td>${sub(pair.doText)}</td><td>${sub(pair.dontText)}</td></tr>`)
    .join("\n");
  const doDont = [
    `<h2>${escapeHtml(DO_DONT_AT_A_GLANCE.heading)}</h2>`,
    `<p>${escapeHtml(DO_DONT_AT_A_GLANCE.standfirst)}</p>`,
    `<table><thead><tr><th>Do</th><th>Don't</th></tr></thead><tbody>${doDontRows}</tbody></table>`,
  ].join("\n");

  const body = [
    `<h1>${escapeHtml(STAFF_NOTE_TITLE)}</h1>`,
    `<p class="standfirst">${escapeHtml(STAFF_NOTE_STANDFIRST)}</p>`,
    intro,
    oneLiner,
    rules,
    notNeeded,
    amnesty,
    where,
    signOff,
    doDont,
  ].join("\n");

  return shell(STAFF_NOTE_TITLE, body, footerHtml());
}
