/**
 * Domain types for the AI Bare Minimum Pack Generator.
 *
 * The vocabulary here follows the source document, not our convenience:
 * the Standard has "points" (which we call controls), each point carries
 * "sub-statements", a point is either met or not with no partial credit,
 * and points 4 and 6 are "red lines".
 */

// ---------------------------------------------------------------------------
// Source content
// ---------------------------------------------------------------------------

export type ControlNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * When a sub-statement counts.
 *
 * Nearly every sub-statement is unconditional. The single exception is 6.3,
 * because the source itself conditions it ("Where AI touches a decision about
 * a person..."). We do not invent applicability rules the source does not
 * state — a sub-statement the source asserts flatly is always applicable,
 * however awkward that is for a given organisation.
 */
export type Applicability =
  | { kind: "always" }
  | {
      kind: "onlyWhenConsequentialDecisions";
      /** Shown on the result page so a disapplied statement explains itself. */
      disapplyReason: string;
    };

/** The remediation action for an unmet sub-statement, taken from the source guidance note. */
export interface Action {
  /** Imperative, short enough for a checklist row. */
  title: string;
  /** One sentence of source-derived detail. */
  detail: string;
}

export interface SubStatement {
  /** e.g. "6.3" — stable across content versions unless the Standard itself changes. */
  id: string;
  /** Verbatim from the source. Never paraphrased, never generated. */
  text: string;
  applicability: Applicability;
  action: Action;
}

/** Which week of the source's thirty-day plan a control's work falls in. */
export type PlanWeek = 1 | 2 | 3 | 4;

export interface Control {
  number: ControlNumber;
  /** Verbatim heading, e.g. "Someone owns AI". */
  title: string;
  /** Verbatim one-line summary beneath the heading. */
  summary: string;
  /** True for points 4 and 6 only. */
  redLine: boolean;
  subStatements: SubStatement[];
  /** Verbatim "Good enough is..." sentence from the guidance note. */
  goodEnough: string;
  /** Verbatim "The mistake to avoid:" sentence from the guidance note. */
  mistakeToAvoid: string;
  /** Drives checklist ordering for non-red-line controls. */
  planWeek: PlanWeek;
}

/** One of the source's six governance drivers. */
export interface Driver {
  name: string;
  carriedBy: ControlNumber[];
  whatItLooksLike: string;
}

/** A scoring band from the source's "Your score" table. */
export interface Band {
  id: "eight" | "sixToSeven" | "threeToFive" | "zeroToTwo";
  min: number;
  max: number;
  /** Verbatim "Where that leaves you". */
  whereThatLeavesYou: string;
  /** Verbatim "What to do next". */
  whatToDoNext: string;
}

// ---------------------------------------------------------------------------
// Wizard context
// ---------------------------------------------------------------------------

export type Sector =
  | "professional-services"
  | "healthcare-social-care"
  | "housing"
  | "education"
  | "charity-voluntary"
  | "financial-services"
  | "legal"
  | "public-sector"
  | "technology"
  | "manufacturing"
  | "retail-hospitality"
  | "other";

export type OrgSize = "1-10" | "11-50" | "51-250" | "251-1000" | "1000+";

export type CurrentAiUse =
  | "not-knowingly"
  | "informal"
  | "some-teams"
  | "organisation-wide"
  | "dont-know";

export type AiUseType =
  | "drafting"
  | "research"
  | "meeting-notes"
  | "data-analysis"
  | "customer-facing"
  | "code"
  | "images-media"
  | "agentic"
  | "built-in"
  | "dont-know";

export type SensitiveData = "routinely" | "occasionally" | "no" | "dont-know";

export type Regulated = "yes" | "no" | "dont-know";

export type ConsequentialDecisions = "yes" | "no" | "dont-know";

export type BoardOwner = "named-and-known" | "informal" | "no" | "dont-know";

/**
 * The eight context answers, plus the optional organisation name.
 *
 * Every field is a closed enum. There is deliberately no free text anywhere in
 * this type: free text would reach the tailoring prompt, and a prompt is not a
 * safe place for user-supplied instructions. `orgName` is the sole exception
 * and is treated as untrusted data at the boundary, never as instruction.
 */
export interface WizardAnswers {
  orgName: string | null;
  sector: Sector;
  size: OrgSize;
  currentAiUse: CurrentAiUse;
  aiUseTypes: AiUseType[];
  sensitiveData: SensitiveData;
  regulated: Regulated;
  consequentialDecisions: ConsequentialDecisions;
  boardOwner: BoardOwner;
}

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------

/** One answer per sub-statement, keyed by sub-statement id. */
export type AssessmentAnswers = Record<string, boolean>;

export interface SubStatementResult {
  id: string;
  text: string;
  /** false when disapplied by an applicability rule. */
  applicable: boolean;
  /** null when not applicable. */
  met: boolean | null;
  /** Present only when applicable is false. */
  disapplyReason?: string;
  action: Action;
}

export interface ControlResult {
  number: ControlNumber;
  title: string;
  summary: string;
  redLine: boolean;
  /** True only when every *applicable* sub-statement is met. No partial credit. */
  met: boolean;
  subStatements: SubStatementResult[];
  unmet: SubStatementResult[];
}

/**
 * "The minimum is in place" / "The minimum is not met".
 *
 * Decided by the red lines first and the band second. A 7/8 organisation
 * failing point 4 or 6 is not met, and the source says so explicitly.
 */
export type Verdict = "met" | "not-met";

export interface Assessment {
  verdict: Verdict;
  /** 0-8. Subordinate to the verdict in every presentation. */
  score: number;
  band: Band;
  /** Red-line controls that came back unmet. Empty when none. */
  redLineFailures: ControlResult[];
  controls: ControlResult[];
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export interface ChecklistItem {
  /** Sub-statement id for a remediation item, or "find-out:<field>" for an uncertainty item. */
  id: string;
  title: string;
  detail: string;
  /** Absent on "find out" items, which come from the wizard rather than a control. */
  controlNumber?: ControlNumber;
  redLine: boolean;
  /** Which week of the source thirty-day plan this sits in. Absent on "find out" items. */
  planWeek?: PlanWeek;
  kind: "remediation" | "find-out";
}

// ---------------------------------------------------------------------------
// Tailoring
// ---------------------------------------------------------------------------

/** The complete set of fields a model is ever allowed to write. */
export interface TailoringSlots {
  openingContext: string;
  riskScenario: string;
  /** Keyed by control number, present only for unmet controls. */
  controlEmphasis: Partial<Record<ControlNumber, string>>;
}

export type SlotProvenance = "model" | "fallback";

export interface TailoringResult {
  slots: TailoringSlots;
  /** Which slots came from the model and which fell back, for audit and the transparency view. */
  provenance: Record<string, SlotProvenance>;
  /** Why each fallback happened. Empty when everything passed. */
  rejections: Array<{ slot: string; reason: string }>;
  model: string | null;
  generatedAt: string;
}
