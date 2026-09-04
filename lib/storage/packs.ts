/**
 * Saved packs: one JSON blob per token in KV.
 *
 * Two lifetimes apply to the same record and must not be confused:
 *
 *  - `accessExpiresAt` (90 days from creation) is the *link's* lifetime. It is
 *    a value we store and check on read. Returning to the pack never slides
 *    it — that would need a deliberate product decision, not a side effect of
 *    a GET.
 *  - the KV TTL (12 months from creation) is the *data's* lifetime, and it is
 *    Cloudflare's own deletion, not a flag we police. Every write that
 *    touches an existing record must recompute the TTL from the original
 *    `createdAt` rather than resetting the clock, or "delete after 12
 *    months" quietly becomes "delete after 12 months since you last ticked a
 *    box".
 *
 * Kept deliberately as one blob per token: the brief warns KV writes are not
 * transactional, and a single read-modify-write is the simplest thing that
 * cannot half-apply.
 */

import "server-only";
import { getJson, putJson, kvKeys, KvError } from "@/lib/cloudflare/kv";
import type { GeneratedPack } from "@/lib/domain/pack";
import type { TailoringResult } from "@/lib/domain/types";
import { WIZARD_QUESTIONS } from "@/content/v1/wizard";
import { applyRegeneratedSlot, type SlotSelector } from "@/lib/tailoring/schema";
import { computeAccessExpiresAt, isAccessExpired, ttlSecondsRemaining } from "./packs-pure";

export {
  computeAccessExpiresAt,
  retentionDeadline,
  ttlSecondsRemaining,
  isAccessExpired,
} from "./packs-pure";

export interface StoredPack extends GeneratedPack {
  token: string;
  /** ISO 8601. createdAt + 90 days. Checked at read time; never recomputed. */
  accessExpiresAt: string;
  /** Sub-statement id (or "find-out:<field>") -> ticked. */
  checklistState: Record<string, boolean>;
  checklistUpdatedAt: string | null;
  /** Optional email capture. Absent until the visitor asks for their link. */
  emailConsent: EmailConsent | null;
  /**
   * The organisation's own answers to the bracketed fields in Parts 3 and 4 —
   * their AI lead, where the approved tools list lives, and so on.
   *
   * Two rules ride on this field, both load-bearing:
   *
   * 1. It is NEVER sent to the model. Every value here is free text typed by a
   *    visitor, and free text has been kept out of the tailoring prompt since
   *    the start — that is what makes the injection defence hold. Stored and
   *    rendered, never prompted.
   * 2. It is NEVER copied into the lead index. This is the organisation
   *    drafting its own policy, not information it offered Governance AI to be
   *    qualified on. Sales sees that a policy is being filled in and how far;
   *    it does not see the names of their staff.
   */
  documentFields: Record<string, string>;
  documentFieldsUpdatedAt: string | null;
}

export interface EmailConsent {
  email: string;
  marketingOptIn: boolean;
  /** ISO 8601, when consent was recorded. */
  recordedAt: string;
}

// ---------------------------------------------------------------------------
// KV-backed operations.
// ---------------------------------------------------------------------------

export type LoadPackResult =
  | { status: "ok"; pack: StoredPack }
  | { status: "not-found" }
  | { status: "expired"; pack: StoredPack };

export async function savePack(
  pack: GeneratedPack,
  token: string,
  now = new Date(),
): Promise<StoredPack> {
  const stored: StoredPack = {
    ...pack,
    token,
    accessExpiresAt: computeAccessExpiresAt(pack.createdAt),
    checklistState: {},
    checklistUpdatedAt: null,
    emailConsent: null,
    documentFields: {},
    documentFieldsUpdatedAt: null,
  };

  await putJson(kvKeys.pack(token), stored, {
    expirationTtlSeconds: ttlSecondsRemaining(pack.createdAt, now),
  });

  return stored;
}

