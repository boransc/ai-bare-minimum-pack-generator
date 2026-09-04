# Deployed production audit — ai-bare-minimum-pack-generator.vercel.app

Date: 2026-09-04. All checks below were run against the live Vercel deployment
(no source files were modified; the only writes were HTTP requests and this
file). One disposable pack was created through the real wizard flow with
`orgName` set to exactly `QA sweep (delete me)`, token
`c7ZEG9n4f4HA7AolLNS2NQ`. No other packs were created.

## Summary table

| Area | Result | Evidence |
|---|---|---|
| `GET /` | PASS | `200`, 0.53s |
| `GET /start` | PASS | `200`, 0.48s; renders wizard, no console errors |
| `GET /pack/<valid token>` | PASS | `200`; server-rendered HTML contains org name, score, tailored text, checklist, policy/staff-note with bracket fields |
| `GET /pack/<well-formed unknown token>` (`AAAAAAAAAAAAAAAAAAAAAA`) | PASS | `200` (not a 404/500), body: "We can't find that pack." — human copy, no stack trace, link back to `/start` |
| `GET /admin` | PASS | `307` redirect to `/admin/login?next=%2Fadmin`; login page shows a "Passcode" field, not the lead list. Passcode itself was not attempted, per constraints. |
| Wizard end-to-end browser flow (`/start` → 8 context questions → 8-point check → pack page) | PASS | Completed as a human would via the Browser pane: org name field, single-select buttons, one multi-select (question 4, min 1), progressive reveal of sub-statements 1.1 through 8.3, final "Score my standard" button navigated to `/pack/c7ZEG9n4f4HA7AolLNS2NQ?new=1`. No validation dead-ends, no lost state. |
| `POST /api/packs` — malformed JSON body | PASS | `400` `{"message":"Malformed request."}` |
| `POST /api/packs` — wrong field names (`{"foo":"bar"}`) | PASS | `400` with per-field zod issues listing every missing required key, plus `"Unrecognized key: \"foo\""` (schema is `.strict()`, confirmed) |
| `POST /api/packs` — valid | PASS | `200`, confirmed via the browser flow (real submission), token + pack JSON returned, `Cache-Control: no-store` |
| `POST /api/tailor` — unknown token | PASS | `404` `{"message":"We can't find that pack."}` |
| `POST /api/tailor` — wrong field name (`{"tok":"x"}`) | PASS | `400` `{"message":"That request did not look right."}` |
| `POST /api/tailor` — valid, already-tailored pack | PASS | `200`, 1.23s, returns stored `tailoring` object with `provenance` all `"model"` and `model: "@cf/openai/gpt-oss-120b"` — confirms tailoring is persisted and served from storage on a return call rather than re-generated |
| `POST /api/tailor/regenerate` — valid, `slot: riskScenario` | PASS | `200` three times in a row, 7.2–8.8s each, distinct generated text each time |
| `POST /api/tailor/regenerate` — valid, `slot: controlEmphasis, control: 1` | PASS | `200`, 14.0s |
| `POST /api/tailor/regenerate` — valid, `slot: openingContext` | DEGRADED | Alternated `200` (7.2s) and `502` (8.7s, then 20.9s) across 3 attempts on the same real, tailored pack. See Failures. |
| `POST /api/tailor/regenerate` — unknown token | PASS | `404` `{"message":"We can't find that pack."}` |
| `POST /api/tailor/regenerate` — malformed (`slot: controlEmphasis` with no `control`) | PASS | `400`, correctly enforced by the schema's `.refine()` |
| `POST /api/tailor/regenerate` — wrong field name | PASS | `400` |
| `POST /api/checklist` — malformed body | PASS | `400` |
| `POST /api/checklist` — wrong field names | PASS | `400` |
| `POST /api/checklist` — unknown token | PASS | `404` |
| `POST /api/checklist` — valid | PASS | `200`, returns updated `checklistState` + `checklistUpdatedAt` |
| `POST /api/document-fields` — malformed `fieldId` | PASS | `400` (fieldId not in `ALL_BRACKET_FIELD_IDS`) |
| `POST /api/document-fields` — unknown token, valid `fieldId` | PASS | `404` `{"message":"We can't find that pack."}` |
| `POST /api/document-fields` — valid | PASS | `200`, returns `fields` object with the write applied |
| `GET /api/download?doc=policy` — unknown token | PASS | `404` |
| `GET /api/download` — malformed `doc` value | PASS | `400` |
| `GET /api/download?doc=policy` — valid | PASS | `200`, 16,935-byte `.doc` (Word-compatible HTML), `Content-Disposition: attachment` |
| `POST /api/email-link` — malformed body (`{"tok":"x"}`) | PASS | `400` |
| `POST /api/email-link` — invalid email shape | PASS | `400` `{"message":"That doesn't look like a valid email address."}` |
| `POST /api/email-link` — unknown token, well-formed email | PASS | `404` `{"message":"No saved pack matches that link."}` — confirms token is checked, so this cannot be used to mail an arbitrary address (order-of-checks matches the source comment) |
| `POST /api/email-link` — real success send | NOT TESTED | Would require the operator's own address per constraints; skipped |
| Persistence across reload — checklist tick | PASS | Ticked item `4.1`/`policy-approved` via the API, then re-fetched `/pack/<token>` with a fresh `curl` (no cache): server HTML contained `checked` and the progress line changed to "1 of 9 complete" |
| Persistence across reload — document field | PASS | Set `aiLeadNameRole` to "QA Tester, AI Lead" via UI, then via API to "Jane Doe, AI Lead"; re-fetched server HTML contained the saved value in both the policy and staff-note text |
| Rate limiting | PASS | After cumulative testing traffic from this IP, `POST /api/checklist` returned `429` with `Retry-After: 2344` and header `Retry-After` present, body `{"message":"That is a lot of updates in a short time. Wait a moment and try again."}`. The large Retry-After value (≈39 min) indicates the hourly budget mentioned in the route comments, not only the 20/minute one, was exhausted by this session's own test traffic. |
| Security headers, general pages (`/`, `/start`, `/admin/login`) | PASS | `Content-Security-Policy` present with no `unsafe-eval` (`script-src 'self' 'unsafe-inline'` only); `Strict-Transport-Security: max-age=63072000; includeSubDomains`; `X-Frame-Options: DENY`; `Referrer-Policy: strict-origin-when-cross-origin` |
| Security headers, `/pack/:token` specifically | PASS | Same CSP/HSTS/X-Frame-Options, and `Referrer-Policy: no-referrer` (stricter than other pages, as the task expected) |
| Mobile viewport (375×812) — `/pack/<token>` | PASS/DEGRADED | No horizontal overflow (`scrollWidth === innerWidth === 375`). But the 9 checklist checkboxes measured `20px` tall — under the 44px touch-target minimum. |
| Mobile viewport (375×812) — `/start` wizard | PASS | No horizontal overflow (`scrollWidth === innerWidth === 375`) |
| Console errors, wizard + pack page | PASS | `read_console_messages` returned no logs at any point during the full wizard run or on the pack page |
| Network errors, wizard + pack page | DEGRADED (cosmetic) | One request, `GET /pack/<token>?new=1&_rsc=...`, showed `net::ERR_ABORTED`. This is the RSC prefetch for the page that was about to be navigated to and was superseded by the real navigation completing — the page rendered correctly and immediately after, so this reads as a benign cancelled-prefetch artifact rather than a functional error, but it is reported rather than silently dropped. |

