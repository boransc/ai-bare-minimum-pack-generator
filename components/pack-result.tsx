"use client";

import { useState } from "react";
import { CONTENT_VERSION_LABEL } from "@/content/v1";
import { CONTROLS_BY_NUMBER } from "@/content/v1/controls";
import {
  PACK_FOOTER,
  THIRTY_DAY_PLAN,
  THREE_THINGS_THAT_GO_WRONG,
  THE_PATTERN,
  WHAT_THE_BARE_MINIMUM_DOES_NOT_GIVE_YOU,
} from "@/content/v1/guidance";
import { VERDICT_COPY } from "@/content/v1/scoring";
import { scoreContradictsVerdict } from "@/lib/domain/assessment";
import { whatToDoFirst } from "@/lib/domain/checklist";
import { displayName, type GeneratedPack } from "@/lib/domain/pack";
import { useTailoring } from "./use-tailoring";
import { TailoredBlock, TailoringStatusNote } from "./tailored-block";
import { SavePack } from "./save-pack";
import type { ChecklistItem } from "@/lib/domain/types";

interface PackResultProps {
  pack: GeneratedPack;
  /**
   * Present only once the pack has a saved, returnable link. On the
   * just-generated result page there is no token yet, so the checklist
   * renders read-only rather than pretending to save progress it can't.
   */
  token?: string;
  checklistState?: Record<string, boolean>;
}

