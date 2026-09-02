/**
 * Layer 2: deterministic boundary checks.
 *
 * The model may describe situations; it may never state obligations, name a
 * law, regulator or real organisation, or introduce a number it was not
 * given. These patterns are ported near-verbatim from scripts/probe-tailoring.mjs,
 * which tested them against adversarial input before this layer existed.
 *
 * A pattern hit here is a policy failure, not a technical one — there is no
 * retry, only immediate fallback for that slot.
 */

export interface Verdict {
  ok: boolean;
  /** Human-readable reason, present only when `ok` is false. */
  reason?: string;
}

export const BANNED_PATTERNS: Array<[RegExp, string]> = [
  [
    /\b(EU AI Act|AI Act|GDPR|UK GDPR|ISO\s?\/?\s?IEC?\s?42001|ISO 42001|Article\s+\d+|Data Protection Act|Equality Act|Consumer Standards|Housing Ombudsman)\b/i,
    "named law/standard",
  ],
  [
    /\b(FCA|ICO|Information Commissioner|Ofsted|CQC|SRA|FRC|Regulator of Social Housing|Charity Commission|Ofcom|PRA)\b/i,
    "named regulator",
  ],
  [
    /\b(must|required to|obliged to|obligated|mandatory|the law requires|legally required|you have to|shall)\b/i,
    "obligation language",
  ],
  [
    /\b\d+\s?(day|days|hour|hours|month|months|year|years|%|per cent|percent|million|euro|EUR|GBP)\b/i,
    "numeric threshold/deadline",
  ],
  [/[£$€]\s?\d/, "monetary amount"],
  [
    /\b(Deloitte|West Midlands Police|Copilot|ChatGPT|OpenAI|Google|Microsoft|Gemini|Zoom)\b/,
    "named real organisation/product",
  ],
  [/^\s*[-*•]|\n\s*[-*•]|\n\s*\d\./, "markdown/list formatting"],
];

/** Runs every banned pattern against one slot value. First hit wins. */
export function validateSlotText(value: string, cap: number): Verdict {
  if (value.trim().length === 0) {
    return { ok: false, reason: "empty" };
  }
  if (value.length > cap) {
    return { ok: false, reason: `over cap: ${value.length} > ${cap}` };
  }
  for (const [pattern, label] of BANNED_PATTERNS) {
    const match = value.match(pattern);
    if (match) {
      return { ok: false, reason: `${label}: "${match[0]}"` };
    }
  }
  return { ok: true };
}
