/**
 * Part 4: the staff note, "Using AI at work", rendered ready to send.
 *
 * Server-safe: nothing here is interactive, so it renders without a client
 * boundary and prints exactly what it shows on screen.
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
import { Bracketed } from "./bracketed-text";

interface StaffNoteDocumentProps {
  orgName: string | null;
}

export function StaffNoteDocument({ orgName }: StaffNoteDocumentProps) {
  return (
    <article className="doc">
      <header className="doc-head">
        <p className="doc-kind">Part 4</p>
        <h1 className="doc-title">{STAFF_NOTE_TITLE}</h1>
        <p className="doc-standfirst">{STAFF_NOTE_STANDFIRST}</p>
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
  );
}
