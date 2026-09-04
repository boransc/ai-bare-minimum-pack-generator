/**
 * The eight context questions.
 *
 * These are ours, not the source's — the Pack does not contain a context
 * wizard. They exist only to steer emphasis and examples, and they never
 * affect the 0-8 score, which comes solely from the eight-point check.
 *
 * Three rules hold this file together:
 *
 *  1. Every option is a closed enum. There is no free text anywhere, because
 *     free text would reach the tailoring prompt.
 *  2. "Don't know" is a real answer, not a failure. It produces a "find out"
 *     action and never counts as a pass.
 *  3. `sendToModel: false` fields are captured for the lead record and are
 *     never included in a prompt. The regulator list is the reason this
 *     mechanism exists: knowing someone is regulated may shape emphasis,
 *     but knowing *which* regulator invites the model to invent that
 *     regulator's requirements.
 */

import type { WizardAnswers } from "@/lib/domain/types";

export interface WizardOption {
  value: string;
  label: string;
  /** Optional clarifier shown under the label. */
  hint?: string;
}

export interface WizardQuestion {
  id: keyof Omit<WizardAnswers, "orgName">;
  /** 1-8, matching the progress indicator. */
  step: number;
  overline: string;
  question: string;
  help: string;
  type: "single" | "multi";
  options: WizardOption[];
  /** False for fields deliberately withheld from the tailoring prompt. */
  sendToModel: boolean;
}

export const ORG_NAME_FIELD = {
  label: "Organisation name",
  help: "This appears on the cover of your pack. You can leave it blank.",
  placeholder: "e.g. Northgate Housing",
  fallback: "Your organisation",
  maxLength: 120,
  optional: true,
} as const;

export const WIZARD_QUESTIONS: WizardQuestion[] = [
  {
    id: "sector",
    step: 1,
    overline: "Sector",
    question: "Which sector do you work in?",
    help: "This helps us choose relevant examples. Category level only.",
    type: "single",
    sendToModel: true,
    options: [
      { value: "professional-services", label: "Professional services" },
      { value: "healthcare-social-care", label: "Healthcare and social care" },
      { value: "housing", label: "Housing" },
      { value: "education", label: "Education" },
      { value: "charity-voluntary", label: "Charity and voluntary" },
      { value: "financial-services", label: "Financial services" },
      { value: "legal", label: "Legal" },
      { value: "public-sector", label: "Public sector and local government" },
      { value: "technology", label: "Technology" },
      { value: "manufacturing", label: "Manufacturing and industrial" },
      { value: "retail-hospitality", label: "Retail and hospitality" },
      { value: "other", label: "Something else" },
    ],
  },
  {
    id: "size",
    step: 2,
    overline: "Scale",
    question: "How many people work for your organisation?",
    help: "This helps us pitch the work at the right scale.",
    type: "single",
    sendToModel: true,
    options: [
      { value: "1-10", label: "1 to 10" },
      { value: "11-50", label: "11 to 50" },
      { value: "51-250", label: "51 to 250" },
      { value: "251-1000", label: "251 to 1,000" },
      { value: "1000+", label: "Over 1,000" },
    ],
  },
  {
    id: "currentAiUse",
    step: 3,
    overline: "Today",
    question: "How would you describe your organisation's use of AI today?",
    help: "Choose the description closest to where you actually are.",
    type: "single",
    sendToModel: true,
    options: [
      {
        value: "not-knowingly",
        label: "We are not knowingly using it",
        hint: "Nobody has been asked, and nothing has been approved",
      },
      {
        value: "informal",
        label: "Some people use it informally",
        hint: "It happens, but no one is tracking it",
      },
      { value: "some-teams", label: "It is used regularly in some teams" },
      { value: "organisation-wide", label: "It is used across the organisation" },
      { value: "dont-know", label: "We don't know" },
    ],
  },
  {
    id: "aiUseTypes",
    step: 4,
    overline: "Activity",
    question: "What do people use AI for?",
    help: "Select all that apply. Types of activity, not tool names.",
    type: "multi",
    sendToModel: true,
    options: [
      { value: "drafting", label: "Drafting and writing" },
      { value: "research", label: "Research and summarising" },
      { value: "meeting-notes", label: "Meeting notes and transcription" },
      { value: "data-analysis", label: "Data analysis" },
      { value: "customer-facing", label: "Customer or client-facing chat" },
      { value: "code", label: "Code" },
      { value: "images-media", label: "Images or media" },
      {
        value: "agentic",
        label: "Tools that take actions on their own",
        hint: "Not just producing text, but doing something with it",
      },
      {
        value: "built-in",
        label: "Built-in features in software we already own",
        hint: "The ones people forget they are using",
      },
      { value: "dont-know", label: "We don't know" },
    ],
  },
  {
    id: "sensitiveData",
    step: 5,
    overline: "Data",
    question: "Does AI ever touch confidential, client or personal information?",
    help: "Category level only. Do not describe the information itself.",
    type: "single",
    sendToModel: true,
    options: [
      { value: "routinely", label: "Yes, routinely" },
      { value: "occasionally", label: "Yes, occasionally" },
      { value: "no", label: "No" },
      { value: "dont-know", label: "We don't know" },
    ],
  },
  {
    id: "regulated",
    step: 6,
    overline: "Regulation",
    question: "Is your organisation regulated?",
    help: "We do not ask which regulator. Regulator-specific readiness is a question for the fuller review, not for this pack.",
    type: "single",
    sendToModel: true,
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "dont-know", label: "We don't know" },
    ],
  },
  {
    id: "consequentialDecisions",
    step: 7,
    overline: "Consequences",
    question: "Does AI play any part in decisions about people?",
    help: "For example recruitment, performance, credit, eligibility or access to a service. Do not describe individual cases.",
    type: "single",
    sendToModel: true,
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "dont-know", label: "We don't know" },
    ],
  },
  {
    id: "boardOwner",
    step: 8,
    overline: "Accountability",
    question:
      "Is one named person at board or senior level accountable for AI?",
    help: "We do not need their name.",
    type: "single",
    sendToModel: true,
    options: [
      { value: "named-and-known", label: "Yes, named and everyone knows who" },
      { value: "informal", label: "Someone handles it informally" },
      { value: "no", label: "No" },
      { value: "dont-know", label: "We don't know" },
    ],
  },
];