export async function loadPack(token: string, now = new Date()): Promise<LoadPackResult> {
  const pack = await getJson<StoredPack>(kvKeys.pack(token));
  if (!pack) return { status: "not-found" };

  if (isAccessExpired(pack.accessExpiresAt, now)) {
    return { status: "expired", pack };
  }

  return { status: "ok", pack };
}

export type SaveChecklistResult =
  | { status: "ok"; pack: StoredPack }
  | { status: "not-found" }
  | { status: "expired" };

/**
 * Read-modify-write of the single blob. The TTL is recomputed from the
 * record's original `createdAt`, never from `now` — otherwise every tick
 * would quietly push the 12-month deletion further out.
 */
export async function saveChecklistState(
  token: string,
  itemId: string,
  done: boolean,
  now = new Date(),
): Promise<SaveChecklistResult> {
  const existing = await getJson<StoredPack>(kvKeys.pack(token));
  if (!existing) return { status: "not-found" };

  if (isAccessExpired(existing.accessExpiresAt, now)) {
    return { status: "expired" };
  }

  const updated: StoredPack = {
    ...existing,
    checklistState: { ...existing.checklistState, [itemId]: done },
    checklistUpdatedAt: now.toISOString(),
  };

  await putJson(kvKeys.pack(token), updated, {
    expirationTtlSeconds: ttlSecondsRemaining(existing.createdAt, now),
  });

  return { status: "ok", pack: updated };
}

export type SaveDocumentFieldResult =
  | { status: "ok"; pack: StoredPack }
  | { status: "not-found" }
  | { status: "expired" };

/**
 * Record one bracketed field from Part 3 or Part 4.
 *
 * Same read-modify-write shape as `saveChecklistState`, and the same TTL rule:
 * recomputed from the record's original `createdAt`, never from `now`, so
 * drafting a policy across several sessions does not quietly extend the
 * 12-month retention window.
 *
 * An empty value deletes the field rather than storing "", so a cleared box
 * goes back to showing its bracket and prints as a blank line to write on.
 */
export async function saveDocumentField(
  token: string,
  fieldId: string,
  value: string,
  now = new Date(),
): Promise<SaveDocumentFieldResult> {
  const existing = await getJson<StoredPack>(kvKeys.pack(token));
  if (!existing) return { status: "not-found" };

  if (isAccessExpired(existing.accessExpiresAt, now)) {
    return { status: "expired" };
  }

  const fields = { ...(existing.documentFields ?? {}) };
  const trimmed = value.trim();
  if (trimmed.length === 0) delete fields[fieldId];
  else fields[fieldId] = trimmed;

  const updated: StoredPack = {
    ...existing,
    documentFields: fields,
    documentFieldsUpdatedAt: now.toISOString(),
  };

  await putJson(kvKeys.pack(token), updated, {
    expirationTtlSeconds: ttlSecondsRemaining(existing.createdAt, now),
  });

  return { status: "ok", pack: updated };
}

export type SaveTailoringSlotResult =
  | { status: "ok"; pack: StoredPack }
  | { status: "not-found" }
  | { status: "expired" }
  /** The record predates tailoring, or tailoring never produced anything for
   *  it — there is no `TailoringResult` shell to merge one slot into, and
   *  fabricating one here would invent a `generatedAt`/`model` history that
   *  never happened. */
  | { status: "no-tailoring" };

/**
 * Persist one regenerated tailoring slot against the saved pack.
 *
 * Same read-modify-write shape as `saveChecklistState`, same TTL rule: the
 * TTL is recomputed from the record's original `createdAt`, never from
 * `now`, so asking for a section to be redone does not quietly extend the
 * 12-month retention window. `applyRegeneratedSlot` (lib/tailoring/schema.ts)
 * does the actual merge, shared with the client's optimistic update so the
 * two can never disagree about what changed.
 */
