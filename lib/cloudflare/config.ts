/**
 * Cloudflare configuration, read once from the environment.
 *
 * Server-only. None of these names are prefixed NEXT_PUBLIC_, so Next will not
 * bundle them for the browser; importing this file from a client component is
 * a build error, which is the behaviour we want.
 */

import "server-only";

export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  kvNamespaceId: string;
}

/** Model named in the brief. */
export const AI_MODEL = "@cf/openai/gpt-oss-120b";

/**
 * Every Workers AI request carries this so calls are logged and cached by the
 * AI Gateway. Identical request body and response either way; the header is
 * the whole integration.
 */
export const AI_GATEWAY_HEADER = { "cf-aig-gateway-id": "default" } as const;

export const CF_API_BASE = "https://api.cloudflare.com/client/v4";

let cached: CloudflareConfig | null = null;

/**
 * Throws if configuration is missing.
 *
 * Callers that can degrade — the tailoring layer, which falls back to source
 * text — should use `cloudflareConfigured()` and skip rather than let this
 * throw. Callers that genuinely cannot work without it, such as saving a pack,
 * should let it throw and surface a real error.
 */
export function cloudflareConfig(): CloudflareConfig {
  if (cached) return cached;

  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  const kvNamespaceId = process.env.CF_KV_NAMESPACE_ID;

  const missing = [
    !accountId && "CF_ACCOUNT_ID",
    !apiToken && "CF_API_TOKEN",
    !kvNamespaceId && "CF_KV_NAMESPACE_ID",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Cloudflare is not configured. Missing: ${missing.join(", ")}. ` +
        `Add them to .env.local locally, and to the Vercel project settings for deployments.`,
    );
  }

  cached = { accountId: accountId!, apiToken: apiToken!, kvNamespaceId: kvNamespaceId! };
  return cached;
}

export function cloudflareConfigured(): boolean {
  return Boolean(
    process.env.CF_ACCOUNT_ID &&
      process.env.CF_API_TOKEN &&
      process.env.CF_KV_NAMESPACE_ID,
  );
}

/**
 * Master switch back to deterministic-only output.
 *
 * Set TAILORING_ENABLED=false to render every pack from source content alone,
 * with no model call. The pack still renders; it is simply less personal. This
 * exists so a tailoring problem in production is one environment variable away
 * from being contained, without a deploy.
 */
export function tailoringEnabled(): boolean {
  return process.env.TAILORING_ENABLED !== "false" && cloudflareConfigured();
}

export function authHeaders(config: CloudflareConfig): Record<string, string> {
  return { Authorization: `Bearer ${config.apiToken}` };
}
