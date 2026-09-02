import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, clientKey } from "@/lib/api/rate-limit";
import { isValidEmail, MAX_EMAIL_LENGTH } from "@/lib/email/validate";
import { sendReturnLink } from "@/lib/email/send";
import { loadPack, saveEmailConsent } from "@/lib/storage/packs";
import { isValidToken } from "@/lib/storage/token";

export const runtime = "nodejs";

// Closed schema, same reasoning as the checklist and generation endpoints:
// an unrecognised field is rejected outright rather than silently dropped.
const emailLinkRequest = z
  .object({
    token: z.string(),
    email: z.string().max(MAX_EMAIL_LENGTH),
    marketingOptIn: z.boolean(),
  })
  .strict();

export async function POST(request: Request) {
  // This endpoint sends mail, which is a far more abusable action than a
  // checklist tick — someone could use it as a free mailer to any address
  // they can guess a real token for. Rate-limited the same way as the other
  // public endpoints.
  const limit = await checkRateLimit(clientKey(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      { message: "That is a lot of requests in a short time. Wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Malformed request." }, { status: 400 });
  }

  const parsed = emailLinkRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "That didn't look right." }, { status: 400 });
  }

  const { token, email, marketingOptIn } = parsed.data;

  if (!isValidToken(token)) {
    return NextResponse.json({ message: "No saved pack matches that link." }, { status: 404 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ message: "That doesn't look like a valid email address." }, { status: 400 });
  }

  // Confirm the token is real, and load enough to build the return URL,
  // before anything is sent — a token has to prove it names a live pack
  // first, so this can never be used to mail an arbitrary address.
  const loaded = await loadPack(token);

  if (loaded.status === "not-found") {
    return NextResponse.json({ message: "No saved pack matches that link." }, { status: 404 });
  }

  if (loaded.status === "expired") {
    return NextResponse.json(
      { message: "This link has expired. Saved links last 90 days from creation." },
      { status: 410 },
    );
  }

  // Consent is recorded regardless of whether sending actually succeeds —
  // the visitor asked, and that fact is true even if the provider isn't
  // switched on yet.
  const consentResult = await saveEmailConsent(token, email, marketingOptIn);

  if (consentResult.status === "not-found") {
    return NextResponse.json({ message: "No saved pack matches that link." }, { status: 404 });
  }

  if (consentResult.status === "expired") {
    return NextResponse.json(
      { message: "This link has expired. Saved links last 90 days from creation." },
      { status: 410 },
    );
  }

  const origin = new URL(request.url).origin;
  const returnUrl = `${origin}/pack/${token}`;

  const sendResult = await sendReturnLink(email, returnUrl);

  if (!sendResult.ok && sendResult.reason === "not-configured") {
    // Tell the truth: we've noted it, but nothing was actually sent.
    return NextResponse.json(
      { sent: false, reason: "not-configured" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!sendResult.ok) {
    // Never echo the address back; there is nothing address-shaped in this
    // message.
    return NextResponse.json(
      { message: "We couldn't send that just now. Please try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ sent: true }, { headers: { "Cache-Control": "no-store" } });
}
