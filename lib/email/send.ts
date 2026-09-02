/**
 * Sending the return link by email.
 *
 * Deliberately provider-agnostic at the call site: `sendReturnLink` is the
 * only thing the rest of the app knows about. The default (and, for now,
 * only) adapter talks to Resend's plain REST API directly with `fetch` —
 * no SDK dependency for one endpoint.
 *
 * The message the request may contain: the personal link, and one line of
 * context. Nothing else. The score, the verdict and the gaps live behind
 * the link, never in the email that points at it — that is a product rule,
 * not an implementation detail, so do not add fields here "while we're at
 * it".
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 8000;

export type SendResult = { ok: true } | { ok: false; reason: string };

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
 * Send the return link to `to`. Never throws: a missing configuration or a
 * provider failure both come back as `{ ok: false, reason }` so the caller
 * can tell the visitor the truth instead of a 500.
 */
export async function sendReturnLink(to: string, url: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { ok: false, reason: "not-configured" };
  }

  const { text, html } = buildBody(url);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Your AI Bare Minimum Pack link",
        text,
        html,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { ok: false, reason: `send-failed-${response.status}` };
    }

    return { ok: true };
  } catch {
    // Network error, timeout, or anything else the provider throws at us:
    // treat it as an honest failure to send, never as a silent success.
    return { ok: false, reason: "send-error" };
  }
}
