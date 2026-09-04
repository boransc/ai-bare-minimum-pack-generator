/**
 * Part 4: the staff note, "Using AI at work", rendered ready to send.
 *
 * Interactive only once the pack has a token (a saved, returnable link): the
 * bracketed fields become real inputs via DocumentFieldsProvider, and this
 * module needs the client boundary that comes with that. On the
 * just-generated page (no token) everything inside still renders as static
 * text, and print always shows flattened text or a ruled blank -- see
 * components/bracketed-text.tsx and the .doc-bracket-print rules in
 * pack-documents.css.
 */

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
import { collectFieldIds } from "@/lib/document-fields";
import { Bracketed } from "./bracketed-text";
import { DocumentFieldsProvider, DocumentFieldsStatus } from "./document-fields-context";

// Every string a bracket can appear in, gathered once at module load so the
// completion count is read straight off the same source text the document
// renders -- there is no separate list to let drift out of sync.
const STAFF_NOTE_BRACKET_TEXTS: string[] = [
  ...FIVE_RULES.flatMap((rule) => rule.body),
  ...AMNESTY.body,
  ...WHERE_TO_FIND_THINGS.rows.map((row) => row.where),
  STAFF_NOTE_SIGN_OFF.name,
  STAFF_NOTE_SIGN_OFF.roleLine,
  ...DO_DONT_AT_A_GLANCE.pairs.flatMap((pair) => [pair.doText, pair.dontText]),
];

// The organisation name is substituted automatically from the wizard answer
// and is never typed in through this document, so it doesn't belong in a
// "fields filled" count of things the reader is actually asked to do.
const STAFF_NOTE_FIELD_IDS = collectFieldIds(STAFF_NOTE_BRACKET_TEXTS).filter(
  (id) => id !== "orgName",
);

interface StaffNoteDocumentProps {
  orgName: string | null;
  /** Present only once the pack has a saved, returnable link -- see PackResult. */
  token?: string;
  /** This pack's saved bracketed-field values, keyed by BracketFieldId. */
  documentFields?: Record<string, string>;
}

export function StaffNoteDocument({
  orgName,
  token,
  documentFields = {},
}: StaffNoteDocumentProps) {
  return (
    <DocumentFieldsProvider token={token} initialFields={documentFields}>
      <article className="doc">
      <header className="doc-head">
        <p className="doc-kind">Part 4</p>
        <h1 className="doc-title">{STAFF_NOTE_TITLE}</h1>
        <p className="doc-standfirst">{STAFF_NOTE_STANDFIRST}</p>
        {token && (
          <a
            className="doc-download-link no-print"
            href={`/api/download?token=${encodeURIComponent(token)}&doc=staff-note`}
          >
            Download as a Word document
          </a>
        )}
        <DocumentFieldsStatus fieldIds={STAFF_NOTE_FIELD_IDS} />
      </header>

      <section className="doc-section">
        {STAFF_NOTE_INTRO.map((paragraph, i) => (
          <p key={i} className="doc-p">
            {paragraph}
          </p>
        ))}
      </section>

      <section className="doc-section doc-one-liner">
        <h2 className="doc-h2">{ONE_LINE_SUMMARY.heading}</h2>
        <p className="doc-summary-line">{ONE_LINE_SUMMARY.text}</p>
      </section>

      <section className="doc-section">
        <h2 className="doc-h2">{FIVE_RULES_HEADING}</h2>
        <div className="doc-rules">
          {FIVE_RULES.map((rule) => (
            <article key={rule.number} className="doc-rule">
              <span className="doc-rule-number">{rule.number}</span>
              <div>
                <h3 className="doc-h3">{rule.heading}</h3>
                {rule.body.map((paragraph, i) => (
                  <p key={i} className="doc-p">
                    <Bracketed text={paragraph} orgName={orgName} />
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="doc-section">
        <h2 className="doc-h2">{WHAT_YOU_DO_NOT_NEED_TO_DO.heading}</h2>
        <p className="doc-p">{WHAT_YOU_DO_NOT_NEED_TO_DO.intro}</p>
        <ul className="doc-list">
          {WHAT_YOU_DO_NOT_NEED_TO_DO.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <p className="doc-p">{WHAT_YOU_DO_NOT_NEED_TO_DO.outro}</p>
      </section>

      <section className="doc-section">
        <h2 className="doc-h2">{AMNESTY.heading}</h2>
        {AMNESTY.body.map((paragraph, i) => (
          <p key={i} className="doc-p">
            <Bracketed text={paragraph} orgName={orgName} />
          </p>
        ))}
      </section>

      <section className="doc-section">
        <h2 className="doc-h2">{WHERE_TO_FIND_THINGS.heading}</h2>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th>What</th>
                <th>Where</th>
              </tr>
            </thead>
            <tbody>
              {WHERE_TO_FIND_THINGS.rows.map((row) => (
                <tr key={row.what}>
                  <td>{row.what}</td>
                  <td>
                    <Bracketed text={row.where} orgName={orgName} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="doc-section doc-sign-off">
        <p className="doc-p">{STAFF_NOTE_SIGN_OFF.closing}</p>
        <p className="doc-signoff-name">
          <Bracketed text={STAFF_NOTE_SIGN_OFF.name} orgName={orgName} />
        </p>
        <p className="doc-signoff-role">
          <Bracketed text={STAFF_NOTE_SIGN_OFF.roleLine} orgName={orgName} />
        </p>
      </section>

      <section className="doc-section doc-do-dont">
        <h2 className="doc-h2">{DO_DONT_AT_A_GLANCE.heading}</h2>
        <p className="doc-p">{DO_DONT_AT_A_GLANCE.standfirst}</p>
        <div className="doc-table-wrap">
          <table className="doc-table doc-table-do-dont">
            <thead>
              <tr>
                <th>Do</th>
                <th>Don&rsquo;t</th>
              </tr>
            </thead>
            <tbody>
              {DO_DONT_AT_A_GLANCE.pairs.map((pair, i) => (
                <tr key={i}>
                  <td>
                    <Bracketed text={pair.doText} orgName={orgName} />
                  </td>
                  <td>
                    <Bracketed text={pair.dontText} orgName={orgName} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </article>
    </DocumentFieldsProvider>
  );
}
