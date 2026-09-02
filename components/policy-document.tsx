/**
 * Part 3: the AI usage policy template, rendered as an adoptable document.
 *
 * Server-safe: nothing here is interactive, so it renders without a client
 * boundary and prints exactly what it shows on screen.
 */

import {
  APPENDIX_A,
  APPENDIX_B,
  POLICY_SECTIONS,
  POLICY_STANDFIRST,
  POLICY_TITLE,
} from "@/content/v1/policy";
import { Bracketed } from "./bracketed-text";

interface PolicyDocumentProps {
  orgName: string | null;
}

export function PolicyDocument({ orgName }: PolicyDocumentProps) {
  return (
    <article className="doc">
      <header className="doc-head">
        <p className="doc-kind">Part 3</p>
        <h1 className="doc-title">{POLICY_TITLE}</h1>
        <p className="doc-standfirst">{POLICY_STANDFIRST}</p>
      </header>

      {POLICY_SECTIONS.map((section) => (
        <section key={section.number} className="doc-section">
          <h2 className="doc-h2">
            <span className="doc-section-number">{section.number}.</span>{" "}
            {section.heading}
          </h2>

          {section.kind === "prose" &&
            section.body.map((paragraph, i) => (
              <p key={i} className="doc-p">
                <Bracketed text={paragraph} orgName={orgName} />
              </p>
            ))}

          {section.kind === "roles-table" && (
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Who</th>
                    <th>What they are responsible for</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, i) => (
                    <tr key={i}>
                      <td>
                        <Bracketed text={row.who} orgName={orgName} />
                      </td>
                      <td>
                        <Bracketed text={row.responsibilities} orgName={orgName} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {section.kind === "transparency-table" && (
            <>
              {section.intro.map((paragraph, i) => (
                <p key={i} className="doc-p">
                  <Bracketed text={paragraph} orgName={orgName} />
                </p>
              ))}
              <div className="doc-table-wrap">
                <table className="doc-table doc-table-transparency">
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th>What it means</th>
                      <th>What you do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row) => (
                      <tr key={row.level}>
                        <td>
                          <span className="doc-mono">{row.level}</span>{" "}
                          {row.label}
                        </td>
                        <td>{row.whatItMeans}</td>
                        <td>{row.whatYouDo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {section.kind === "review-table" && (
            <>
              {section.body.map((paragraph, i) => (
                <p key={i} className="doc-p">
                  <Bracketed text={paragraph} orgName={orgName} />
                </p>
              ))}
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Date</th>
                      <th>Approved by</th>
                      <th>Summary of change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row) => (
                      <tr key={row.version}>
                        <td>
                          <span className="doc-mono">{row.version}</span>
                        </td>
                        <td>
                          <Bracketed text={row.date} orgName={orgName} />
                        </td>
                        <td>
                          <Bracketed text={row.approvedBy} orgName={orgName} />
                        </td>
                        <td>{row.summaryOfChange}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ))}

      {/* Appendix A ---------------------------------------------------- */}
      <section className="doc-section">
        <h2 className="doc-h2">{APPENDIX_A.heading}</h2>
        <p className="doc-p">{APPENDIX_A.intro}</p>
        <div className="doc-table-wrap">
          <table className="doc-table doc-table-register">
            <thead>
              <tr>
                {APPENDIX_A.columns.map((column) => (
                  <th key={column}>
                    <span className="doc-mono">{column}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {APPENDIX_A.columns.map((column) => (
                  <td key={column}>&nbsp;</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Appendix B ---------------------------------------------------- */}
      <section className="doc-section">
        <h2 className="doc-h2">{APPENDIX_B.heading}</h2>
        <p className="doc-p">
          <Bracketed text={APPENDIX_B.intro} orgName={orgName} />
        </p>
        <p className="doc-p doc-statement">
          <Bracketed text={APPENDIX_B.statement} orgName={orgName} />
        </p>
        <div className="doc-signature-fields">
          {APPENDIX_B.signatureFields.map((field) => (
            <div key={field} className="doc-signature-field">
              <span className="doc-mono">{field}</span>
              <span className="doc-signature-line" aria-hidden="true" />
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
