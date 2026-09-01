import { NextResponse } from "next/server";
import { generatePackRequest } from "@/lib/api/schema";
import { checkRateLimit, clientKey } from "@/lib/api/rate-limit";
import { buildPack } from "@/lib/domain/pack";
import type { WizardAnswers } from "@/lib/domain/types";

/** Node runtime: the tailoring client will need it, and KV writes soon after. */
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = checkRateLimit(clientKey(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        message:
          "That is a lot of packs in a short time. Wait a moment and try again.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfter) },
      },
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
    return NextResponse.json(
      {
        message: "Those answers did not look right. Start the check again.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const { answers, ...wizard } = parsed.data;

  const pack = buildPack({
    wizard: wizard as WizardAnswers,
    answers,
    // Tailoring arrives in the next phase. Until then every pack renders from
    // source content alone, which is exactly the fallback path we want proven
    // first rather than discovered later.
    tailoring: null,
    now: new Date(),
  });

  return NextResponse.json(pack, {
    headers: {
      // A pack is about one organisation's self-assessment. Nothing caches it.
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
