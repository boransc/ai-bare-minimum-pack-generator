/**
 * Bracketed placeholder fields shared by Part 3 (policy) and Part 4 (staff
 * note).
 *
 * ---------------------------------------------------------------------------
 * CANONICAL SOURCE CONTENT. DO NOT EDIT WITHOUT SIGN-OFF.
 * ---------------------------------------------------------------------------
 *
 * The source instructs the reader to "fill in the bracketed fields, approve
 * it, issue it". We do not guess any of these values — an AI lead's name, an
 * incident contact, a retention period — because a wrong guess is worse than
 * a visible blank. `orgName` is the sole exception: the wizard already asks
 * for it, so where we have it we substitute it; where we don't, it renders
 * as a bracket like everything else.
 *
 * BRACKET_FIELDS is keyed by the exact bracketed text as it appears in the
 * source (case included). Content files keep that literal text inline — the
 * bracket itself is part of the verbatim transcription — and the rendering
 * components look each one up here to render it as a fill-in-able span and,
 * for `orgName` only, to substitute the real value when one is known.
 */

export type BracketFieldId =
  | "orgName"
  | "boardOwnerSeniorTeam"
  | "aiLeadNameRole"
  | "location"
  | "fiveWorkingDays"
  | "incidentContact"
  | "incidentContactRoute"
  | "aiLead"
  | "aiLeadNameContact"
  | "role"
  | "retentionYears"
  | "date"
  | "name"
  | "trainingSessionDetails";

export interface BracketField {
  id: BracketFieldId;
  /** Short human label for what to fill in, shown as a tooltip/aria-label. */
  label: string;
}

/**
 * Every bracket string that appears in the source, mapped to its field.
 * Several distinct bracket occurrences share a field where the source itself
 * uses the same bracket text for the same kind of blank (e.g. every
 * "[location]" is a place to point at a document).
 */
export const BRACKET_FIELDS: Record<string, BracketField> = {
  "[Organisation Name]": { id: "orgName", label: "Organisation name" },
  "[Board / owner / senior team]": {
    id: "boardOwnerSeniorTeam",
    label: "Board / owner / senior team",
  },
  "[board / senior team]": {
    id: "boardOwnerSeniorTeam",
    label: "Board / owner / senior team",
  },
  "[name, role]": { id: "aiLeadNameRole", label: "AI lead: name, role" },
  "[location]": { id: "location", label: "Location" },
  "[five working days]": {
    id: "fiveWorkingDays",
    label: "Request response time",
  },
  "[incident contact]": { id: "incidentContact", label: "Incident contact" },
  "[incident contact and route]": {
    id: "incidentContactRoute",
    label: "Incident contact and route",
  },
  "[AI lead]": { id: "aiLead", label: "AI lead" },
  "[AI lead name and contact]": {
    id: "aiLeadNameContact",
    label: "AI lead name and contact",
  },
  "[role]": { id: "role", label: "Role" },
  "[Role]": { id: "role", label: "Role" },
  "[6]": { id: "retentionYears", label: "Retention period, in years" },
  "[date]": { id: "date", label: "Date" },
  "[name]": { id: "name", label: "Name" },
  "[Name]": { id: "name", label: "Name" },
  "[date, time, format]": {
    id: "trainingSessionDetails",
    label: "Training session date, time and format",
  },
};

/** Every distinct field id declared above, for exhaustiveness tests. */
export const ALL_BRACKET_FIELD_IDS: BracketFieldId[] = Array.from(
  new Set(Object.values(BRACKET_FIELDS).map((f) => f.id)),
);

/** Matches any bracketed placeholder, e.g. "[Organisation Name]", "[date]". */
export const BRACKET_PATTERN = /\[[^\]]+\]/g;
