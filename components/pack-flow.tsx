"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ORG_NAME_FIELD,
  TOTAL_STEPS,
  WIZARD_PROMISE,
  WIZARD_QUESTIONS,
} from "@/content/v1/wizard";
import { CONTROLS } from "@/content/v1/controls";
import { HOW_TO_SCORE } from "@/content/v1/scoring";
import type {
  AssessmentAnswers,
  WizardAnswers,
  WizardQuestionId,
} from "@/lib/domain/flow-types";

type Stage = "wizard" | "assessment" | "generating";

/** Partial while the user is filling it in; validated into WizardAnswers on submit. */
type Draft = Partial<Record<WizardQuestionId, string | string[]>>;

export function PackFlow() {
  const [stage, setStage] = useState<Stage>("wizard");
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  const [error, setError] = useState("");

  const question = WIZARD_QUESTIONS[step - 1];

  const setChoice = useCallback(
    (id: WizardQuestionId, value: string, multi: boolean) => {
      setError("");
      setDraft((prev) => {
        if (!multi) return { ...prev, [id]: value };

        const current = (prev[id] as string[] | undefined) ?? [];
        // "Don't know" is exclusive: it cannot coexist with a real answer.
        if (value === "dont-know") {
          return { ...prev, [id]: current.includes(value) ? [] : ["dont-know"] };
        }
        const without = current.filter((v) => v !== "dont-know");
        return {
          ...prev,
          [id]: without.includes(value)
            ? without.filter((v) => v !== value)
            : [...without, value],
        };
      });
    },
    [],
  );

  function nextStep() {
    const value = draft[question.id];
    const answered = Array.isArray(value) ? value.length > 0 : Boolean(value);
    if (!answered) {
      setError("Choose an answer before continuing.");
      return;
    }
    setError("");
    if (step === TOTAL_STEPS) {
      setStage("assessment");
      window.scrollTo({ top: 0 });
    } else {
      setStep(step + 1);
    }
  }

  function previousStep() {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  }

  if (stage === "assessment" || stage === "generating") {
    return (
      <AssessmentStage
        answers={answers}
        setAnswers={setAnswers}
        busy={stage === "generating"}
        onBack={() => setStage("wizard")}
        wizard={{ orgName, draft }}
        onBusy={(busy) => setStage(busy ? "generating" : "assessment")}
      />
    );
  }

  return (
    <div className="flow">
      <aside className="flow-aside no-print">
        <Link className="brand" href="/">
          <span className="brand-mark">G</span>
          <span>Governance AI</span>
        </Link>
        <div className="aside-copy">
          <h2>A few questions about your organisation.</h2>
          <p>{WIZARD_PROMISE}</p>
        </div>
        <div className="aside-footer">
          AI Bare Minimum Pack
          <br />
          Context {step} of {TOTAL_STEPS}
        </div>
      </aside>

      <div className="flow-main">
        <div className="flow-top no-print">
          <button className="text-button" onClick={previousStep} disabled={step === 1}>
            ← Back
          </button>
          <div className="progress">
            <span>
              Context {step} of {TOTAL_STEPS}
            </span>
            <div className="progress-track">
              <i
                className="progress-bar"
                style={{ transform: `scaleX(${step / TOTAL_STEPS})` }}
              />
            </div>
          </div>
        </div>

        <div className="question">
          <h1>
            <span className="sr-only">{question.overline}. </span>
            {question.question}
          </h1>
          <p className="question-help">{question.help}</p>

          {step === 1 && (
            <div style={{ marginBottom: 34 }}>
              <label className="field-label" htmlFor="org-name">
                {ORG_NAME_FIELD.label} — optional
              </label>
              <input
                id="org-name"
                className="text-input"
                type="text"
                value={orgName}
                maxLength={ORG_NAME_FIELD.maxLength}
                placeholder={ORG_NAME_FIELD.placeholder}
                autoComplete="organization"
                onChange={(e) => setOrgName(e.target.value)}
              />
              <p className="na-note">{ORG_NAME_FIELD.help}</p>
            </div>
          )}

          <div
            className="choice-grid"
            role={question.type === "multi" ? "group" : "radiogroup"}
            aria-label={question.question}
          >
            {question.options.map((option) => {
              const value = draft[question.id];
              const selected =
                question.type === "multi"
                  ? ((value as string[] | undefined) ?? []).includes(option.value)
                  : value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className="choice"
                  aria-pressed={selected}
                  onClick={() =>
                    setChoice(question.id, option.value, question.type === "multi")
                  }
                >
                  {option.label}
                  {option.hint && <small>{option.hint}</small>}
                </button>
              );
            })}
          </div>

          <p className="field-error" role="alert">
            {error}
          </p>

          <div className="flow-actions no-print">
            <button className="button primary" onClick={nextStep}>
              {step === TOTAL_STEPS ? "Continue to the eight-point check" : "Continue"}{" "}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function AssessmentStage({
  answers,
  setAnswers,
  busy,
  onBack,
  wizard,
  onBusy,
}: {
  answers: AssessmentAnswers;
  setAnswers: (next: AssessmentAnswers) => void;
  busy: boolean;
  onBack: () => void;
  wizard: { orgName: string; draft: Draft };
  onBusy: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const firstMissingRef = useRef<HTMLDivElement | null>(null);

  // 6.3 only applies where AI touches decisions about people. Mirrors the
  // server-side applicability rule so the user is never asked a question the
  // scoring engine will disregard.
  const excluded = useMemo(
    () => (wizard.draft.consequentialDecisions === "no" ? new Set(["6.3"]) : new Set<string>()),
    [wizard.draft.consequentialDecisions],
  );

  const required = useMemo(
    () =>
      CONTROLS.flatMap((c) => c.subStatements)
        .filter((s) => !excluded.has(s.id))
        .map((s) => s.id),
    [excluded],
  );

  function answer(id: string, value: boolean) {
    setAnswers({ ...answers, [id]: value });
    setMissing((m) => m.filter((x) => x !== id));
    setError("");
  }

  async function submit() {
    const unanswered = required.filter((id) => answers[id] === undefined);
    if (unanswered.length > 0) {
      setMissing(unanswered);
      setError(
        `Answer every statement so the check can be scored. ${unanswered.length} ${
          unanswered.length === 1 ? "statement is" : "statements are"
        } still open.`,
      );
      requestAnimationFrame(() =>
        firstMissingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }

    onBusy(true);
    setError("");
    try {
      const response = await fetch("/api/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: wizard.orgName.trim() || null,
          ...wizard.draft,
          answers,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "We could not generate your pack.");
      }

      const { token } = (await response.json()) as { token: string };

      // Straight to the personal link. There is only one result surface, so
      // what the user sees now is exactly what they see when they come back.
      // ?new=1 tells that page to allow for KV write propagation on first read.
      router.push(`/pack/${token}?new=1`);
    } catch (e) {
      onBusy(false);
      setError(
        e instanceof Error ? e.message : "We could not generate your pack. Try again.",
      );
    }
  }

  let missingMarked = false;

  return (
    <div className="flow-main" style={{ maxWidth: 1040, margin: "0 auto" }}>
      <div className="flow-top no-print">
        <button className="text-button" onClick={onBack}>
          ← Back to context
        </button>
        <span className="progress">The eight-point check</span>
      </div>

      <div className="question" style={{ marginBottom: 44 }}>
        <h1>
          <span className="sr-only">Part 1, AI Minimum Standard. </span>
          Which of these can you evidence today?
        </h1>
        <p className="question-help">
          {HOW_TO_SCORE.evidenceTest} {HOW_TO_SCORE.noPartialCredit}
        </p>
        <div className="assessment-note">
          <strong>Two red lines</strong>
          <span>{HOW_TO_SCORE.redLineRule}</span>
        </div>
      </div>

      {CONTROLS.map((control) => (
        <article
          key={control.number}
          className={`control-card${control.redLine ? " red-line" : ""}`}
        >
          <div className="control-head">
            <span className="control-number">
              {String(control.number).padStart(2, "0")}
            </span>
            <div>
              <h2>
                {control.title}
                {control.redLine && <span className="red-line-tag">Red line</span>}
              </h2>
              <p>{control.summary}</p>
            </div>
          </div>

          <div className="sub-statements">
            {control.subStatements.map((sub) => {
              const notApplicable = excluded.has(sub.id);
              const isMissing = missing.includes(sub.id);
              const markRef = isMissing && !missingMarked;
              if (markRef) missingMarked = true;

              return (
                <div
                  key={sub.id}
                  ref={markRef ? firstMissingRef : undefined}
                  className={`sub-statement${notApplicable ? " not-applicable" : ""}`}
                  style={isMissing ? { background: "var(--red-bg)" } : undefined}
                >
                  <span className="sub-id">{sub.id}</span>
                  <div>
                    <p className="sub-text" style={{ margin: 0 }}>
                      {sub.text}
                    </p>
                    {notApplicable && (
                      <p className="na-note">
                        Not applicable — you told us AI plays no part in decisions
                        about people.
                      </p>
                    )}
                  </div>
                  {notApplicable ? (
                    <span className="sub-id">n/a</span>
                  ) : (
                    <div className="yes-no">
                      <button
                        type="button"
                        data-answer="yes"
                        aria-pressed={answers[sub.id] === true}
                        aria-label={`Yes to statement ${sub.id}`}
                        onClick={() => answer(sub.id, true)}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        data-answer="no"
                        aria-pressed={answers[sub.id] === false}
                        aria-label={`No to statement ${sub.id}`}
                        onClick={() => answer(sub.id, false)}
                      >
                        No
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </article>
      ))}

      <p className="field-error" role="alert">
        {error}
      </p>

      <div className="flow-actions no-print">
        <button className="button primary" onClick={submit} disabled={busy}>
          {busy ? "Preparing your pack…" : "Score my standard"}{" "}
          <span aria-hidden="true">→</span>
        </button>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {required.length} statements · about ten minutes
        </span>
      </div>
    </div>
  );
}
