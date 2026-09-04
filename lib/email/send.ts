/**
 * Sending the return link by email.
 *
 * Provider-agnostic at the call site: `sendReturnLink` is the only thing the
 * rest of the app knows about. Three adapters, chosen by whichever credentials
 * are present.
 *
 * Why three, in the order they are preferred:
 *
 *   SMTP, through a mailbox the organisation already owns. This is the one
 *   that actually works here, and it is first for that reason. It needs no DNS
 *   change and no approval queue: the domain already receives mail, so its
 *   sender authentication already exists, and an authenticated submission from
 *   its own account inherits it. Google Workspace and similar accept an app
 *   password on port 465. Deliverability is whatever the organisation's own
 *   mail reputation is, which is the best available answer.
 *
 *   Brevo verifies a single sender *address*, so an ordinary mailbox works and
 *   nothing needs to be bought. In practice a new account is held behind a
 *   manual review — "Your SMTP account is not yet activated. Please contact us
 *   at contact@brevo.com" — with no published timeline, which is why it is no
 *   longer the primary path. Nothing in this repo can bypass that.
 *
 *   Resend requires a verified sending *domain* before it will deliver to
 *   arbitrary recipients, which needs DNS records on a domain you own. Its
 *   shared `onboarding@resend.dev` sender only ever delivers to the account
 *   owner's own address, so it is a demo, not a product.
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

export type EmailProvider = "smtp" | "brevo" | "resend" | null;

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
  // SMTP first: see the header. It is the only one of the three that can
  // deliver to an arbitrary visitor without either a DNS change or somebody
  // else's approval, so when it is configured it is the one we want.
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return "smtp";
  }
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
 * Submit through an ordinary authenticated mailbox.
 *
 * Returns a SendResult rather than a Response, unlike the two REST adapters:
 * there is no HTTP response to inspect, and nodemailer signals failure by
 * throwing. The shapes meet at `sendReturnLink`.
 *
 * nodemailer is imported dynamically so it stays out of any bundle that only
 * asks `emailSendingConfigured()` — the result page does that on every render
 * and has no need of an SMTP client to answer it.
 *
 * Port 465 with implicit TLS by default. Vercel blocks outbound port 25 but
 * leaves 465 and 587 open, and the send is fully awaited before the route
 * responds, which matters: work still in flight when a serverless function
 * returns is dropped, so an un-awaited send would appear to succeed and
 * silently deliver nothing.
 */
async function sendViaSmtp(
  from: string,
  to: string,
  body: { text: string; html: string },
): Promise<SendResult> {
  // Everything, the import included, sits inside the try: sendReturnLink
  // promises never to throw, and a missing or broken module is a failure to
  // send like any other -- not a 500 for the visitor.
  let transport: { sendMail: (m: object) => Promise<unknown>; close: () => void } | null = null;

  try {
    const { createTransport } = await import("nodemailer");
    const port = Number(process.env.SMTP_PORT ?? 465);

    transport = createTransport({
      host: process.env.SMTP_HOST!,
      port,
      // 465 is implicit TLS; 587 opens in plaintext and upgrades via STARTTLS.
      secure: port === 465,
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
      connectionTimeout: SEND_TIMEOUT_MS,
      greetingTimeout: SEND_TIMEOUT_MS,
      socketTimeout: SEND_TIMEOUT_MS,
    });

    await transport.sendMail({
      from,
      to,
      subject: SUBJECT,
      text: body.text,
      html: body.html,
    });
    return { ok: true };
  } catch (error) {
    // The provider's own words, for the logs and the check script only. A
    // rejected app password and a blocked port look nothing alike here and
    // everything alike from the outside.
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: "smtp-send-failed", detail: detail.slice(0, 300) };
  } finally {
    // Serverless reuses a warm container; a transport left open holds a socket
    // that outlives the request that made it.
    transport?.close();
  }
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

  // SMTP reports its own outcome; the REST adapters hand back a Response to
  // be interpreted below.
  if (provider === "smtp") {
    return sendViaSmtp(from, to, body);
  }

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
