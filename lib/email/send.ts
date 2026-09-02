/**
 * Sending the return link by email.
 *
 * Provider-agnostic at the call site: `sendReturnLink` is the only thing the
 * rest of the app knows about. Two adapters, chosen by whichever credentials
 * are present, both over plain REST — no SDK dependency for one endpoint.
 *
 * Why two:
 *
 *   Resend requires a verified sending *domain* before it will deliver to
 *   arbitrary recipients, which needs DNS records on a domain you own.
 *
 *   Brevo verifies a single sender *address*, so an ordinary mailbox works and
 *   nothing needs to be bought. That is the practical choice when there is no
 *   domain to hand. The trade-off is real: since the 2024 Gmail and Yahoo bulk
 *   sender rules, mail sent *from* a free address (@gmail.com and friends)
 *   is routinely filtered to spam or refused, because it cannot be
 *   authenticated. It will work; it will not always arrive in an inbox.
 *
 * The message may contain the personal link and one line of context. Nothing
 * else. The score, the verdict and the gaps live behind the link, never in the
 * email that points at it. That is a product rule, not an implementation
 * detail, so do not add fields here "while we're at it".
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const SEND_TIMEOUT_MS = 8000;
const SUBJECT = "Your AI Bare Minimum Pack link";

export type SendResult =
  | { ok: true }
  /** `detail` is the provider's own words, for logs and the check script — never shown to a visitor. */
  | { ok: false; reason: string; detail?: string };

export type EmailProvider = "brevo" | "resend" | null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildBody(url: string): { text: string; html: string } {
  const text = [
    "Here is the link back to your AI Bare Minimum Pack:",
    url,
    "",
    "It works for 90 days. Anyone with this link can open the pack, so keep it somewhere private.",
  ].join("\n");

  const safeUrl = escapeHtml(url);
  const html = [
    "<p>Here is the link back to your AI Bare Minimum Pack:</p>",
    `<p><a href="${safeUrl}">${safeUrl}</a></p>`,
    "<p>It works for 90 days. Anyone with this link can open the pack, so keep it somewhere private.</p>",
  ].join("\n");

  return { text, html };
}

/**
 * Which adapter the current environment can use.
 *
 * Brevo wins when both are configured, because it is the one that works
 * without owning a domain and is therefore the deliberate choice here.
 */
export function emailProvider(): EmailProvider {
  const from = process.env.EMAIL_FROM;
  if (!from) return null;
  if (process.env.BREVO_API_KEY) return "brevo";
  if (process.env.RESEND_API_KEY) return "resend";
  return null;
}

/**
 * Whether mail can actually be delivered.
 *
 * The result page asks this before it renders, so it never offers to send
 * something it cannot send. Offering and then apologising is worse than not
 * offering.
 */
export function emailSendingConfigured(): boolean {
  return emailProvider() !== null;
}

async function sendViaBrevo(
  apiKey: string,
  from: string,
  to: string,
  body: { text: string; html: string },
): Promise<Response> {
  return fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { email: from, name: "Governance AI" },
      to: [{ email: to }],
      subject: SUBJECT,
      textContent: body.text,
      htmlContent: body.html,
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
}

async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  body: { text: string; html: string },
): Promise<Response> {
  return fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: SUBJECT,
      text: body.text,
      html: body.html,
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
}

/**
 * Send the return link to `to`.
 *
 * Never throws. A missing configuration or a provider failure both come back
 * as `{ ok: false, reason }` so the caller can tell the visitor the truth
 * instead of returning a 500 for something that is not their problem.
 */
export async function sendReturnLink(to: string, url: string): Promise<SendResult> {
  const provider = emailProvider();
  const from = process.env.EMAIL_FROM;

  if (!provider || !from) {
    return { ok: false, reason: "not-configured" };
  }

  const body = buildBody(url);

  try {
    const response =
      provider === "brevo"
        ? await sendViaBrevo(process.env.BREVO_API_KEY!, from, to, body)
        : await sendViaResend(process.env.RESEND_API_KEY!, from, to, body);

    if (!response.ok) {
      // Carry what the provider actually said. A bare status sends you hunting
      // for a cause the response body already names — Brevo, for instance,
      // distinguishes an invalid key from an unverified sender in the text,
      // and both arrive as a 401 or 400.
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        reason: `send-failed-${response.status}`,
        detail: detail.slice(0, 300) || undefined,
      };
    }

    return { ok: true };
  } catch {
    // Network error, timeout, or anything else the provider throws at us:
    // an honest failure to send, never a silent success.
    return { ok: false, reason: "send-error" };
  }
}
