import type { Metadata } from "next";
import Link from "next/link";
import { cloudflareConfigured } from "@/lib/cloudflare/config";
import { getJson, kvKeys } from "@/lib/cloudflare/kv";
import { leadAnswerLabel, leadAnswerLabels, type LeadSummary } from "@/lib/storage/packs";

export const metadata: Metadata = {
  title: "Lead list — Admin",
  robots: { index: false, follow: false },
};

export const runtime = "nodejs";

const DAYS_TO_SCAN = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const PLAYBOOK_LABELS: Record<string, string> = {
  noBoardOwner: "No board owner",
  consequentialDecisions: "Consequential decisions",
  noPolicy: "No policy",
};

/** True enough to render: has the shape a table row needs, whatever else may be missing or wrong. */
function isLeadSummary(value: unknown): value is LeadSummary {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.token === "string" && typeof v.createdAt === "string";
}

/**
 * Read the last 30 days of lead-index keys and merge them, newest first.
 *
 * Each key is read independently and tolerated on its own: a missing day (no
 * packs generated) is a null from `getJson`, not an error; a key that reads
 * back with the wrong shape (a schema change, a hand-edited value) is
 * filtered out row by row rather than discarding the whole day; and if KV is
 * not configured at all — or a request throws — the page still renders, just
 * with nothing in it, because a lead list that occasionally 500s is worse
 * than one that is occasionally empty.
 */
async function loadRecentLeads(now = new Date()): Promise<LeadSummary[]> {
  if (!cloudflareConfigured()) return [];

  const isoDates: string[] = [];
  for (let i = 0; i < DAYS_TO_SCAN; i++) {
    isoDates.push(new Date(now.getTime() - i * DAY_MS).toISOString().slice(0, 10));
  }

  const days = await Promise.all(
    isoDates.map(async (isoDate) => {
      try {
        return await getJson<unknown[]>(kvKeys.leadIndex(isoDate));
      } catch {
        return null;
      }
    }),
  );

  const rows = days
    .filter((day): day is unknown[] => Array.isArray(day))
    .flat()
    .filter(isLeadSummary);

  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rows;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export default async function AdminPage() {
  const leads = await loadRecentLeads();

  const total = leads.length;
  const failedRedLine = leads.filter((l) => safeArray(l.redLineFailures).length > 0).length;
  const noBoardOwner = leads.filter((l) => safeArray(l.playbookTriggers).includes("noBoardOwner")).length;
  const averageScore =
    total === 0
      ? null
      : leads.reduce((sum, l) => sum + (typeof l.score === "number" ? l.score : 0), 0) / total;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <h1 className="h2">Lead list</h1>
        <p className="admin-subhead">
          Every generated pack from the last {DAYS_TO_SCAN} days, newest first,
          with the wizard answers behind it.
        </p>
      </header>

      <section className="admin-tiles" aria-label="Summary">
        <article className="admin-tile">
          <p className="admin-tile-value">{total}</p>
          <p className="admin-tile-label">Total packs</p>
        </article>
        <article className="admin-tile">
          <p className="admin-tile-value">{averageScore === null ? "—" : averageScore.toFixed(1)}</p>
          <p className="admin-tile-label">Average score (of 8)</p>
        </article>
        <article className="admin-tile admin-tile-red">
          <p className="admin-tile-value">{failedRedLine}</p>
          <p className="admin-tile-label">Failed a red line</p>
        </article>
        <article className="admin-tile">
          <p className="admin-tile-value">{noBoardOwner}</p>
          <p className="admin-tile-label">No board owner</p>
        </article>
      </section>

      {total === 0 ? (
        <div className="admin-empty">
          <p className="h3">No packs generated yet</p>
          <p>
            Once a visitor completes the wizard, their pack will appear here with
            their score, verdict and wizard answers. Nothing has been generated
            in the last {DAYS_TO_SCAN} days
            {cloudflareConfigured() ? "" : " (Cloudflare KV is not configured, so this page cannot read any leads)"}
            .
          </p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Date</th>
                <th>Sector</th>
                <th>Size</th>
                <th>Score</th>
                <th>Verdict</th>
                <th>Red lines</th>
                <th>Playbook triggers</th>
                <th>Wizard answers</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const redLines = safeArray(lead.redLineFailures) as number[];
                const triggers = safeArray(lead.playbookTriggers) as string[];
                return (
                  <tr key={lead.token}>
                    <td>
                      <Link href={`/pack/${lead.token}`} className="admin-org-link">
                        {lead.orgName || "Unnamed organisation"}
                      </Link>
                    </td>
                    <td>{formatDate(lead.createdAt)}</td>
                    <td>{lead.sector ? leadAnswerLabel("sector", lead.sector) : "—"}</td>
                    <td>{lead.size ? leadAnswerLabel("size", lead.size) : "—"}</td>
                    <td>
                      <span className="admin-score">{typeof lead.score === "number" ? lead.score : "—"}/8</span>
                    </td>
                    <td>
                      <span className={`admin-verdict admin-verdict-${lead.verdict === "met" ? "met" : "not-met"}`}>
                        {lead.verdict === "met" ? "Met" : "Not met"}
                      </span>
                    </td>
                    <td>
                      {redLines.length === 0 ? (
                        <span className="admin-muted">None</span>
                      ) : (
                        <span className="admin-red-lines">
                          {redLines.map((n) => `#${n}`).join(", ")}
                        </span>
                      )}
                    </td>
                    <td>
                      {triggers.length === 0 ? (
                        <span className="admin-muted">None</span>
                      ) : (
                        <ul className="admin-triggers">
                          {triggers.map((key) => (
                            <li key={key}>{PLAYBOOK_LABELS[key] ?? key}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>
                      <details className="admin-answers-toggle">
                        <summary>Answers</summary>
                        <dl className="admin-answers">
                          <dt>Sector</dt>
                          <dd>{leadAnswerLabel("sector", lead.sector)}</dd>
                          <dt>Size</dt>
                          <dd>{leadAnswerLabel("size", lead.size)}</dd>
                          <dt>Current AI use</dt>
                          <dd>{leadAnswerLabel("currentAiUse", lead.currentAiUse)}</dd>
                          <dt>What AI is used for</dt>
                          <dd>{leadAnswerLabels("aiUseTypes", lead.aiUseTypes)}</dd>
                          <dt>Sensitive data</dt>
                          <dd>{leadAnswerLabel("sensitiveData", lead.sensitiveData)}</dd>
                          <dt>Regulated</dt>
                          <dd>{leadAnswerLabel("regulated", lead.regulated)}</dd>
                          <dt>Consequential decisions</dt>
                          <dd>{leadAnswerLabel("consequentialDecisions", lead.consequentialDecisions)}</dd>
                          <dt>Board owner</dt>
                          <dd>{leadAnswerLabel("boardOwner", lead.boardOwner)}</dd>
                        </dl>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
