"use client";

import { useEffect, useState } from "react";
import type { GeneratedPack } from "@/lib/domain/pack";
import type { TailoringResult } from "@/lib/domain/types";

export type TailoringStatus = "loading" | "ready" | "unavailable";

interface TailoringState {
  tailoring: TailoringResult | null;
  status: TailoringStatus;
}

/**
 * In-flight and completed requests, shared across mounts.
 *
 * This exists because the obvious pair of safeguards destroy each other. A
 * "have I already asked?" ref stops StrictMode's double mount from firing two
 * billable requests; an AbortController stops a reply arriving after unmount.
 * Together, in development: the first effect starts the request and sets the
 * ref, the cleanup aborts that request, and the second effect sees the ref and
 * declines to ask again. The page then waits for a reply that will never come.
 *
 * Sharing the promise fixes it properly. A second mount joins the request
 * already running rather than starting or cancelling one, and the request is
 * never aborted — only its result is ignored if the component has gone. That
 * also dedupes across a genuine remount, which the ref never did.
 */
const inFlight = new Map<string, Promise<TailoringResult | null>>();

function requestKey(pack: GeneratedPack): string {
  // createdAt is unique per pack and stable for its lifetime, which is exactly
  // the identity we want: same pack, same request.
  return `${pack.createdAt}:${pack.contentVersion}`;
}

function requestTailoring(pack: GeneratedPack): Promise<TailoringResult | null> {
  const key = requestKey(pack);

  const existing = inFlight.get(key);
  if (existing) return existing;

  const body = {
    orgName: pack.wizard.orgName,
    sector: pack.wizard.sector,
    size: pack.wizard.size,
    currentAiUse: pack.wizard.currentAiUse,
    aiUseTypes: pack.wizard.aiUseTypes,
    sensitiveData: pack.wizard.sensitiveData,
    regulated: pack.wizard.regulated,
    consequentialDecisions: pack.wizard.consequentialDecisions,
    boardOwner: pack.wizard.boardOwner,
    answers: pack.answers,
  };

  const request = fetch("/api/tailor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((data: { tailoring: TailoringResult | null } | null) => data?.tailoring ?? null)
    .catch(() => null)
    .then((result) => {
      // Keep a success so a remount is free. Drop a failure so a later visit
      // can try again — a 429 or a dropped connection is worth retrying, and
      // the server-side cache means a repeat success costs nothing anyway.
      if (result === null) inFlight.delete(key);
      return result;
    });

  inFlight.set(key, request);
  return request;
}

/**
 * Fetches the tailored sentences after first paint.
 *
 * The pack is already complete and correct without them, so every failure —
 * a 429, a network drop, a non-ok response, a null result — settles quietly on
 * "unavailable" rather than shouting at someone. Nothing is actually broken.
 *
 * A saved pack may already carry its tailoring, in which case there is nothing
 * to fetch and no reason to pay for text we already have.
 */
export function useTailoring(pack: GeneratedPack): TailoringState {
  const [state, setState] = useState<TailoringState>(() =>
    pack.tailoring
      ? { tailoring: pack.tailoring, status: "ready" }
      : { tailoring: null, status: "loading" },
  );

  useEffect(() => {
    if (pack.tailoring) return;

    let live = true;

    requestTailoring(pack).then((tailoring) => {
      if (!live) return;
      setState(
        tailoring
          ? { tailoring, status: "ready" }
          : { tailoring: null, status: "unavailable" },
      );
    });

    return () => {
      live = false;
    };
    // The pack is fixed for the lifetime of this page; re-running on a new
    // object identity would only re-ask for the same answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey(pack)]);

  return state;
}