export const TOTAL_STEPS = WIZARD_QUESTIONS.length;

/**
 * "Find out" actions generated from uncertainty. These are not remediation
 * items against the Standard — nothing here affects the score. They are simply
 * the honest consequence of answering "we don't know" to a question about your
 * own organisation.
 */
export const FIND_OUT_ACTIONS: Partial<
  Record<keyof WizardAnswers, { title: string; detail: string }>
> = {
  currentAiUse: {
    title: "Find out how much AI is actually being used",
    detail:
      "Ask every team, in writing, what they use and on what. Make it safe to answer honestly.",
  },
  aiUseTypes: {
    title: "Find out what AI is being used for",
    detail:
      "Include the AI features already sitting inside the software you own, because these are the ones people forget.",
  },
  sensitiveData: {
    title: "Find out whether AI is touching confidential or personal information",
    detail:
      "This is the question that decides how urgent the data rules are. Answer it before anything else.",
  },
  regulated: {
    title: "Confirm whether your organisation is regulated, and by whom",
    detail:
      "Your regulator's own expectations sit on top of this pack. Establishing that is part of the fuller review.",
  },
  consequentialDecisions: {
    title: "Find out whether AI plays any part in decisions about people",
    detail:
      "Recruitment, performance, credit, eligibility and refusal of service are where this bites hardest.",
  },
  boardOwner: {
    title: "Establish who is accountable for AI at senior level",
    detail:
      "It does not need to be anyone technical. It does need to be someone named.",
  },
};

/** The wizard's own promise to the user, shown before the first question. */
export const WIZARD_PROMISE =
  "Eight questions, all multiple choice, about a minute. We never ask for anything confidential, and nothing you enter here changes your score.";

// ---------------------------------------------------------------------------
// Turning stored answers back into the words the visitor actually chose.
//
// Lives here rather than in lib/storage, which is server-only: the saved pack
// shows the declared context to the visitor as part of its dated record, and
// the admin lead list shows the same answers to Governance AI. Both need these
// labels, so they are derived once from WIZARD_QUESTIONS. A second, hand-kept
// table would drift the moment an option is renamed.
// ---------------------------------------------------------------------------

export type AnswerField = (typeof WIZARD_QUESTIONS)[number]["id"];

/** Shown wherever an answer is missing or unrecognised, never a raw enum. */
export const NOT_RECORDED = "Not recorded";

const ANSWER_LABELS: Record<string, Record<string, string>> = Object.fromEntries(
  WIZARD_QUESTIONS.map((q) => [
    q.id,
    Object.fromEntries(q.options.map((o) => [o.value, o.label])),
  ]),
);

/**
 * A single-select answer as its label.
 *
 * Records saved before a field existed hold `undefined`, and a value matching
 * no known option — a hand-edited row, or a content change that dropped an
 * option — must not leak its raw enum ("dont-know") into the page. Both
 * degrade to NOT_RECORDED.
 */
export function answerLabel(
  field: AnswerField,
  value: string | null | undefined,
): string {
  if (value == null) return NOT_RECORDED;
  return ANSWER_LABELS[field]?.[value] ?? NOT_RECORDED;
}

/** A multi-select answer (aiUseTypes) as a readable list. Same degrade rule. */
export function answerLabels(
  field: AnswerField,
  values: string[] | null | undefined,
): string {
  if (!values || values.length === 0) return NOT_RECORDED;
  const labels = values.map((v) => ANSWER_LABELS[field]?.[v]);
  if (labels.some((label) => label === undefined)) return NOT_RECORDED;
  return labels.join(", ");
}

/** The eight questions in order, for rendering a declared-context summary. */
export const ANSWER_FIELDS: AnswerField[] = WIZARD_QUESTIONS.map((q) => q.id);

/** The question text, so a summary can label each answer with what was asked. */
export const QUESTION_LABELS: Record<string, string> = Object.fromEntries(
  WIZARD_QUESTIONS.map((q) => [q.id, q.overline]),
);
