"use client";

import { useId, useState } from "react";

interface SavePackProps {
  /**
   * Whether mail can actually be delivered. When false the form still takes an
   * address, but it never offers to send: promising a delivery and then
   * admitting we cannot make it is worse than not offering at all.
   */
  canSend?: boolean;
  token: string;
}

type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "not-configured" }
  | { kind: "error"; message: string };

/**
 * The "save your pack" block on the result page.
 *
 * Email is entirely optional and unlocks nothing — the link above works on
 * its own. The form only ever sends the link itself: never the score, the
 * verdict, or the gaps, because this is a record of an organisation's own
 * honest self-assessed failures and email is not the place for that.
 */
export function SavePack({ token, canSend = false }: SavePackProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [email, setEmail] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [sendState, setSendState] = useState<SendState>({ kind: "idle" });

  const emailFieldId = useId();
  const marketingFieldId = useId();

  const returnUrl =
    typeof window !== "undefined" ? `${window.location.origin}/pack/${token}` : `/pack/${token}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(returnUrl);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("error");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendState.kind === "sending") return;

    setSendState({ kind: "sending" });

    try {
      const response = await fetch("/api/email-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, marketingOptIn }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setSendState({
          kind: "error",
          message:
            (body && typeof body.message === "string" && body.message) ||
            "We couldn't send that just now. Please try again shortly.",
        });
        return;
      }

      const body = (await response.json()) as { sent: boolean; reason?: string };

      if (!body.sent && body.reason === "not-configured") {
        setSendState({ kind: "not-configured" });
        return;
      }

      setSendState({ kind: "sent" });
    } catch {
      setSendState({
        kind: "error",
        message: "We couldn't reach the server. Check your connection and try again.",
      });
    }
  }

  const sending = sendState.kind === "sending";

  return (
    <section className="save-pack no-print">
      <p className="kicker">Save and return</p>
      <h2 className="h3">Keep this link.</h2>
      <p className="save-pack-copy">
        This link is how you come back to your pack. It works for 90 days, and
        anyone holding it can open the pack, so keep it somewhere private.
        Saved packs are deleted after 12 months.
      </p>

      <div className="save-pack-link-row">
        <input
          className="save-pack-link"
          type="text"
          readOnly
          value={returnUrl}
          aria-label="Your personal pack link"
          onFocus={(event) => event.currentTarget.select()}
        />
        <button type="button" className="button quiet small" onClick={handleCopy}>
          {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy"}
        </button>
      </div>

      <form className="save-pack-form" onSubmit={handleSubmit}>
        <p className="save-pack-copy save-pack-email-intro">
          {canSend ? (
            <>
              Prefer it by email? We&rsquo;ll only ever send you this link —
              never your score, your answers, or anything else from the pack.
            </>
          ) : (
            <>
              You can also leave your address for Governance AI. We are not set
              up to email the link automatically yet, so copy it above to be
              sure of getting back to your pack.
            </>
          )}
        </p>

        <div className="save-pack-field">
          <label className="field-label" htmlFor={emailFieldId}>
            Email address (optional)
          </label>
          <input
            id={emailFieldId}
            className="text-input save-pack-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            disabled={sending}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="save-pack-checkbox-row">
          <input
            id={marketingFieldId}
            type="checkbox"
            checked={marketingOptIn}
            disabled={sending}
            onChange={(event) => setMarketingOptIn(event.target.checked)}
          />
          <label htmlFor={marketingFieldId}>
            Also send me occasional emails about AI governance from Governance
            AI.
          </label>
        </div>

        <p className="save-pack-copy save-pack-honesty">
          Governance AI can see when a pack is completed and the answers and
          score behind it — that is how we find sales leads. Your email
          address, if you give it, is stored{" "}
          {canSend ? "to send you this link" : "so Governance AI can reach you"}{" "}
          and is used for marketing only if you tick the box above.
        </p>

        <div className="save-pack-actions">
          <button type="submit" className="button primary small" disabled={sending}>
            {sending
              ? canSend
                ? "Sending…"
                : "Saving…"
              : canSend
                ? "Email me my link"
                : "Leave my address"}
          </button>
        </div>

        <p className="save-pack-status" role="status" aria-live="polite">
          {sendState.kind === "sent" &&
            "Sent. Check your inbox for the link, and your spam folder just in case."}
          {sendState.kind === "not-configured" &&
            "Thank you — your address is saved. Copy the link above to get back to your pack."}
          {sendState.kind === "error" && (
            <span className="field-error">{sendState.message}</span>
          )}
        </p>
      </form>
    </section>
  );
}
