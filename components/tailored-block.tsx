"use client";

import type { TailoringResult } from "@/lib/domain/types";
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
}: {
  /** What to call this passage in the caption beneath it, e.g. "Written for your organisation." */
  caption: string;
  text?: string;
  status: TailoringStatus;
  variant?: "opening" | "scenario";
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
      <figcaption className="tailored-caption">{caption}</figcaption>
    </figure>
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
