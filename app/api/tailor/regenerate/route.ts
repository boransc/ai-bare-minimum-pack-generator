import { NextResponse } from "next/server";
import { checkRateLimit, clientKey } from "@/lib/api/rate-limit";
import { isValidToken } from "@/lib/storage/token";
import { loadPack, saveTailoringSlot } from "@/lib/storage/packs";
import { regenerateSlot } from "@/lib/tailoring";
import { regenerateRequestSchema, type SlotSelector } from "@/lib/tailoring/schema";
import type { ControlNumber } from "@/lib/domain/types";

export const runtime = "nodejs";

/**
 * Regenerating one tailored slot, for an already-saved pack.
 *
 * A sibling route rather than an optional `slot` on POST /api/tailor: first
 * generation has no token yet — the pack has not been saved — and takes the
 * full wizard payload because it has to re-derive the assessment from
 * scratch. Regenerate only ever applies to a pack that already exists, takes
 * nothing but a token and which slot to redo, and persists its result.
 * Folding both into one handler would mean branching the request shape,
 * the trust model and the persistence path on a `slot` parameter — two
 * small handlers with one job each are plainer than that.
 *
 * The wizard and assessment used to build the prompt are never taken from
 * the request body: they are the ones already stored against this token
 * (re-derived server-side at first generation, never edited afterwards), so
 * a caller cannot use this endpoint to tailor text for answers it never
 * actually submitted, or for a control the stored assessment does not call
 * unmet. The only things a caller supplies are the token and which of the
 * three permitted slot kinds to redo — `regenerateRequestSchema`
 * (lib/tailoring/schema.ts) rejects anything else outright.
 */

export async function POST(request: Request) {
  // Rate limiting.
  //
  // `checkRateLimit` buckets purely by client IP and time window (see
  // lib/api/rate-limit.ts — the KV key has no endpoint in it), so this
  // route already shares the same 20/minute, 60/hour budget as
  // POST /api/tailor and every other AI-calling endpoint from the same
  // caller. That is the right shape for "regenerate is more abusable
  // because it's repeatable on demand": a visitor who mashes the button
  // is spending the same budget they would spend generating fresh packs,
  // not a separate, additional allowance. No new limiter is needed here.
  const limit = await checkRateLimit(clientKey(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        message:
          "You have asked for a lot of regenerations in a short time. Wait a moment and try again.",
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

  const parsed = regenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "That request did not look right." }, { status: 400 });
  }

  const { token, slot, control } = parsed.data;

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
          "This link has expired, so it can no longer be regenerated. Links last 90 days from when they are created.",
      },
      { status: 410 },
    );
  }

  const { pack } = loaded;
  if (!pack.tailoring) {
    return NextResponse.json(
      { message: "This pack has no tailored text to regenerate." },
      { status: 404 },
    );
  }

  const selector: SlotSelector =
    slot === "controlEmphasis" ? { slot, control: control as ControlNumber } : { slot };

  const result = await regenerateSlot({ wizard: pack.wizard, assessment: pack.assessment }, selector);

  if (!result.ok) {
    // Never a stack trace, never the internal reason (a schema-rejection
    // detail or a raw HTTP status is not something a visitor can act on).
    // The previous text is untouched in storage — nothing is saved on a
    // failure — so the pack still shows exactly what it showed before.
    return NextResponse.json(
      {
        message:
          "That section couldn't be regenerated just now. The previous wording is still shown — try again shortly.",
      },
      { status: 502 },
    );
  }

  const saved = await saveTailoringSlot(token, selector, result.text);

  if (saved.status === "not-found" || saved.status === "no-tailoring") {
    return NextResponse.json({ message: "We can't find that pack." }, { status: 404 });
  }
  if (saved.status === "expired") {
    return NextResponse.json(
      { message: "This link has expired, so it can no longer be regenerated." },
      { status: 410 },
    );
  }

  return NextResponse.json(
    { text: result.text },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
  );
}
