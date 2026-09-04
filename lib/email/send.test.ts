/**
 * What can be proved without an inbox.
 *
 * Delivery needs a mailbox and a human looking at it (see scripts/email-check).
 * Everything short of delivery is testable here by standing in for `fetch`:
 * that we call the right endpoint with the right headers, that the payload
 * matches the shape the provider documents, that selection behaves, and —
 * the one that actually matters — that the message carries the link and
 * nothing else about the organisation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emailProvider, emailSendingConfigured, sendReturnLink } from "./send";

const LINK = "https://example.test/pack/abc123token";

const ENV_KEYS = [
  "RESEND_API_KEY",
  "EMAIL_FROM",
  // Cleared too, or an SMTP test leaks its host into every later test and
  // silently changes which provider they select.
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.unstubAllGlobals();
});

/**
 * Captures the outgoing request instead of making one.
 *
 * `text()` is always provided: the sender reads the provider's error body to
 * report what actually went wrong, and a stub without it turns every non-ok
 * case into a misleading "send-error".
 */
function stubFetch(
  response: { ok?: boolean; status?: number; body?: string } = {},
) {
  const { ok = true, status = 201, body = "" } = response;
  const calls: Array<{ url: string; init: RequestInit }> = [];

  vi.stubGlobal("fetch", (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return Promise.resolve({
      ok,
      status,
      text: () => Promise.resolve(body),
      json: () => Promise.resolve(body ? JSON.parse(body) : {}),
    } as Response);
  });

  return calls;
}

describe("provider selection", () => {
  it("reports nothing configured when there are no credentials", () => {
    expect(emailProvider()).toBeNull();
    expect(emailSendingConfigured()).toBe(false);
  });

  it("needs a sender address, not just a key", () => {
    process.env.RESEND_API_KEY = "key";
    expect(emailSendingConfigured()).toBe(false);
  });

  it("falls back to Resend when only that is configured", () => {
    process.env.RESEND_API_KEY = "resend-key";
    process.env.EMAIL_FROM = "sender@example.test";
    expect(emailProvider()).toBe("resend");
  });

  it("uses SMTP when a host, user and password are all present", () => {
    process.env.SMTP_HOST = "smtp.example.test";
    process.env.SMTP_USER = "sender@example.test";
    process.env.SMTP_PASSWORD = "app-password";
    process.env.EMAIL_FROM = "sender@example.test";
    expect(emailProvider()).toBe("smtp");
  });

  it("ignores a half-configured SMTP block rather than failing every send", () => {
    // A host with no credentials is someone midway through setting this up.
    // Choosing "smtp" here would shadow a Resend key that works and then fail
    // on every attempt.
    process.env.SMTP_HOST = "smtp.example.test";
    process.env.RESEND_API_KEY = "resend-key";
    process.env.EMAIL_FROM = "sender@example.test";
    expect(emailProvider()).toBe("resend");
  });

  it("prefers SMTP over Resend", () => {
    // SMTP goes through a mailbox the organisation already owns, so it needs
    // no DNS change and waits in nobody's approval queue.
    process.env.SMTP_HOST = "smtp.example.test";
    process.env.SMTP_USER = "sender@example.test";
    process.env.SMTP_PASSWORD = "app-password";
    process.env.RESEND_API_KEY = "resend-key";
    process.env.EMAIL_FROM = "sender@example.test";
    expect(emailProvider()).toBe("smtp");
  });
});

describe("not configured", () => {
  it("reports honestly rather than throwing or pretending", async () => {
    const calls = stubFetch();
    const result = await sendReturnLink("someone@example.test", LINK);

    expect(result).toEqual({ ok: false, reason: "not-configured" });
    expect(calls, "must not call a provider it has no credentials for").toHaveLength(0);
  });
});

describe("the Resend request", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "resend-key";
    process.env.EMAIL_FROM = "sender@example.test";
  });

  it("uses a bearer token and Resend's own field names", async () => {
    const calls = stubFetch();

    await sendReturnLink("someone@example.test", LINK);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    expect(calls[0].init.method).toBe("POST");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(
      "Bearer resend-key",
    );

    const body = JSON.parse(calls[0].init.body as string);
    expect(body.from).toBe("sender@example.test");
    expect(body.to).toEqual(["someone@example.test"]);
    expect(body.subject).toBeTruthy();
    expect(body.text).toContain(LINK);
    expect(body.html).toContain(LINK);
  });

  it("carries the link and nothing else about the organisation", async () => {
    const calls = stubFetch();
    await sendReturnLink("someone@example.test", LINK);

    // The product rule: the score, the verdict and the gaps live behind the
    // link, never in the email pointing at it. This test exists so that adding
    // "just the score, it's useful" to the body fails loudly.
    const body = JSON.parse(calls[0].init.body as string);
    const message = `${body.subject} ${body.text} ${body.html}`.toLowerCase();

    for (const forbidden of [
      "out of 8",
      "/8",
      "not met",
      "minimum is",
      "red line",
      "score",
      "gap",
    ]) {
      expect(message, `the email leaked "${forbidden}"`).not.toContain(forbidden);
    }
  });

  it("escapes the link in the HTML body", async () => {
    const calls = stubFetch();
    await sendReturnLink("someone@example.test", "https://x.test/pack/a\"><script>alert(1)</script>");

    const body = JSON.parse(calls[0].init.body as string);
    expect(body.html).not.toContain("<script>");
  });

  it("treats a provider error as a failure to send, never a silent success", async () => {
    stubFetch({ ok: false, status: 401 });
    expect(await sendReturnLink("someone@example.test", LINK)).toEqual({
      ok: false,
      reason: "send-failed-401",
      detail: undefined,
    });
  });

  it("carries the provider's own words, so a 401 can be diagnosed", async () => {
    // A bare status sends you looking at the key, which may be fine. The
    // response body is where the actual cause is named.
    stubFetch({
      ok: false,
      status: 401,
      body: JSON.stringify({ message: "API key is invalid", name: "validation_error" }),
    });

    const result = await sendReturnLink("someone@example.test", LINK);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.detail).toContain("API key is invalid");
    }
  });

  it("survives a network error", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("socket hang up")));
    expect(await sendReturnLink("someone@example.test", LINK)).toEqual({
      ok: false,
      reason: "send-error",
    });
  });
});
