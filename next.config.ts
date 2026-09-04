import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * Enforcing, not report-only, because it was tested against the running app
 * rather than guessed at — and a report-only policy nobody reads is a comment,
 * not a control.
 *
 * Two things make a strict policy easy here that usually make it hard:
 * next/font downloads Google's fonts at build time and serves them from
 * /_next/static, so no external font or stylesheet origin is needed; and every
 * outbound call to Cloudflare happens server-side, so the browser never needs
 * to reach a third-party API.
 *
 * `'unsafe-inline'` on scripts is Next's inline bootstrap, and on styles is the
 * inline style attributes React renders. Removing either needs per-request
 * nonces, which is a real change rather than a tightening — worth doing before
 * this carries anything more sensitive than it does today.
 *
 * `'unsafe-eval'` is development only: Turbopack's hot reload needs it, and
 * shipping it to production would undo much of the point.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  // Same-origin only: the wizard, tailoring and checklist endpoints are ours.
  // In development this also has to allow the dev server's HMR socket.
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Superseded by frame-ancestors above, kept for browsers that only read this.
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  /**
   * The pack token lives in the URL path, so it must never travel in a Referer
   * header to another origin. strict-origin-when-cross-origin sends only the
   * origin off-site, which keeps the path — and therefore the token — in.
   */
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        /**
         * Belt and braces on the one route where the URL itself is the
         * credential: send no Referer at all, so the token cannot leak even to
         * a same-origin destination that might log it.
         */
        source: "/pack/:token*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
