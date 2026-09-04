# Security audit — AI bare-minimum pack generator

Date: 2026-09-04
Scope: public marketing product at `app/`, `lib/`, `components/`, `proxy.ts`, `next.config.ts`. Code review plus live testing against the local dev server (`http://localhost:3000`) with token `EqlIi-60xwlkyrSXtqnmgg`.

Findings are ordered by severity. Each carries what was **proved** (tested or read directly) versus **suspected** (plausible but not exercised).

---

## Findings

### Low — No security response headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS)

**File:** `next.config.ts` (empty config, no `headers()` function); confirmed absent on every route.

**Evidence (proved):**
```
curl -s -D - -o /dev/null http://localhost:3000/ | grep -iE "content-security|x-frame|x-content-type|referrer-policy|strict-transport"
```
returns nothing. The only non-default header present is `X-Powered-By: Next.js`.

**Impact:** No defence-in-depth against clickjacking (`/pack/[token]` could be framed) or against any future XSS regression (no CSP to contain it). Framework fingerprinting via `X-Powered-By` is a minor information leak. This matters more than usual here because Part 3/4 now render ~25 fields of visitor-supplied free text (see next finding) — a CSP would be a second line of defence if the escaping in `components/bracketed-text.tsx` ever regressed.

**Fix:** Add a `headers()` block in `next.config.ts` (or a small `proxy.ts` addition) setting `Content-Security-Policy` (at minimum `default-src 'self'`, `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Strict-Transport-Security` in production. Remove `X-Powered-By` via `poweredByHeader: false`.

---

### Low — Tailoring cache is keyed on free-text `orgName`, undermining the cost control it exists for

**File:** `lib/tailoring/cache-key.ts` (`tailoringCacheKey`, includes `wizard: input.wizard`), `lib/tailoring/index.ts` (`tailorUnsafe`).

**Evidence (read):** `CacheKeyInput.wizard` is the full `WizardAnswers` object, which includes `orgName` — the one free-text field in the product. `tailoringCacheKey` canonicalises and hashes it as-is, so two requests that are identical except for organisation name get different cache keys and each pays for a fresh Workers AI call.

**Impact:** The KV cache (30-day TTL, comment: "an identical wizard/assessment pairing never pays for generation twice") is the second layer of cost control after rate limiting. Varying `orgName` per request — trivial for a visitor to do, e.g. incrementing a counter — defeats it entirely; every request becomes a guaranteed cache miss and a real model call, up to the rate limit (20/minute, 60/hour per IP; §7 also notes this is per-IP and only per-instance in the in-memory fallback). Combined with IP rotation this is a real, if bounded, way to run up Workers AI spend that the cache was specifically supposed to prevent.

**Fix:** Exclude `orgName` from the cache key (tailoring output for the same sector/size/controls context is not meant to vary in structure by name — it's substituted separately in `organisationNameBlock`), or hash a normalised/truncated form of it separately from the rest of the context. This restores the cache's ability to absorb repeated identical assessments regardless of the name typed.

---

### Informational — Lead index (`idx:leads:<date>`) grows unbounded through a single JSON array per day

**File:** `lib/storage/packs.ts`, `appendLeadIndex`.

**Evidence (read):** Every successful `POST /api/packs` appends one row to a single KV value keyed by day (`existing.push(...)`, no cap), regardless of whether the pack itself is ever revisited. `saveDocumentField`/other writes are correctly capped (200 chars, closed enum), but this index has no per-day row limit.

**Impact:** Under the current rate limits (max 1,440/day per IP just from the minute cap, more from many IPs) a very high-traffic or abusive day could grow one KV value large enough to approach Cloudflare KV's 25 MiB value ceiling, at which point every write for that day starts failing — caught by the `try/catch` and logged, so it degrades gracefully (no user-facing failure), but the admin lead list silently loses rows for the rest of that day. Not exploitable for anything beyond what the rate limiter already permits; noted because the failure mode is silent.

**Fix:** Optional — cap rows per day (e.g. stop appending past a few thousand and log once) or shard the index key hourly instead of daily if usage ever approaches that scale. Not urgent at current traffic.

---

## What I checked and found sound

- **AI spend / DoS on `/api/tailor` and `/api/packs` (threat #1).** Both endpoints call `checkRateLimit` first (`lib/api/rate-limit.ts`): 20/min + 60/hour per client key, KV-backed with an in-memory fallback that degrades safely rather than failing open. `/api/tailor` re-derives the assessment server-side from the same closed schema rather than trusting a client-supplied verdict, so a hand-crafted POST cannot claim different unmet controls to steer what's asked about. Tailoring results are cached in KV keyed by a canonicalised hash of content version, model, wizard answers and unmet controls — sound in principle, weakened in practice by the `orgName` issue above. `runChat` enforces a 20s timeout and a bounded `max_tokens`. Input sizes are all bounded by Zod (`orgName` ≤ `ORG_NAME_FIELD.maxLength`, `answers` restricted to known ids, `document-fields` values capped at 200 chars).

- **Token entropy and handling (threat #2).** `lib/storage/token.ts`: 128 bits from `randomBytes`, base64url-encoded — not practically guessable or enumerable. `isValidToken` rejects malformed shapes before any KV lookup (no timing signal between "bad shape" and "not found" — both routes to a 404-equivalent without touching storage). Pack routes set `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow`, which is the right pairing against caching/search-engine leakage of a token URL. Tested: `GET /pack/short` (invalid shape) renders the same "we can't find that pack" content as a real not-found case, HTTP 200 by design (soft page state, not a distinguishing signal). Did not find the token echoed into any outbound request, referrer-triggering third-party resource, or client-side analytics call — there is no analytics integration in the codebase at all.

- **Injection into the printed document (threat #3, the new surface).** No `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, or `eval(` anywhere in `app/`, `components/`, or `lib/` (checked by grep). Every bracketed field (`components/bracketed-text.tsx`) is rendered as a controlled `<input value=...>` and, for print, a plain `{value || null}` React text child — never interpolated into HTML, an attribute string, or a `style` block. **Proved live**: posting `<script>alert(1)</script>&"'` as a field value via `POST /api/document-fields` is accepted, stored verbatim, and re-rendered on `/pack/[token]` as the HTML-escaped `&lt;script&gt;alert(1)&lt;/script&gt;` — no raw `<script>` tag reaches the page. `fieldId` is a closed Zod enum (`ALL_BRACKET_FIELD_IDS`), so the endpoint cannot be used to write arbitrary keys into a stored pack (tested: `fieldId: "__proto__"` and an unrecognised field name are both rejected with 400 before reaching storage). Document field values are also confirmed (by code and by the explicit contract comments in `lib/storage/packs.ts` and `app/api/document-fields/route.ts`) to be excluded from the lead index and from the tailoring prompt.

- **Prompt injection (threat #4).** `lib/tailoring/prompt.ts` puts the organisation name inside a clearly delimited, explicitly-labelled untrusted block, strips newlines and truncates it before that point, and the system prompt gives the model a closed, explicit list of forbidden outputs (laws, regulators, obligation language, numbers, dates, real names). `lib/tailoring/validate.ts` (layer 2) enforces the same boundary deterministically after generation with a set of regex checks ported from an adversarial probe script — a policy failure here drops to fallback text rather than retrying. Document-field values (the newest free-text surface) never reach `buildTailoringMessages` at all — confirmed by reading the full call path from `app/api/tailor/route.ts` through `lib/tailoring/index.ts`.

- **Admin gate (threat #5).** `proxy.ts` matches only `/admin` and `/admin/:path*`, exempting `/admin/login`; every other admin path requires a valid cookie. An unconfigured `APP_PASSCODE` fails closed on both the gate (`proxy.ts` redirects to `/admin/login?reason=unconfigured`) and the login route (`app/api/admin/login/route.ts` refuses to issue a cookie) — tested live: `GET /admin` with no cookie redirects (307) to `/admin/login?next=%2Fadmin` rather than serving content. The cookie carries a SHA-256 digest of the passcode, not the passcode itself, so a leaked cookie doesn't hand over credentials reusable elsewhere. Passcode and cookie comparisons both use `timingSafeEqual` on fixed-length buffers, with the cookie's hex shape validated first so a malformed cookie can't crash the comparison or leak a length-based timing signal. Cookie flags are correct for a passcode gate: `httpOnly`, `secure`, `sameSite: "lax"`, `path: "/admin"`. The `next` redirect parameter is restricted to paths starting with `/admin` and rejects `//`-prefixed values, so it cannot be turned into an open redirect.

- **Secret handling (threat #6).** No API keys or secrets found in client-visible code, `next.config.ts` has no `env`/`publicRuntimeConfig` exposure, and every module that touches credentials (`lib/cloudflare/*.ts`, `lib/api/admin-auth.ts`, `lib/email/send.ts`) is marked `import "server-only"`. Error responses reviewed across all six route handlers never echo request internals, stack traces, or configuration values back to the client — e.g. `email-link` explicitly avoids echoing the submitted address, and KV/AI failures are logged server-side (`console.error`) but returned to the client as generic messages.

- **npm audit.** `package.json` lists five runtime dependencies (`next`, `react`, `react-dom`, `server-only`, `zod`) on current major versions. `npm audit` did not complete within the available time in this environment (network-restricted sandbox); given the minimal, current dependency set this is not treated as a live risk, but it should be re-run somewhere with registry access before shipping.

## Bottom line

No Critical or High findings. The highest-value new surface — free text rendered into a printed/shared document — is handled correctly: React's default escaping is intact everywhere, nothing bypasses it, and this was confirmed with a live `<script>` payload rather than just by reading the code. The two real findings are both Low: missing security headers (cheap to add, worth doing given the free-text surface) and a cache-key design that quietly defeats its own cost-saving purpose when organisation names vary. Neither is an active exploit against the current rate limits, but both are worth fixing.
