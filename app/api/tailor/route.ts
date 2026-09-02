import { NextResponse } from "next/server";
import { checkRateLimit, clientKey } from "@/lib/api/rate-limit";
import { generatePackRequest } from "@/lib/api/schema";
import { assess } from "@/lib/domain/assessment";
import { tailor } from "@/lib/tailoring";
import type { WizardAnswers } from "@/lib/domain/types";

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
 * The client sends the same payload it sent to /api/packs rather than the
 * assessment it received back. Re-deriving the assessment here costs nothing
 * and means a hand-crafted POST cannot claim a different set of unmet controls
 * to steer what the model is asked about.
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

  const parsed = generatePackRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Those answers did not look right." }, { status: 400 });
  }

  const { answers, ...wizard } = parsed.data;
  const assessment = assess(answers, wizard as WizardAnswers);

  // tailor() never throws: it returns null when tailoring is switched off, and
  // falls back per slot on any validation failure.
  const tailoring = await tailor({ wizard: wizard as WizardAnswers, assessment });

  return NextResponse.json(
    { tailoring },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
  );
}
