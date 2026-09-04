/**
 * The API boundary: what we will accept from a browser.
 *
 * Everything arriving here is untrusted. Zod is the only thing standing
 * between a hand-crafted POST and the scoring engine, so the schema is closed
 * (no passthrough), every enum is explicit, and the organisation name — the
 * one free-text field in the product — is normalised here rather than deeper
 * in, where a caller might reasonably assume it had already been cleaned.
 */

import { z } from "zod";
import { ALL_SUB_STATEMENT_IDS } from "@/content/v1/controls";
import { ORG_NAME_FIELD } from "@/content/v1/wizard";

/**
 * Organisation name arrives as free text and ends up inside a model prompt, so
 * it is treated as hostile: collapse all whitespace (newlines are how you fake
 * a new instruction block), cap the length, and empty becomes null.
 */
const orgName = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .transform((value) => value.slice(0, ORG_NAME_FIELD.maxLength))
  .transform((value) => (value.length === 0 ? null : value))
  .nullable();

/** Sub-statement answers, keyed by id. Unknown keys are rejected, not ignored. */
const answers = z
  .record(z.string(), z.boolean())
  .refine(
    (value) => Object.keys(value).every((id) => ALL_SUB_STATEMENT_IDS.includes(id)),
    { message: "Unknown sub-statement id." },
  );

export const generatePackRequest = z
  .object({
    orgName: orgName.optional().default(null),

    sector: z.enum([
      "professional-services",
      "healthcare-social-care",
      "housing",
      "education",
      "charity-voluntary",
      "financial-services",
      "legal",
      "public-sector",
      "technology",
      "manufacturing",
      "retail-hospitality",
      "other",
    ]),
    size: z.enum(["1-10", "11-50", "51-250", "251-1000", "1000+"]),
    currentAiUse: z.enum([
      "not-knowingly",
      "informal",
      "some-teams",
      "organisation-wide",
      "dont-know",
    ]),
    aiUseTypes: z
      .array(
        z.enum([
          "drafting",
          "research",
          "meeting-notes",
          "data-analysis",
          "customer-facing",
          "code",
          "images-media",
          "agentic",
          "built-in",
          "dont-know",
        ]),
      )
      .min(1)
      .max(10),
    sensitiveData: z.enum(["routinely", "occasionally", "no", "dont-know"]),
    regulated: z.enum(["yes", "no", "dont-know"]),
    consequentialDecisions: z.enum(["yes", "no", "dont-know"]),
    boardOwner: z.enum(["named-and-known", "informal", "no", "dont-know"]),

    answers,
  })
  .strict();

export type GeneratePackRequest = z.infer<typeof generatePackRequest>;

/**
 * Tailoring and re-tailoring work from the stored pack, so the only thing a
 * caller supplies is which pack. The token's shape is checked separately by
 * `isValidToken`; this just establishes that a string arrived and that nothing
 * else did.
 */
export const tailorRequestSchema = z.object({ token: z.string() }).strict();
