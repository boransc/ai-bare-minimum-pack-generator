import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, clientKey } from "@/lib/api/rate-limit";
import { saveChecklistState } from "@/lib/storage/packs";
import { isValidToken } from "@/lib/storage/token";

export const runtime = "nodejs";

// Closed schema: an unrecognised field is rejected outright rather than
// silently dropped, same reasoning as the generation endpoint's schema.
const checklistUpdateRequest = z
  .object({
    token: z.string(),
    itemId: z.string().min(1),
    done: z.boolean(),
  })
  .strict();

export async function POST(request: Request) {
  const limit = await checkRateLimit(clientKey(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      { message: "That is a lot of updates in a short time. Wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Malformed request." }, { status: 400 });
  }

  const parsed = checklistUpdateRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "That update didn't look right." },
      { status: 400 },
    );
  }

  const { token, itemId, done } = parsed.data;

  // Reject an implausible token before it ever reaches KV.
  if (!isValidToken(token)) {
    return NextResponse.json({ message: "No saved pack matches that link." }, { status: 404 });
  }

  const result = await saveChecklistState(token, itemId, done);

  if (result.status === "not-found") {
    return NextResponse.json({ message: "No saved pack matches that link." }, { status: 404 });
  }

  if (result.status === "expired") {
    return NextResponse.json(
      { message: "This link has expired. Saved links last 90 days from creation." },
      { status: 410 },
    );
  }

  return NextResponse.json(
    {
      checklistState: result.pack.checklistState,
      checklistUpdatedAt: result.pack.checklistUpdatedAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
