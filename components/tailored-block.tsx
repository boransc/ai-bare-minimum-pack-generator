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
    return "A language model wrote a small number of contextual sentences, marked in the margin; it cannot alter any requirement.";
  }

  return "No AI-written text appears in this pack.";
}

/**
 * A tailored slot that slots into a page which already stands on its own.
 * "loading" must read as calm progress, never as an error — nothing is
 * broken while this is pending. "unavailable" and "ready" with no text both
 * render nothing: the surrounding source content is already complete.
 */
export function TailoredBlock({
  kicker,
  text,
  status,
  variant = "opening",
}: {
  kicker: string;
  text?: string;
  status: TailoringStatus;
  variant?: "opening" | "scenario";
}) {
  const className = variant === "scenario" ? "tailored-scenario" : "tailored-opening";

  if (status === "loading") {
    return (
      <div className={`${className} tailoring-placeholder`} aria-live="polite">
        <p className="kicker">{kicker}</p>
        <p className="tailoring-placeholder-text">
          Adding notes for your organisation&hellip;
        </p>
      </div>
    );
  }

  if (status === "unavailable" || !text) {
    return null;
  }

  return (
    <div className={className}>
      <p className="kicker">{kicker}</p>
      <p className="tailored-text">{text}</p>
    </div>
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
