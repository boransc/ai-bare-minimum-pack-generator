import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_MAX_AGE_SECONDS,
  ADMIN_COOKIE_NAME,
  adminCookieToken,
  adminPasscodeConfigured,
  verifyPasscode,
} from "@/lib/api/admin-auth";

export const runtime = "nodejs";

/** Only ever redirect to a same-origin admin path — never follow an arbitrary `next`. */
function safeNextPath(value: string | null): string {
  if (value && value.startsWith("/admin") && !value.startsWith("//")) return value;
  return "/admin";
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: "Malformed request." }, { status: 400 });
  }

  const passcode = form.get("passcode");
  const next = safeNextPath(typeof form.get("next") === "string" ? (form.get("next") as string) : null);

  if (!adminPasscodeConfigured()) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("reason", "unconfigured");
    return NextResponse.redirect(url, { status: 303 });
  }

  if (typeof passcode !== "string" || !verifyPasscode(passcode)) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("reason", "wrong");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  const token = adminCookieToken();
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  response.cookies.set(ADMIN_COOKIE_NAME, token!, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/admin",
    maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
