import { NextResponse } from "next/server";
import { checkRateLimit, clientKey } from "@/lib/api/rate-limit";
import { tailorRequestSchema } from "@/lib/api/schema";
import { isValidToken } from "@/lib/storage/token";
import { loadPack, saveTailoring } from "@/lib/storage/packs";
import { tailor } from "@/lib/tailoring";
import { hasModelText } from "@/lib/tailoring/schema";

export const runtime = "nodejs";

/**
 * Tailoring, called after the pack has already rendered.
 *
 * Probing @cf/openai/gpt-oss-120b put p95 latency around twenty seconds. Making
 * the result page wait on that would be a bad product and would put the whole
 * page at the mercy of the model. So the pack renders deterministically and
 * complete from /api/packs, and this endpoint adds the contextual sentences
 * afterwards.
 *
 * The useful consequence is that the fallback path is the default path: if this
 * endpoint is slow, rate limited, disabled or broken, the user already has a
 * correct and complete pack and simply never sees the tailored sentences.
 *
 * The request carries nothing but the pack's token. It used to carry the whole
 * wizard payload again, with the assessment re-derived here so that a
 * hand-crafted POST could not claim a different set of unmet controls to steer
 * what the model was asked about. Reading both from the stored pack achieves
 * the same thing more directly — there is no second copy of the answers to
 * disagree with the first — and it is what lets the result be saved, which is
 * the part that was missing:
 *
 * the tailored text was generated, returned to the page and then forgotten.
 * `useTailoring` already assumed a saved pack might carry its tailoring, and it
 * never did, so every return visit paid for another twenty-second model call.
 * Regenerate, which refuses to touch a pack with no stored tailoring, was
 * unreachable in the real flow for the same reason.
 */
export async function POST(request: Request) {
  const limit = await checkRateLimit(clientKey(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        message:
          "You have asked for a lot of packs in a short time. Your pack is complete either way — wait a moment if you would like the tailored notes as well.",
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Malformed request." }, { status: 400 });
  }

  const parsed = tailorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "That request did not look right." }, { status: 400 });
  }

  const { token } = parsed.data;

  if (!isValidToken(token)) {
    return NextResponse.json({ message: "We can't find that pack." }, { status: 404 });
  }

  const loaded = await loadPack(token);
  if (loaded.status === "not-found") {
    return NextResponse.json({ message: "We can't find that pack." }, { status: 404 });
  }
  if (loaded.status === "expired") {
    return NextResponse.json(
      {
        message:
          "This link has expired. Links last 90 days from when they are created.",
      },
      { status: 410 },
    );
  }

  const { pack } = loaded;

  // Already tailored: hand back what is stored rather than paying for the same
  // text twice. This is the branch that makes a return visit instant.
  if (pack.tailoring) {
    return NextResponse.json(
      { tailoring: pack.tailoring },
      { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
    );
  }

  // tailor() never throws: it returns null when tailoring is switched off, and
  // falls back per slot on any validation failure.
  const tailoring = await tailor({ wizard: pack.wizard, assessment: pack.assessment });

  // See hasModelText: storing a wholly-fallback result would freeze the pack
  // into the fallback for good, because the next visit takes the branch above
  // and never calls the model again.
  if (hasModelText(tailoring)) {
    await saveTailoring(token, tailoring);
  }

  return NextResponse.json(
    { tailoring },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
  );
}