export function PackResult({ pack, token, checklistState }: PackResultProps) {
  const { assessment, checklist, playbookTriggers } = pack;

  // Tailoring is not part of the first paint. The model takes seconds, and the
  // pack is complete and correct without it, so it arrives afterwards and slots
  // in. If it never arrives, nothing is missing — only less personal.
  const { tailoring, status: tailoringStatus } = useTailoring(pack);
  const met = assessment.verdict === "met";
  const name = displayName(pack);
  const first = whatToDoFirst(checklist);
  const contradicts = scoreContradictsVerdict(assessment);

  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(pack.createdAt));

  return (
    <main className="pack">
      {/* Cover ------------------------------------------------------------ */}
      <section className="pack-cover">
        <div>
          <p className="eyebrow">AI Bare Minimum Pack</p>
          <p className="cover-context">A governance starting point for</p>
          <h1 className="display">{name}</h1>
          <p className="cover-meta">
            Generated {date} · {CONTENT_VERSION_LABEL}
          </p>
        </div>
        <div className="cover-actions no-print">
          <button className="button small quiet" onClick={() => window.print()}>
            Print or save as PDF <span aria-hidden="true">↓</span>
          </button>
        </div>
      </section>

      {/* Verdict ---------------------------------------------------------- */}
      <section className={`verdict ${met ? "is-met" : "is-not-met"}`}>
        <div className="verdict-main">
          <p className="kicker">Your result</p>
          <h2 className="h2">
            {met ? VERDICT_COPY.met.headline : VERDICT_COPY.notMet.headline}
          </h2>
          <p className="lede">
            {met ? VERDICT_COPY.met.subhead : assessment.band.whereThatLeavesYou}
          </p>
          {!met && <p className="lede">{assessment.band.whatToDoNext}</p>}
        </div>

        <div className="verdict-score">
          <strong>{assessment.score}</strong>
          <span>of 8 points evidenced</span>
        </div>
      </section>

      {/* Red line --------------------------------------------------------- */}
      {assessment.redLineFailures.length > 0 && (
        <section className="red-line-block">
          <p className="red-line-tag">Red line</p>
          <h3 className="h3">
            {assessment.redLineFailures
              .map((c) => `Point ${c.number} — ${c.title}`)
              .join(" · ")}
          </h3>
          <p>{VERDICT_COPY.redLineOverride}</p>
          {contradicts && (
            <p className="red-line-emphasis">
              Your total of {assessment.score} out of 8 reads better than your
              position actually is. The red line decides this, not the total.
            </p>
          )}
        </section>
      )}

      {/* Tailored opening ------------------------------------------------- */}
      <TailoredBlock
        kicker="Your position"
        text={tailoring?.slots.openingContext}
        status={tailoringStatus}
      />

      {/* Save and return --------------------------------------------------- */}
      {token && <SavePack token={token} />}

      {/* What to do first ------------------------------------------------- */}
      {first.length > 0 && (
        <section className="section-block">
          <p className="kicker">What to do first</p>
          <h2 className="h2">Start here.</h2>
          <p className="lede">
            In the source&rsquo;s own order: any failed red line first, then the
            thirty-day plan sequence. Nothing here is reordered by context.
          </p>
          <ol className="first-actions">
            {first.map((item) => (
              <li key={item.id}>
                <span className="first-action-point">
                  {item.redLine ? "Red line" : `Point ${item.controlNumber}`}
                </span>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Control breakdown ------------------------------------------------ */}
      <section className="section-block">
        <p className="kicker">The eight-point check</p>
        <h2 className="h2">Point by point.</h2>
        <div className="control-results">
          {assessment.controls.map((control) => {
            const emphasis = tailoring?.slots.controlEmphasis?.[control.number];
            return (
              <article
                key={control.number}
                className={`control-result ${control.met ? "is-met" : "is-gap"}${
                  control.redLine ? " red-line" : ""
                }`}
              >
                <div className="control-head">
                  <span className="control-number">
                    {String(control.number).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>
                      {control.title}
                      {control.redLine && (
                        <span className="red-line-tag">Red line</span>
                      )}
                      <span className="control-status">
                        {control.met ? "Evidenced" : "Gap"}
                      </span>
                    </h3>
                    <p>{control.summary}</p>
                    {emphasis && <p className="tailored-inline">{emphasis}</p>}
                  </div>
                </div>

                {control.unmet.length > 0 && (
                  <ul className="unmet-list">
                    {control.unmet.map((sub) => (
                      <li key={sub.id}>
                        <span className="sub-id">{sub.id}</span>
                        <span>{sub.text}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {control.subStatements.some((s) => !s.applicable) && (
                  <p className="na-note">
                    {control.subStatements.find((s) => !s.applicable)?.disapplyReason}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* How this goes wrong ---------------------------------------------- */}
      <section className="section-block tinted-block">
        <p className="kicker">The three things that actually go wrong</p>
        <div className="wrongs">
          {THREE_THINGS_THAT_GO_WRONG.map((item) => (
            <article key={item.title}>
              <h3 className="h3">{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
        <p className="pattern">{THE_PATTERN}</p>

        <TailoredBlock
          kicker="And in an organisation like yours"
          text={tailoring?.slots.riskScenario}
          status={tailoringStatus}
          variant="scenario"
        />
      </section>

      {/* Thirty-day plan --------------------------------------------------- */}
      <section className="section-block">
        <p className="kicker">Part 2 · The thirty-day plan</p>
        <h2 className="h2">Achievable alongside a normal working month.</h2>
        <div className="plan-grid">
          {THIRTY_DAY_PLAN.map((week) => {
            const relevant = checklist.filter(
              (item) =>
                item.controlNumber !== undefined &&
                week.controls.includes(item.controlNumber),
            );
            return (
              <article key={week.week} className={relevant.length ? "is-priority" : ""}>
                <span className="step-number">{week.label}</span>
                <p>{week.whatYouDo}</p>
                <small>
                  {relevant.length > 0
                    ? `Closes ${relevant.length} of your gaps`
                    : week.who}
                </small>
              </article>
            );
          })}
        </div>
      </section>

      {/* Checklist --------------------------------------------------------- */}
      <section className="section-block">
        <p className="kicker">Your checklist</p>
        <h2 className="h2">
          {checklist.length > 0
            ? `${checklist.length} things to close.`
            : "Nothing outstanding."}
        </h2>
        <p className="lede">
          Working through these does not change the result above. That is a dated
          record of where you stood on {date}. To move your score, re-take the check.
        </p>
        <Checklist checklist={checklist} token={token} checklistState={checklistState} />
      </section>

      {/* Full Playbook ----------------------------------------------------- */}
      <section className="playbook-cta">
        <p className="eyebrow">Beyond the minimum</p>
        <h2 className="h2">What the bare minimum does not give you.</h2>
        <p className="lede">{WHAT_THE_BARE_MINIMUM_DOES_NOT_GIVE_YOU.intro}</p>

        {playbookTriggers.anyTriggered && (
          <ul className="trigger-list">
            {playbookTriggers.noBoardOwner && (
              <li>No named board-level owner for AI</li>
            )}
            {playbookTriggers.consequentialDecisions && (
              <li>AI plays a part in decisions about people</li>
            )}
            {playbookTriggers.noPolicy && <li>No written AI usage policy in place</li>}
          </ul>
        )}

        <div className="playbook-grid">
          {WHAT_THE_BARE_MINIMUM_DOES_NOT_GIVE_YOU.items.map((item) => (
            <article key={item.title}>
              <h3 className="h3">{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
        <p className="playbook-outro">{WHAT_THE_BARE_MINIMUM_DOES_NOT_GIVE_YOU.outro}</p>
      </section>

      {/* Transparency ------------------------------------------------------ */}
      <section className="section-block transparency-note">
        <p className="kicker">How this pack was made</p>
        <p>
          The eight points, the scoring, the policy and the staff note are Karl
          George&rsquo;s work, reproduced unchanged.{" "}
          <TailoringStatusNote tailoring={tailoring} status={tailoringStatus} />{" "}
          The result reflects what you told us about your own organisation; nothing
          here has been independently verified.
        </p>
        <p>{PACK_FOOTER.disclaimer}</p>
      </section>

      <footer className="pack-footer">
        <span>{PACK_FOOTER.builtOn}</span>
        <span>{PACK_FOOTER.organisation}</span>
        <span>{PACK_FOOTER.trademarks}</span>
      </footer>
    </main>
  );
}

/**
 * The checklist, split out because it is the one part of the pack with its
 * own state and its own network call. Everything above it stays a pure
 * render of the frozen assessment.
 */
function Checklist({
  checklist,
  token,
  checklistState,
}: {
  checklist: ChecklistItem[];
  token?: string;
  checklistState?: Record<string, boolean>;
}) {
  const [state, setState] = useState<Record<string, boolean>>(checklistState ?? {});
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const doneCount = checklist.filter((item) => state[item.id]).length;

  async function toggle(itemId: string, next: boolean) {
    if (!token) return;

    const previous = state[itemId] ?? false;
    setError(null);
    setState((current) => ({ ...current, [itemId]: next }));
    setPendingIds((current) => new Set(current).add(itemId));

    try {
      const response = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, itemId, done: next }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.message ?? "That didn't save. Please try again.",
        );
      }
    } catch {
      // Revert to what the server last confirmed, and say plainly what happened.
      setState((current) => ({ ...current, [itemId]: previous }));
      setError(
        "That change didn't save — your connection may have dropped. Try ticking it again.",
      );
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
    }
  }

  return (
    <>
      {token && (
        <p className="checklist-progress" aria-live="polite">
          {doneCount} of {checklist.length} complete
        </p>
      )}
      {!token && checklist.length > 0 && (
        <p className="checklist-note">
          Progress here isn&rsquo;t saved on this page. Use your saved pack
          link to tick items off and come back to them later.
        </p>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <ul className="checklist">
        {checklist.map((item) => {
          const checked = Boolean(state[item.id]);
          const inputId = `checklist-${item.id}`;
          return (
            <li key={item.id} className={item.redLine ? "red-line" : undefined}>
              {token ? (
                <input
                  id={inputId}
                  type="checkbox"
                  className="check-box"
                  checked={checked}
                  disabled={pendingIds.has(item.id)}
                  onChange={(event) => toggle(item.id, event.target.checked)}
                />
              ) : (
                <span className="check-box" aria-hidden="true" />
              )}
              <div>
                {token ? (
                  <label htmlFor={inputId}>
                    <strong>{item.title}</strong>
                  </label>
                ) : (
                  <strong>{item.title}</strong>
                )}
                <p>{item.detail}</p>
              </div>
              <span className="check-tag">
                {item.kind === "find-out"
                  ? "Find out"
                  : item.redLine
                    ? `Point ${item.controlNumber} · Red line`
                    : `Point ${item.controlNumber}`}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