export async function saveTailoringSlot(
  token: string,
  selector: SlotSelector,
  text: string,
  now = new Date(),
): Promise<SaveTailoringSlotResult> {
  const existing = await getJson<StoredPack>(kvKeys.pack(token));
  if (!existing) return { status: "not-found" };

  if (isAccessExpired(existing.accessExpiresAt, now)) {
    return { status: "expired" };
  }

  if (!existing.tailoring) return { status: "no-tailoring" };

  const updated: StoredPack = {
    ...existing,
    tailoring: applyRegeneratedSlot(existing.tailoring, selector, text),
  };

  await putJson(kvKeys.pack(token), updated, {
    expirationTtlSeconds: ttlSecondsRemaining(existing.createdAt, now),
  });

  return { status: "ok", pack: updated };
}

export type SaveTailoringResult =
  | { status: "ok"; pack: StoredPack }
  | { status: "not-found" }
  | { status: "expired" };

/**
 * Store the tailored sentences against the pack.
 *
 * Without this, `pack.tailoring` stayed null in KV forever: /api/tailor
 * generated the text, returned it to the page and forgot it. Two things were
 * broken by that. `useTailoring` already said "a saved pack may already carry
 * its tailoring, in which case there is nothing to fetch" — it never did, so
 * every return visit paid for a fresh model call. And regenerate refuses to
 * touch a pack with no stored tailoring, which made the feature unreachable
 * in the real flow however well it worked in isolation.
 *
 * Same read-modify-write shape as the other writers, and the same TTL rule:
 * recomputed from the record's original `createdAt`, so tailoring a pack does
 * not extend its 12-month retention window.
 */
export async function saveTailoring(
  token: string,
  tailoring: TailoringResult,
  now = new Date(),
): Promise<SaveTailoringResult> {
  const existing = await getJson<StoredPack>(kvKeys.pack(token));
  if (!existing) return { status: "not-found" };

  if (isAccessExpired(existing.accessExpiresAt, now)) {
    return { status: "expired" };
  }

  const updated: StoredPack = { ...existing, tailoring };

  await putJson(kvKeys.pack(token), updated, {
    expirationTtlSeconds: ttlSecondsRemaining(existing.createdAt, now),
  });

  return { status: "ok", pack: updated };
}

export type SaveEmailConsentResult =
  | { status: "ok"; pack: StoredPack }
  | { status: "not-found" }
  | { status: "expired" };

/**
 * Read-modify-write of the single blob, recording that a visitor asked for
 * their link by email (and whether they opted into marketing). Same shape
 * as `saveChecklistState`: the TTL is recomputed from the record's original
 * `createdAt`, never from `now`, so asking for the link does not extend the
 * 12-month retention window.
 */
export async function saveEmailConsent(
  token: string,
  email: string,
  marketingOptIn: boolean,
  now = new Date(),
): Promise<SaveEmailConsentResult> {
  const existing = await getJson<StoredPack>(kvKeys.pack(token));
  if (!existing) return { status: "not-found" };

  if (isAccessExpired(existing.accessExpiresAt, now)) {
    return { status: "expired" };
  }

  const updated: StoredPack = {
    ...existing,
    emailConsent: {
      email,
      marketingOptIn,
      recordedAt: now.toISOString(),
    },
  };

  await putJson(kvKeys.pack(token), updated, {
    expirationTtlSeconds: ttlSecondsRemaining(existing.createdAt, now),
  });

  return { status: "ok", pack: updated };
}

// ---------------------------------------------------------------------------
// Lead index — best-effort, for the parked admin view.
// ---------------------------------------------------------------------------

export interface LeadSummary {
  token: string;
  createdAt: string;
  orgName: string | null;
  sector: string;
  size: string;
  score: number;
  verdict: string;
  redLineFailures: number[];
  playbookTriggers: string[];
  /**
   * The remaining six wizard answers -- the whole reason the lead list exists
   * ("this is the lead list, and it's what makes the business case for your
   * project undeniable"). Optional because lead rows written before these
   * fields existed are still sitting in KV with the old shape; a missing
   * field here means "not recorded", not "empty string" or "false".
   */
  currentAiUse?: string;
  aiUseTypes?: string[];
  sensitiveData?: string;
  regulated?: string;
  consequentialDecisions?: string;
  boardOwner?: string;
}

