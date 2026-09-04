/**
 * The half that cannot be proved without a mailbox.
 *
 * lib/email/send.test.ts proves we build the right request: right endpoint,
 * right auth header, right payload, and — the one that matters — that the
 * message carries the link and nothing else about the organisation.
 *
 * Only a real provider and a real inbox can prove the message arrives, so this
 * sends one. It is opt-in and takes the recipient explicitly; it will never
 * guess an address or reuse one it found lying around.
 *
 *   npm run email-check                                  reports configuration
 *   EMAIL_TO=you@example.com npm run email-check         also sends
 *
 * A pass means the provider ACCEPTED the message. It does not mean the message
 * reached an inbox: mail from an unauthenticated free address is routinely
 * filed as spam. Go and look.
 */

import { describe, expect, it } from "vitest";
import { emailProvider, sendReturnLink } from "@/lib/email/send";

const recipient = process.env.EMAIL_TO;

function maskAddress(value: string | undefined): string {
  if (!value) return "unset";
  return value.replace(/(.{2}).*(@.*)/, "$1***$2");
}

/**
 * Always runs, so `npm run email-check` on its own answers "is this set up?"
 * rather than skipping silently and telling you nothing.
 */
describe("email configuration", () => {
  it("reports what is configured", () => {
    const provider = emailProvider();

    console.log("");
    console.log("  provider:  ", provider ?? "NONE");
    console.log("  from:      ", maskAddress(process.env.EMAIL_FROM));
    console.log(
      "  sending:   ",
      provider
        ? "CONFIGURED"
        : "not configured — the page offers to take an address instead",
    );
    if (provider === "smtp") {
      console.log("  host:      ", `${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? 465}`);
      console.log("  user:      ", maskAddress(process.env.SMTP_USER));
    }
    if (!provider) {
      console.log("");
      console.log("  To send through a mailbox you already own, set these four:");
      console.log("    SMTP_HOST, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM");
      console.log("  (SMTP_PORT defaults to 465.) This needs no DNS change and");
      console.log("  no approval from a provider, so it is the shortest route.");
    }
    if (!recipient) {
      console.log("");
      console.log("  To send a real message:");
      console.log("    EMAIL_TO=you@example.com npm run email-check");
      console.log("");
    }

    // Reporting, not asserting. An unconfigured environment is a valid state,
    // and the product is built to behave honestly in it.
    expect(["smtp", "resend", null]).toContain(provider);
  });
});

describe.skipIf(!recipient)("email delivery", () => {
  it("sends a real return link", { timeout: 30_000 }, async () => {
    const provider = emailProvider();

    console.log("");
    console.log("  sending to:", maskAddress(recipient));

    expect(
      provider,
      "No provider configured. Set EMAIL_FROM plus the SMTP_* block (or RESEND_API_KEY).",
    ).not.toBeNull();

    // Deliberately not a real token: this is a delivery test, not a pack, and
    // nothing openable should go out in it.
    const url = "https://example.invalid/pack/delivery-check-not-a-real-pack";
    const result = await sendReturnLink(recipient!, url);

    if (!result.ok) {
      console.log("");
      console.log(`  REJECTED: ${result.reason}`);
      if ("detail" in result && result.detail) {
        console.log(`  provider said: ${result.detail}`);
      }
      if (result.reason.includes("401")) {
        console.log("  401 from Resend is the key itself: revoked, belonging to");
        console.log("  another account, or pasted with whitespace. The message");
        console.log("  above says which.");
      }
      if (result.reason.includes("400")) {
        console.log("  400 usually means EMAIL_FROM is not a verified sender.");
        console.log("  On Resend that means its domain has no DNS records yet;");
        console.log("  the shared onboarding@resend.dev sender only ever reaches");
        console.log("  the Resend account owner's own address.");
      }
      if (result.reason.includes("smtp")) {
        console.log("  SMTP failures, by what the message above says:");
        console.log("   * 'Invalid login' / 535: on Google Workspace this is an");
        console.log("     ordinary account password. It needs an app password,");
        console.log("     which requires 2-step verification on the account, and");
        console.log("     an administrator who has not disabled app passwords.");
        console.log("   * 'Username and Password not accepted' can also mean the");
        console.log("     app password was pasted with its spaces. Strip them.");
        console.log("   * ETIMEDOUT or ECONNREFUSED: the port is blocked. Use 465.");
        console.log("     Vercel blocks outbound 25 but leaves 465 and 587 open.");
        console.log("   * 'from address does not match': Google will only send as");
        console.log("     the authenticated user or one of its verified aliases,");
        console.log("     so EMAIL_FROM has to be SMTP_USER's own address.");
      }
    } else {
      console.log("");
      console.log("  ACCEPTED by the provider.");
      console.log("  Now check the inbox, and the spam folder — that is where");
      console.log("  mail from an unauthenticated free address usually lands.");
    }

    expect(result.ok, `provider rejected the message: ${JSON.stringify(result)}`).toBe(
      true,
    );
  });
});
