/**
 * Scoring: how to score it, the bands, the red-line rule, and the driver map.
 *
 * ---------------------------------------------------------------------------
 * CANONICAL SOURCE CONTENT. DO NOT EDIT WITHOUT SIGN-OFF.
 * Verbatim from "The AI Bare Minimum Pack", Part 1 ("How to score it",
 * "Your score") and Part 2 ("How this maps to the governance drivers").
 * ---------------------------------------------------------------------------
 */

import type { Band, Driver } from "@/lib/domain/types";

/** The source's own scoring instructions, shown to the user before they answer. */
export const HOW_TO_SCORE = {
  noPartialCredit:
    "Each point is either a yes or a no, with no partial credit, and if something exists in practice but nobody has written it down then the answer is no.",
  evidenceTest:
    "A yes needs evidence behind it: a document, a register entry, a training record or a dated decision. Where you cannot point to the evidence, score it no.",
  bandsSummary:
    "Eight yes answers means the minimum is in place. Six or seven means you are close and the gaps need closing this month. Below six means you are carrying live exposure and should start now.",
  redLineRule:
    "Points 4 and 6 are red lines. A no against either of those means the minimum is not met, whatever the total says, because those two are where the money and the reputation actually go.",
  timeToComplete:
    "It takes about ten minutes to complete, so answer it honestly, because a no here costs you far less than a no discovered by a regulator, a client or a journalist.",
} as const;

/** From the "Your score" table. Ranges are inclusive and cover 0-8 exhaustively. */
export const BANDS: Band[] = [
  {
    id: "eight",
    min: 8,
    max: 8,
    whereThatLeavesYou:
      "The minimum is in place. You are ready for a full governance of AI review.",
    whatToDoNext: "Book the review. Set an annual refresh of the policy and the register.",
  },
  {
    id: "sixToSeven",
    min: 6,
    max: 7,
    whereThatLeavesYou: "Close, with live gaps.",
    whatToDoNext:
      "Close the gaps within 30 days. Use the accompanying guidance note.",
  },
  {
    id: "threeToFive",
    min: 3,
    max: 5,
    whereThatLeavesYou: "Material exposure. AI is in use and largely ungoverned.",
    whatToDoNext:
      "Adopt the policy this month. Issue the staff note. Build the register.",
  },
  {
    id: "zeroToTwo",
    min: 0,
    max: 2,
    whereThatLeavesYou: "You are relying on luck.",
    whatToDoNext:
      "Start immediately, and treat it as a board-level risk owned by the leadership team.",
  },
];

export function bandForScore(score: number): Band {
  const band = BANDS.find((b) => score >= b.min && score <= b.max);
  if (!band) {
    throw new Error(`No band covers score ${score}. Scores must be 0-8.`);
  }
  return band;
}

/**
 * The verdict wording. Note that the red-line rule can make this "not met" at
 * a score of 7, which is deliberate and is the source's own instruction.
 */
export const VERDICT_COPY = {
  met: {
    headline: "The minimum is in place.",
    /** Used only when the score is 8 and no red line failed. */
    subhead:
      "You are ready for a full governance of AI review. Keep the evidence, and set an annual refresh of the policy and the register.",
  },
  notMet: {
    headline: "The minimum is not met.",
    subhead:
      "There is work to close before this organisation can say it has the bare minimum in place.",
  },
  /** Shown when the total would otherwise read as reassuring but a red line failed. */
  redLineOverride:
    "A no against point 4 or point 6 means the minimum is not met, whatever the total says, because those two are where the money and the reputation actually go.",
} as const;

/** From "How this maps to the governance drivers". Three compliance, three performance. */
export const DRIVERS: Driver[] = [
  {
    name: "Resources",
    carriedBy: [2, 8],
    whatItLooksLike:
      "You know what tools you have, and people have the training to use them properly.",
  },
  {
    name: "Board competence",
    carriedBy: [1, 8],
    whatItLooksLike:
      "Someone senior owns AI, understands the risk, and can answer a question about it without deferring.",
  },
  {
    name: "Execution",
    carriedBy: [3, 5, 6],
    whatItLooksLike:
      "The policy is issued, the request route works, and verification actually happens before things go out.",
  },
  {
    name: "Transparency",
    carriedBy: [7],
    whatItLooksLike:
      "Clients, staff and meeting participants know when AI is involved, at a level proportionate to its contribution.",
  },
  {
    name: "Impact",
    carriedBy: [6, 8],
    whatItLooksLike:
      "Errors are caught before they reach anyone, and the ones that get through are logged and learned from.",
  },
  {
    name: "Behaviour",
    carriedBy: [4, 5],
    whatItLooksLike:
      "People declare rather than conceal, and they ask before they paste. That is culture doing the work.",
  },
];

export const DRIVERS_NOTE =
  "Compliance drivers keep you out of trouble, and performance drivers are where the value sits. Most organisations do the first three and stop, then wonder why AI has cost them money and returned nothing.";
