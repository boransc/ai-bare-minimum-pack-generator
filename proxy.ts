/**
 * Passcode gate for /admin. Named `proxy.ts` per the Next.js 16 file
 * convention (the renamed `middleware.ts`); it runs on the Node.js runtime by
 * default, which is what lets it use `node:crypto` below.
 *
 * The matcher only touches /admin — the visitor-facing wizard, the pack API,
 * and every pack page stay untouched by this file. Within /admin, the login
 * page and its submit endpoint are exempted so there is a way in at all; the
 * lead list at /admin (and anything else under /admin) requires the cookie.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, adminPasscodeConfigured, isValidAdminCookie } from "@/lib/api/admin-auth";

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Unset passcode must refuse everything, not fall open just because there
  // is nothing to compare against.
  if (!adminPasscodeConfigured()) {
    return NextResponse.redirect(new URL("/admin/login?reason=unconfigured", request.url));
  }

  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidAdminCookie(cookie)) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
