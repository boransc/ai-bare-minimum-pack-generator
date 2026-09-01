/**
 * Canonical content, version 1.
 *
 * ---------------------------------------------------------------------------
 * TRANSCRIPTION STATUS: awaiting sign-off.
 *
 * The files in this directory are a structured transcription of "The AI Bare
 * Minimum Pack" by Karl George MBE. They have been transcribed faithfully and
 * reviewed internally, but they have NOT yet been verified as faithful by
 * Governance AI or the source owner. That verification is a pre-launch gate:
 * every generated pack inherits this content, so a transcription error becomes
 * an error in every document the product produces.
 *
 * See docs/spec/product-technical-spec.md section 9.
 * ---------------------------------------------------------------------------
 *
 * Every pack records the CONTENT_VERSION that produced it. A saved pack is
 * never silently re-rendered against newer content: if the versions differ,
 * the user is offered a regeneration, which creates a new pack and leaves the
 * original intact with its original date.
 */

export const CONTENT_VERSION = "1.0.0";

/** Human-readable label for the cover and footer. */
export const CONTENT_VERSION_LABEL = "AI Bare Minimum Pack · Source v1.0";

export * from "./controls";
export * from "./scoring";
export * from "./guidance";
export * from "./wizard";
