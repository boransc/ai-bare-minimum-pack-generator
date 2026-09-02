/**
 * Pure helpers shared by the bracketed-field UI (components/bracketed-text.tsx,
 * components/document-fields-context.tsx) and its tests.
 *
 * Nothing here touches KV, the network, or React -- it exists so the two
 * behaviours that matter (which brackets collapse to the same field; what an
 * empty edit means) are defined once and are testable without a browser.
 */

import { BRACKET_FIELDS, BRACKET_PATTERN, type BracketFieldId } from "@/content/v1/brackets";

/**
 * Every distinct field id referenced by a bracket pattern across a set of
 * source strings, in first-seen order. Several bracket texts resolve to the
 * same field id -- "[role]" and "[Role]", "[AI lead]" and
 * "[AI lead name and contact]" -- because the source uses them for the same
 * kind of blank. Collapsing to ids here, rather than counting bracket texts,
 * is what keeps a completion count from double-counting a field that simply
 * appears twice on the page.
 */
export function collectFieldIds(texts: string[]): BracketFieldId[] {
  const seen = new Set<BracketFieldId>();
  const ids: BracketFieldId[] = [];

  for (const text of texts) {
    const matches = text.match(BRACKET_PATTERN) ?? [];
    for (const raw of matches) {
      const field = BRACKET_FIELDS[raw];
      // An unrecognised bracket is a transcription bug surfaced elsewhere
      // (doc-bracket-unknown) -- it isn't a fillable field to count here.
      if (!field) continue;
      if (!seen.has(field.id)) {
        seen.add(field.id);
        ids.push(field.id);
      }
    }
  }

  return ids;
}

/**
 * Apply one edit to a field map the same way the server does it
 * (lib/storage/packs.ts `saveDocumentField`): trim, and an empty result
 * clears the field rather than storing an empty string. Kept as one pure
 * function so the client's optimistic update can never drift from what the
 * server will actually settle on.
 */
export function applyFieldValue(
  fields: Record<string, string>,
  fieldId: string,
  rawValue: string,
): Record<string, string> {
  const trimmed = rawValue.trim();
  const next = { ...fields };
  if (trimmed.length === 0) delete next[fieldId];
  else next[fieldId] = trimmed;
  return next;
}