## Failures and defects (most severe first)

1. **`/api/tailor/regenerate` for `slot: openingContext` is unreliable on a real, valid pack.**
   Three consecutive calls against the same live token (`c7ZEG9n4f4HA7AolLNS2NQ`,
   which does have stored tailoring) went 200 (7.2s) / 502 (8.7s) / 502 (20.9s).
   Repro:
   ```
   curl -s -w "%{http_code}" -X POST https://ai-bare-minimum-pack-generator.vercel.app/api/tailor/regenerate \
     -H "Content-Type: application/json" \
     -d '{"token":"c7ZEG9n4f4HA7AolLNS2NQ","slot":"openingContext"}'
   ```
   The failure mode itself is handled correctly (a clean `502` with a human
   message, and the previous text is left in place — no data loss), so this is
   a reliability/latency issue in the model call for that specific slot rather
   than a broken code path. The `riskScenario` and `controlEmphasis` slots on
   the same pack succeeded 100% of the time (3/3 and 1/1) in the same test run,
   which points at something specific to how the `openingContext` request is
   built or sized, not a general outage. Given the increasing latency on the
   failing calls (8.7s, then 20.9s) this looks timeout-shaped rather than a
   flat rejection.

2. **Checklist checkboxes are under the 44px touch-target minimum on mobile.**
   All 9 "things to close" checkboxes on `/pack/<token>` measured `20px` tall
   at 375×812. Not a functional break — they are still clickable — but they
   fail the stated touch-target bar and are the one interactive element a
   returning mobile visitor is expected to use repeatedly.

