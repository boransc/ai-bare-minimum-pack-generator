import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, clientKey } from "@/lib/api/rate-limit";
import { loadPack } from "@/lib/storage/packs";
import { isValidToken } from "@/lib/storage/token";
import { buildPolicyDocument, buildStaffNoteDocument } from "@/lib/export/word-document";

export const runtime = "nodejs";

// Closed enum: an unrecognised `doc` value is rejected rather than guessed at.
const downloadRequest = z.object({
  token: z.string(),
  doc: z.enum(["policy", "staff-note"]),
});

/**
 * ASCII-only, quote/slash/newline-free filename derived from the
 * organisation name. Anything outside that safe subset is dropped rather
 * than escaped — a `Content-Disposition` filename that carries a stray `"`
 * is a header-injection risk, and a stray `/` breaks the download in some
 * clients, so this is deliberately conservative rather than clever.
 */
function safeFilenameStem(orgName: string | null): string {
  if (!orgName) return "Organisation";
  const ascii = orgName.replace(/[^\x20-\x7e]/g, "");
  const safe = ascii.replace(/[^A-Za-z0-9 _-]/g, "").trim();
  const collapsed = safe.replace(/\s+/g, " ");
  return collapsed.length > 0 ? collapsed.slice(0, 80) : "Organisation";
}

export async function GET(request: Request) {
  const limit = await checkRateLimit(clientKey(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      { message: "That is a lot of downloads in a short time. Wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const url = new URL(request.url);
  const parsed = downloadRequest.safeParse({
    token: url.searchParams.get("token") ?? "",
    doc: url.searchParams.get("doc") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "That download link didn't look right." }, { status: 400 });
  }

  const { token, doc } = parsed.data;

  // Reject an implausible token before it ever reaches KV.
  if (!isValidToken(token)) {
    return NextResponse.json({ message: "No saved pack matches that link." }, { status: 404 });
  }

  const result = await loadPack(token);

  if (result.status === "not-found") {
    return NextResponse.json({ message: "No saved pack matches that link." }, { status: 404 });
  }

  if (result.status === "expired") {
    return NextResponse.json(
      { message: "This link has expired. Saved links last 90 days from creation." },
      { status: 410 },
    );
  }

  const { pack } = result;
  const input = { orgName: pack.orgName, fields: pack.documentFields ?? {} };

  const html = doc === "policy" ? buildPolicyDocument(input) : buildStaffNoteDocument(input);
  const docLabel = doc === "policy" ? "AI usage policy" : "Staff note";
  const filename = `${safeFilenameStem(pack.orgName)} - ${docLabel}.doc`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
