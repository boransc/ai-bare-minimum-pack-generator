/**
 * The tailoring orchestrator.
 *
 * Two model calls would be one too many for the same request: this checks KV
 * first, keyed by a hash of the exact inputs, so an identical wizard/assessment
 * pairing never pays for generation twice. On a miss it makes one `runChat`
 * call, retries once for a technical failure only, then runs every slot
 * through layer 1 (schema) and layer 2 (boundary checks). Anything that fails
 * either is dropped to its deterministic fallback and recorded in `rejections`
 * — the pack must always render, and a less-tailored pack is success, not
 * failure.
 */

import "server-only";
import { AI_MODEL, tailoringEnabled } from "@/lib/cloudflare/config";
import { describeFailure, extractJson, runChat } from "@/lib/cloudflare/workers-ai";
import { getJson, kvKeys, putJson } from "@/lib/cloudflare/kv";
import { CONTENT_VERSION } from "@/content/v1";
import type {
  Assessment,
  ControlNumber,
  SlotProvenance,
  TailoringResult,
  TailoringSlots,
  WizardAnswers,
} from "@/lib/domain/types";
import { tailoringCacheKey } from "./cache-key";
import { buildTailoringMessages } from "./prompt";
import { controlEmphasisKeys, slotsJsonSchema, SLOT_CAPS, SlotsSchema } from "./schema";
import { validateSlotText } from "./validate";
import { FALLBACK_OPENING_CONTEXT, FALLBACK_RISK_SCENARIO } from "./fallback";

const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
const RETRY_MAX_TOKENS = 4000;

export interface TailorInput {
  wizard: WizardAnswers;
  assessment: Assessment;
}

export async function tailor(input: TailorInput): Promise<TailoringResult | null> {
  if (!tailoringEnabled()) return null;

  try {
    return await tailorUnsafe(input);
  } catch {
    // Never let a tailoring failure take the pack down with it. Anything that
    // reaches here is a bug we should fix, but the user still gets a pack.
    return buildResult({}, {}, [{ slot: "*", reason: "tailoring threw unexpectedly" }]);
  }
}

async function tailorUnsafe(input: TailorInput): Promise<TailoringResult> {
  const unmetControls = input.assessment.controls
    .filter((c) => !c.met)
    .map((c) => c.number);

  const cacheKey = tailoringCacheKey({
    contentVersion: CONTENT_VERSION,
    model: AI_MODEL,
    wizard: input.wizard,
    unmetControls,
  });

  const cached = await getJson<TailoringResult>(kvKeys.tailoring(cacheKey)).catch(() => null);
  if (cached) return cached;

  const result = await generate(input.wizard, unmetControls);

  // Only cache a result the model actually contributed to.
  //
  // Caching a degraded result would let one transient error poison this exact
  // context for the full TTL: every later visitor with the same answers gets
  // the fallback pack, no call is made, and nothing looks broken — it just
  // quietly stops tailoring. That happened during development, when a schema
  // rejection was cached and served back in a second on the next run.
  if (Object.values(result.provenance).some((p) => p === "model")) {
    // Best-effort write. A cache failure must never fail the request that
    // already has a good answer in hand.
    putJson(kvKeys.tailoring(cacheKey), result, {
      expirationTtlSeconds: CACHE_TTL_SECONDS,
    }).catch(() => {});
  }

  return result;
}

async function generate(
  wizard: WizardAnswers,
  unmetControls: ControlNumber[],
): Promise<TailoringResult> {
  const messages = buildTailoringMessages(wizard, unmetControls);
  const jsonSchema = slotsJsonSchema(unmetControls);

  let reply = await runChat(messages, { jsonSchema });

  // Retry once, with more headroom, but only for technical failures. A
  // boundary rejection is a policy failure and retrying it teaches nothing.
  if (!reply.ok && (reply.failure.kind === "truncated" || reply.failure.kind === "malformed")) {
    reply = await runChat(messages, { jsonSchema, maxTokens: RETRY_MAX_TOKENS });
  }

  if (!reply.ok) {
    // Carry the detail, not just the kind. "http" alone sent us hunting for a
    // schema rejection that the response body named outright.
    return buildResult({}, {}, [
      { slot: "*", reason: `model call failed: ${describeFailure(reply.failure)}` },
    ]);
  }

  const extracted = extractJson(reply.value);
  if (!extracted.ok) {
    return buildResult({}, {}, [{ slot: "*", reason: `extractJson: ${extracted.reason}` }]);
  }

  const parsed = SlotsSchema.safeParse(extracted.value);
  if (!parsed.success) {
    return buildResult({}, {}, [
      { slot: "*", reason: `schema validation failed: ${parsed.error.message.slice(0, 200)}` },
    ]);
  }

  return runLayerTwo(parsed.data, unmetControls);
}

function runLayerTwo(
  parsed: { openingContext: string; riskScenario: string; controlEmphasis: Record<string, string> },
  unmetControls: ControlNumber[],
): TailoringResult {
  const slots: Partial<TailoringSlots> = {};
  const provenance: Record<string, SlotProvenance> = {};
  const rejections: Array<{ slot: string; reason: string }> = [];

  const opening = validateSlotText(parsed.openingContext, SLOT_CAPS.openingContext);
  if (opening.ok) {
    slots.openingContext = parsed.openingContext;
    provenance.openingContext = "model";
  } else {
    rejections.push({ slot: "openingContext", reason: opening.reason ?? "invalid" });
  }

  const risk = validateSlotText(parsed.riskScenario, SLOT_CAPS.riskScenario);
  if (risk.ok) {
    slots.riskScenario = parsed.riskScenario;
    provenance.riskScenario = "model";
  } else {
    rejections.push({ slot: "riskScenario", reason: risk.reason ?? "invalid" });
  }

  const controlEmphasis: Partial<Record<ControlNumber, string>> = {};
  const candidates = controlEmphasisKeys(parsed.controlEmphasis, unmetControls);
  for (const [key, value] of Object.entries(candidates)) {
    const controlNumber = Number(key) as ControlNumber;
    const verdict = validateSlotText(value, SLOT_CAPS.controlEmphasis);
    const slotName = `controlEmphasis.${controlNumber}`;
    if (verdict.ok) {
      controlEmphasis[controlNumber] = value;
      provenance[slotName] = "model";
    } else {
      rejections.push({ slot: slotName, reason: verdict.reason ?? "invalid" });
    }
  }

  return buildResult(slots, controlEmphasis, rejections, provenance);
}

function buildResult(
  slots: Partial<TailoringSlots>,
  controlEmphasis: Partial<Record<ControlNumber, string>>,
  rejections: Array<{ slot: string; reason: string }>,
  provenanceIn: Record<string, SlotProvenance> = {},
): TailoringResult {
  const provenance: Record<string, SlotProvenance> = { ...provenanceIn };
  if (!provenance.openingContext) provenance.openingContext = "fallback";
  if (!provenance.riskScenario) provenance.riskScenario = "fallback";

  // Null only when the call itself never produced anything usable — e.g. it
  // never reached the model, or every slot it returned failed validation.
  const anySlotFromModel = Object.values(provenanceIn).some((p) => p === "model");

  return {
    slots: {
      openingContext: slots.openingContext ?? FALLBACK_OPENING_CONTEXT,
      riskScenario: slots.riskScenario ?? FALLBACK_RISK_SCENARIO,
      controlEmphasis,
    },
    provenance,
    rejections,
    model: anySlotFromModel ? AI_MODEL : null,
    generatedAt: new Date().toISOString(),
  };
}
