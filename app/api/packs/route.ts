import { NextResponse } from "next/server";
import { generatePackRequest } from "@/lib/api/schema";
import { checkRateLimit, clientKey } from "@/lib/api/rate-limit";
import { buildPack } from "@/lib/domain/pack";
import { appendLeadIndex, savePack } from "@/lib/storage/packs";
import { generateToken } from "@/lib/storage/token";
import type { WizardAnswers } from "@/lib/domain/types";

/** Node runtime: the tailoring client will need it, and KV writes soon after. */
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = await checkRateLimit(clientKey(request.headers));
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
    // Tailoring is not generated here. Measured p95 on the model is ~20s, and
    // nobody should wait that long to find out whether they meet the minimum.
    // The pack is complete without it; /api/tailor adds the contextual
    // sentences once this page is already on screen.
    tailoring: null,
    now: new Date(),
  });

  const token = generateToken();

  try {
    await savePack(pack, token);
  } catch {
    // The pack itself is fine — we just could not store it. Say so plainly
    // rather than pretending, because the personal link is the whole promise
    // and a link that silently does not work is worse than no link.
    return NextResponse.json(
      {
        message:
          "We worked out your result but could not save it. Please try again in a moment.",
      },
      { status: 503 },
    );
  }

  // The lead index is a convenience for the admin view, never a reason to fail
  // a user's pack. Deliberately not awaited into the response path.
  void appendLeadIndex(pack, token).catch(() => {});

  return NextResponse.json({ token, pack }, {
    headers: {
      // A pack is about one organisation's self-assessment. Nothing caches it.
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
