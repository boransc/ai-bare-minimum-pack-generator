/**
 * Workers AI over the REST API, routed through the AI Gateway.
 *
 * POST /accounts/{account}/ai/run/{model}
 *   headers: Authorization: Bearer <token>, cf-aig-gateway-id: default
 *   body:    { messages, response_format?, max_tokens, temperature }
 *   returns: { result: { response }, success, errors, messages }
 *
 * The gateway header is the entire integration: same endpoint, same body, same
 * response, plus logging and caching on Cloudflare's side.
 *
 * This module knows nothing about the pack. It sends messages and returns
 * either parsed JSON or an error. Deciding what is safe to show a user is the
 * tailoring layer's job, not this one's.
 */

import "server-only";
import {
  AI_GATEWAY_HEADER,
  AI_MODEL,
  CF_API_BASE,
  authHeaders,
  cloudflareConfig,
} from "./config";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export type AiFailure =
  | { kind: "not-configured" }
  | { kind: "timeout"; ms: number }
  | { kind: "http"; status: number; detail: string }
  /** Reasoning spent the whole token budget and left no answer. Retryable with more headroom. */
  | { kind: "truncated" }
  | { kind: "malformed"; detail: string };

export type AiResult<T> =
  | { ok: true; value: T; raw: string; elapsedMs: number }
  | { ok: false; failure: AiFailure; elapsedMs: number };

export interface RunOptions {
  /**
   * JSON Schema for structured output. Sent as
   * `response_format: { type: "json_schema", json_schema: <schema> }`.
   *
   * Not every Workers AI model honours this, so callers must not assume the
   * reply is valid JSON just because a schema was supplied — `extractJson`
   * below is the safety net either way.
   */
  jsonSchema?: Record<string, unknown>;
  /**
   * gpt-oss-120b is a reasoning model: it emits a hidden `reasoning` stream
   * before `content`, and both come out of this budget. Set too low, it thinks
   * until it runs out and returns content: null with finish_reason "length".
   * Observed in probing at 900. The default below leaves real headroom.
   */
  maxTokens?: number;
  temperature?: number;
  /**
   * Hard budget. The result page waits on this call, so a hung model must
   * become a deterministic pack quickly rather than a spinning page.
   */
  timeoutMs?: number;
}

export async function runChat(
  messages: ChatMessage[],
  options: RunOptions = {},
): Promise<AiResult<string>> {
  const started = Date.now();

  let config;
  try {
    config = cloudflareConfig();
  } catch {
    return { ok: false, failure: { kind: "not-configured" }, elapsedMs: 0 };
  }

  const timeoutMs = options.timeoutMs ?? 20_000;

  const body: Record<string, unknown> = {
    messages,
    max_tokens: options.maxTokens ?? 2500,
    temperature: options.temperature ?? 0.3,
  };

  if (options.jsonSchema) {
    body.response_format = { type: "json_schema", json_schema: options.jsonSchema };
  }

  try {
    const response = await fetch(
      `${CF_API_BASE}/accounts/${config.accountId}/ai/run/${AI_MODEL}`,
      {
        method: "POST",
        headers: {
          ...authHeaders(config),
          ...AI_GATEWAY_HEADER,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );

    const elapsedMs = Date.now() - started;

    if (!response.ok) {
      const detail = await response.text().catch(() => "<no body>");
      return {
        ok: false,
        failure: { kind: "http", status: response.status, detail: detail.slice(0, 400) },
        elapsedMs,
      };
    }

    const payload = (await response.json()) as WorkersAiEnvelope;
    const text = readReply(payload);

    if (text === null) {
      // Distinguish "thought itself out of budget" from "envelope we don't know":
      // the first is worth one retry with more room, the second never is.
      const truncated = payload.result?.choices?.[0]?.finish_reason === "length";
      return {
        ok: false,
        failure: truncated
          ? { kind: "truncated" }
          : {
              kind: "malformed",
              detail: `Unexpected envelope: ${JSON.stringify(payload).slice(0, 300)}`,
            },
        elapsedMs,
      };
    }

    return { ok: true, value: text, raw: text, elapsedMs };
  } catch (error) {
    const elapsedMs = Date.now() - started;
    const isTimeout =
      error instanceof DOMException && error.name === "TimeoutError";
    return {
      ok: false,
      failure: isTimeout
        ? { kind: "timeout", ms: timeoutMs }
        : { kind: "malformed", detail: String(error).slice(0, 300) },
      elapsedMs,
    };
  }
}

/**
 * Pull a JSON object out of a model reply.
 *
 * Even with a schema supplied, replies arrive wrapped in prose or fenced code
 * often enough that parsing the whole string is not safe. We take the outermost
 * braced span and parse that.
 */
export function extractJson(text: string): { ok: true; value: unknown } | { ok: false; reason: string } {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return { ok: false, reason: "no JSON object in reply" };
  }

  try {
    return { ok: true, value: JSON.parse(candidate.slice(start, end + 1)) };
  } catch (error) {
    return { ok: false, reason: `JSON parse failed: ${String(error).slice(0, 120)}` };
  }
}

/**
 * Workers AI does not have a single reply envelope, and the difference is not
 * cosmetic: reading the wrong field makes a perfectly good model look like a
 * transport failure.
 *
 *   @cf/openai/gpt-oss-120b  ->  result.choices[0].message.content  (OpenAI style)
 *   Llama-family models      ->  result.response
 *
 * Read every known shape rather than assuming the model in AI_MODEL keeps its
 * current one.
 */
interface WorkersAiEnvelope {
  result?: {
    response?: unknown;
    output_text?: unknown;
    choices?: Array<{
      finish_reason?: string;
      message?: { content?: unknown; reasoning?: unknown };
    }>;
  };
  success?: boolean;
  errors?: unknown[];
}

function readReply(payload: WorkersAiEnvelope): string | null {
  const result = payload.result;
  if (typeof result?.response === "string") return result.response;
  if (typeof result?.output_text === "string") return result.output_text;
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  return null;
}

export function describeFailure(failure: AiFailure): string {
  switch (failure.kind) {
    case "not-configured":
      return "Cloudflare credentials are not configured";
    case "timeout":
      return `model did not respond within ${failure.ms}ms`;
    case "http":
      return `HTTP ${failure.status}: ${failure.detail}`;
    case "truncated":
      return "model used its whole token budget on reasoning and returned no answer";
    case "malformed":
      return failure.detail;
  }
}
