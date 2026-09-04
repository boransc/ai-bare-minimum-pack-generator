"use client";

import { useState } from "react";
import type { TailoringResult } from "@/lib/domain/types";
import type { SlotSelector } from "@/lib/tailoring/schema";
import type { TailoringStatus } from "./use-tailoring";

/**
 * The pure decision behind the transparency sentence, kept separate from the
 * component so it can be unit tested without a DOM.
 */
export function tailoringStatusMessage(
  tailoring: TailoringResult | null,
  status: TailoringStatus,
): string {
  if (status === "loading") {
    return "The contextual notes for your organisation are still being prepared.";
  }

  const usedModel =
    tailoring !== null &&
    Object.values(tailoring.provenance).some((p) => p === "model");

  if (usedModel) {
    return "A language model wrote a small number of sentences below, set in italics; it cannot alter any requirement.";
  }

  return "No AI-written text appears in this pack.";
}

/**
 * A tailored slot that slots into a page which already stands on its own.
 * "loading" must read as calm progress, never as an error — nothing is
 * broken while this is pending. "unavailable" and "ready" with no text both
 * render nothing: the surrounding source content is already complete.
 *
 * The marking device is typographic, not a labelled, coloured callout box: the
 * text sets in italic serif, distinct from the sans body copy around it, and a
 * short caption underneath states plainly what it is. That is enough to make a
 * model-written sentence findable without dressing it as an alert.
 */
export function TailoredBlock({
  caption,
  text,
  status,
  variant = "opening",
  regenerate,
}: {
  /** What to call this passage in the caption beneath it, e.g. "Written for your organisation." */
  caption: string;
  text?: string;
  status: TailoringStatus;
  variant?: "opening" | "scenario";
  /**
   * Present only when this block can be regenerated: a saved pack (there is
   * a token to save the result against) whose current text came from the
   * model rather than the deterministic fallback. Absent either condition,
   * the caller passes nothing and no control renders.
   */
  regenerate?: RegenerateProps;
}) {
  const className = variant === "scenario" ? "tailored-scenario" : "tailored-opening";

  if (status === "loading") {
    return (
      <p
        className={`${className} tailoring-placeholder`}
        aria-live="polite"
      >
        Adding notes for your organisation&hellip;
      </p>
    );
  }

  if (status === "unavailable" || !text) {
    return null;
  }

  return (
    <figure className={className}>
      <blockquote className="tailored-text">{text}</blockquote>
      <figcaption className="tailored-caption">
        {caption}
        {regenerate && <RegenerateControl {...regenerate} />}
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Regenerate control.
//
// A quiet correction affordance, not a "roll the dice" button: it sits in
// the caption line of the passage it redoes, reads as plain text with an
// underline until hovered/focused, and never appears unless there is both
// somewhere to save the result (a token) and a model-written sentence in
// front of the reader to actually be dissatisfied with.
// ---------------------------------------------------------------------------

export interface RegenerateProps {
  token: string;
  selector: SlotSelector;
  onRegenerated: (text: string) => void;
}

type RegenerateState = "idle" | "loading" | "error";

interface RegenerateApiFailure {
  message?: string;
}

export function RegenerateControl({ token, selector, onRegenerated }: RegenerateProps) {
  const [state, setState] = useState<RegenerateState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setState("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/tailor/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...selector }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const failure = body as RegenerateApiFailure | null;
        setState("error");
        setMessage(failure?.message ?? "That didn't work. The previous wording is still shown.");
        return;
      }

      const text = (body as { text?: string } | null)?.text;
      if (!text) {
        setState("error");
        setMessage("That didn't produce usable text. The previous wording is still shown.");
        return;
      }

      onRegenerated(text);
      setState("idle");
    } catch {
      setState("error");
      setMessage("That didn't reach the server. The previous wording is still shown.");
    }
  }

  return (
    <span className="regenerate no-print">
      {" · "}
      <button
        type="button"
        className="regenerate-button"
        onClick={handleClick}
        disabled={state === "loading"}
        aria-label="Regenerate this passage"
      >
        {state === "loading" ? "Regenerating…" : "Regenerate"}
      </button>
      {state === "error" && message && (
        <span className="regenerate-error" role="alert">
          {" "}
          {message}
        </span>
      )}
    </span>
  );
}

export function TailoringStatusNote({
  tailoring,
  status,
}: {
  tailoring: TailoringResult | null;
  status: TailoringStatus;
}) {
  return <>{tailoringStatusMessage(tailoring, status)}</>;
}
