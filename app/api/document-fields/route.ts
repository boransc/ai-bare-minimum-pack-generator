import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, clientKey } from "@/lib/api/rate-limit";
import { ALL_BRACKET_FIELD_IDS } from "@/content/v1/brackets";
import { isValidToken } from "@/lib/storage/token";
import { saveDocumentField } from "@/lib/storage/packs";

export const runtime = "nodejs";

/**
 * One bracketed field from Part 3 or Part 4 of the pack.
 *
 * The values here are the organisation writing its own policy — its AI lead,
 * its incident contact, where its approved tools list lives. Two things follow
 * from that, enforced elsewhere rather than here: the values never reach the
 * tailoring prompt (lib/tailoring builds its input from closed enums only), and
 * they never enter the lead index (lib/storage/packs.ts).
 *
 * `fieldId` is checked against the declared bracket ids rather than accepted as
 * a free string, so this endpoint cannot be used to write arbitrary keys into a
 * stored pack.
 */
const requestSchema = z
  .object({
    token: z.string(),
    fieldId: z.enum(ALL_BRACKET_FIELD_IDS as [string, ...string[]]),
    // Generous but bounded. These are names, roles and locations, not essays,
    // and an unbounded field on a public endpoint is a way to fill a KV value.
    value: z.string().max(200),
  })
  .strict();

export async function POST(request: Request) {
  const limit = await checkRateLimit(clientKey(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      { message: "That is a lot of edits at once. Wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Malformed request." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "That edit did not look right." }, { status: 400 });
  }

  const { token, fieldId, value } = parsed.data;

  // Reject anything that does not even look like a token before touching KV.
  if (!isValidToken(token)) {
    return NextResponse.json({ message: "We can't find that pack." }, { status: 404 });
  }

  const result = await saveDocumentField(token, fieldId, value);

  if (result.status === "not-found") {
    return NextResponse.json({ message: "We can't find that pack." }, { status: 404 });
  }

  if (result.status === "expired") {
    return NextResponse.json(
      {
        message:
          "This link has expired, so your pack can no longer be edited. Links last 90 days from when they are created.",
      },
      { status: 410 },
    );
  }

  return NextResponse.json(
    { fields: result.pack.documentFields },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
  );
}