export function toLeadSummary(pack: GeneratedPack, token: string): LeadSummary {
  return {
    token,
    createdAt: pack.createdAt,
    orgName: pack.orgName,
    sector: pack.wizard.sector,
    size: pack.wizard.size,
    score: pack.assessment.score,
    verdict: pack.assessment.verdict,
    redLineFailures: pack.assessment.redLineFailures.map((c) => c.number),
    playbookTriggers: (
      ["noBoardOwner", "consequentialDecisions", "noPolicy"] as const
    ).filter((key) => pack.playbookTriggers[key]),
    currentAiUse: pack.wizard.currentAiUse,
    aiUseTypes: pack.wizard.aiUseTypes,
    sensitiveData: pack.wizard.sensitiveData,
    regulated: pack.wizard.regulated,
    consequentialDecisions: pack.wizard.consequentialDecisions,
    boardOwner: pack.wizard.boardOwner,
  };
}

// ---------------------------------------------------------------------------
// Wizard-answer labels for the admin view.
//
// `WIZARD_QUESTIONS` is the single source of truth for the human-readable
// label behind every enum value (sector, size, and the rest). Duplicating
// that table here would drift the moment content/v1/wizard.ts changes a
// label or adds an option, so we build the lookup from it instead.
// ---------------------------------------------------------------------------

export const NOT_RECORDED = "Not recorded";

type AnswerField = (typeof WIZARD_QUESTIONS)[number]["id"];

const ANSWER_LABELS: Record<string, Record<string, string>> = Object.fromEntries(
  WIZARD_QUESTIONS.map((q) => [q.id, Object.fromEntries(q.options.map((o) => [o.value, o.label]))]),
);

/**
 * Single-select wizard answer -> its label.
 *
 * Older lead rows lack these fields entirely (`undefined`), and a value that
 * matches no known option -- a hand-edited row, or a content change that
 * dropped an option -- must not leak its raw enum string (e.g. "dont-know")
 * into the admin UI. Both degrade to `NOT_RECORDED`.
 */
export function leadAnswerLabel(field: AnswerField, value: string | null | undefined): string {
  if (value == null) return NOT_RECORDED;
  return ANSWER_LABELS[field]?.[value] ?? NOT_RECORDED;
}

/** Multi-select wizard answer (aiUseTypes) -> comma-joined labels. Same degrade-to-NOT_RECORDED rule as `leadAnswerLabel`. */
export function leadAnswerLabels(field: AnswerField, values: string[] | null | undefined): string {
  if (!values || values.length === 0) return NOT_RECORDED;
  const labels = values.map((v) => ANSWER_LABELS[field]?.[v]);
  if (labels.some((label) => label === undefined)) return NOT_RECORDED;
  return labels.join(", ");
}

/**
 * Append a compact lead row to today's index.
 *
 * Best-effort by design: a lead-list write must never fail a pack save. The
 * index only exists so a later admin page can read a handful of daily keys
 * instead of scanning every token, which KV cannot do anyway.
 */
export async function appendLeadIndex(pack: GeneratedPack, token: string): Promise<void> {
  const isoDate = pack.createdAt.slice(0, 10);
  const key = kvKeys.leadIndex(isoDate);

  try {
    const existing = (await getJson<LeadSummary[]>(key)) ?? [];
    existing.push(toLeadSummary(pack, token));
    // Index entries are tiny and short-lived in the parked admin view's
    // design; a year's TTL keeps it well clear of the pack's own retention
    // without needing separate cleanup logic.
    await putJson(key, existing, { expirationTtlSeconds: 366 * 24 * 60 * 60 });
  } catch (error) {
    // Swallow: the pack has already been saved, and the lead a sales person
    // never sees is a far smaller problem than a pack save that 500s.
    if (error instanceof KvError) {
      console.error("Lead index write failed (non-fatal):", error.message);
    } else {
      console.error("Lead index write failed (non-fatal):", error);
    }
  }
}