3. **Cosmetic: a cancelled RSC prefetch shows as `net::ERR_ABORTED` in the network log** for `GET /pack/<token>?new=1&_rsc=...` during the wizard-to-pack transition. The page rendered correctly immediately afterward and no user-visible symptom was observed; flagged because the task asked for network errors to be reported explicitly rather than filtered out.

No other defects were found. In particular: no 404s or 500s appeared on any
valid path, no stack traces or internal error detail leaked in any response
body, `.strict()` schemas correctly rejected every unrecognised field tried,
and every "unknown token" case across all five token-taking endpoints
returned a clean 404 (or, for `/api/tailor/regenerate`'s specific message,
"We can't find that pack.") rather than a crash — the exact failure mode that
prompted this audit (the regenerate-404-on-every-real-pack bug) was not
reproduced: regenerate worked against the one real token tested, for two of
its three slots with 100% reliability.

## Not tested, and why

- **`/api/email-link` success path (an email actually being sent).** Skipped
  per instructions — sending to a real address would require either the
  operator's own address or risk mailing a stranger. Only the failure/shape
  paths (malformed body, invalid email format, unknown token) were exercised.
- **Expired-pack behavior (`410` paths) on any endpoint.** All five endpoints'
  route code branches on `result.status === "expired"` with a distinct `410`
  message, but producing a genuinely 90-day-expired pack was not possible
  within this session (would require either a 90-day-old real pack or writing
  to the KV store directly, which was out of scope for a read-and-verify
  audit). This is inferred from the source, not observed against the deployed
  instance.
- **Admin passcode gate beyond confirming it exists.** Per constraints, no
  passcode was guessed or brute-forced. Only the redirect (`/admin` → `307` →
  `/admin/login`) and the presence of a passcode field were confirmed; the
  authenticated admin/lead-list view was never seen.
- **A second or third rate-limit boundary test.** The task said to do this
  last on one endpoint, and it engaged (`429`) almost immediately once run,
  because this session's own prior curl traffic across `/api/packs`,
  `/api/tailor`, `/api/tailor/regenerate` (×7), `/api/checklist`,
  `/api/document-fields`, `/api/download`, and `/api/email-link` had already
  spent most of the shared IP budget (rate limiting is bucketed by IP across
  all endpoints, per the source comments). The exact 20/minute boundary was
  not independently isolated as a result — what was observed is a `429` with
  a `Retry-After: 2344` (≈39 minutes), which is long enough to suggest the
  hourly budget, not just the per-minute one, was also exhausted by testing.
  No further requests were made to this deployment's IP-limited endpoints
  after this, per the task's own caution about locking out the budget.
- **Regenerate's other two failure-shape edges** — a `slot` value that isn't
  one of the three enum members, and `control` out of the 1–8 range — were
  not separately curled (time was spent instead on the openingContext
  reliability finding above, which seemed higher-value). The schema's
  `.enum()` and `.min(1).max(8)` bounds make these very likely to 400
  correctly by construction, but that is an inference from `lib/tailoring/schema.ts`, not a direct observation.

## Single highest-risk thing still unverified

**Expired-pack handling (`410`) on every endpoint has never been exercised
against a real expired pack on production.** All five routes have identical-looking `410` branches in source, but a wrong TTL calculation, an off-by-one
in the "90 days" window, or a KV TTL that doesn't match the application-level
expiry check would only show up against an actually-expired record — and
there was no way to produce one non-destructively in this session. Given
that the project's own stated motivation for this audit was a state
("`/api/tailor/regenerate` against a real pack") the test suite could
describe but not verify live, an unverified `410` path is the same shape of
risk again.
