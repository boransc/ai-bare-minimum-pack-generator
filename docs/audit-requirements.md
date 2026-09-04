# Requirements conformance audit

Does the product actually do what the brief asked for?

Every row below was checked against the code, not from memory. Where a claim
could be measured it was measured. Where it could not be verified from this
machine, it says so rather than guessing.

**A note on how this report came to exist.** The first attempt at it was
delegated and came back as a confident table with an "Evidence" column, having
made a single tool call — the one that wrote the file. It had read nothing. Two
of its headline findings were simply wrong: it said the tailoring check was
missing from the README (it is at README line 154, with the result and the
injection example) and that only two wizard questions affect the output (all
eight reach the tailoring prompt; six also produce checklist items). That report
was deleted rather than committed. This one was done by hand.

Status vocabulary: **DONE** / **PARTIAL** / **NOT DONE** / **CANNOT VERIFY**.

---

## What you're building

| Requirement | Status | Evidence |
|---|---|---|
| Wizard, 5–8 questions about the organisation | DONE | `content/v1/wizard.ts` — 8 questions, all fixed-option. Organisation name is a separate optional field, not one of the eight. |
| Tailoring adapts the pack; never authors policy | DONE | `lib/tailoring/` — four layers. Verified against attack input: `npm run tailoring-check`, 21/21 slots accepted, injection in the org-name field produced no FCA and no EU AI Act. |
| Result page: pack presented well | DONE | `components/pack-result.tsx`, `/pack/[token]`. |
| …with a downloadable print-quality version | PARTIAL | Print stylesheets in `app/pack.css` and `app/pack-documents.css`; the user gets a PDF via the browser's print dialogue. There is no generated file download. See Gaps. |
| …and an interactive checklist to tick off over time | DONE | `components/pack-result.tsx` `Checklist`, `POST /api/checklist`, persisted per token. |
| Personal link: unguessable URL, random token, state in KV, no login | DONE | `lib/storage/token.ts` (128-bit, base64url), `lib/storage/packs.ts`, `/pack/[token]`. Verified by reload. |
| Two tiers: bare minimum for everyone, path to the full playbook | DONE | `components/pack-result.tsx` playbook section, built from the source's own "what the bare minimum does not give you", with three triggers from `lib/domain/pack.ts`. |
| Public marketing surface: design and copy matter as much as engineering | DONE | Two design passes, the second removing the AI-generated tells. Three commits. |

---

## Core

| Requirement | Status | Evidence |
|---|---|---|
| Wizard works end to end onto a branded page | DONE | Verified in-browser repeatedly, including the 7/8-with-red-line case. |
| Generation endpoint rate limited | DONE | `lib/api/rate-limit.ts` — `MAX_PER_MINUTE = 20`, `MAX_PER_HOUR = 60`, per IP, KV-backed. Applied in `/api/packs`, `/api/tailor`, `/api/checklist`, `/api/document-fields`, `/api/email-link`. |
| Deployed on Vercel | CANNOT VERIFY | Confirmed by the operator that the environment variables are set. The deployment was not reachable from this machine, so neither its currency nor its behaviour was checked. See Gaps. |

---

## Complete

| Requirement | Status | Evidence |
|---|---|---|
| Personal link, state in KV, returnable | DONE | As above. |
| Interactive checklist, progress persists | DONE | `POST /api/checklist`; verified by ticking and reloading. |
| Downloadable print-quality version | PARTIAL | See above and Gaps. |
| Two-tier structure | DONE | As above. |
| Polish worthy of a marketing site | DONE | Contrast measured to 4.5:1 across all pages, touch targets ≥44px, zero horizontal overflow at 375/768/1280. |

---

## Excellence

| Requirement | Status | Evidence |
|---|---|---|
| Admin page behind a passcode, listing every pack with its wizard answers | DONE | `/admin`, gated by `proxy.ts`; all eight answers now stored (`lib/storage/packs.ts` `LeadSummary`) and shown via an expandable row. |
| Tailoring check, ≥5 sections, results in the README | DONE | `npm run tailoring-check` → `docs/tailoring-check.md`; 5 organisations × 3 slots = 15 comparisons, 2 adversarial. Summarised in README §"The tailoring check" with the result and the injection example. |
| Optional email capture with one honest sentence | DONE | `components/save-pack.tsx`, `POST /api/email-link`. Separate unticked marketing box. |
| Regenerate button per section | **NOT DONE** | No endpoint and no UI. `regeneratedFrom` exists on the record in `lib/domain/pack.ts` and nothing uses it. |

---

## Standards

| Requirement | Status | Evidence |
|---|---|---|
| Install and use Impeccable | DONE | `.claude/skills/impeccable/` present; `context.mjs`, `polish.md` and `craft-floor.md` loaded and followed; three design commits, the second a net −57 lines removing the banned patterns. |
| Every AI endpoint rate limited, ~20/min | DONE | Exactly 20/minute and 60/hour, per IP. |
| In-memory fallback trade-off explained in README | DONE | README states it is per-instance rather than global on a multi-instance deployment. |
| Clear message on limit, not a crash | DONE | 429 with `Retry-After` and human wording in every rate-limited route. |
| Loading state for every AI call | DONE | `components/tailored-block.tsx` placeholder; the pack renders complete before the model is called at all. |
| Empty state for every list and page | DONE | Not-found and expired pack states, admin empty state, checklist empty state. |
| Human-readable errors, no stack traces | DONE | Checked across all six API routes. |
| Works on a phone | PARTIAL | Verified at 375px in an emulated viewport: zero overflow, targets ≥44px. Not verified on a physical handset. |
| AI Gateway header on every Workers AI call | DONE | `cf-aig-gateway-id` present in `lib/cloudflare/config.ts` and applied in the single `ai/run` call site in `lib/cloudflare/workers-ai.ts`; the probe script carries it too. |
| Model `@cf/openai/gpt-oss-120b` | DONE | `lib/cloudflare/config.ts:18`. |
| Real use of KV | DONE | Packs, checklist state, document fields, email consent, tailoring cache (30-day), rate-limit counters, lead index. |

---

## The supplied starter prompt

| Item | Status | Note |
|---|---|---|
| Next.js App Router, TypeScript, Vercel | DONE | |
| Wizard 5–8 questions | DONE | |
| `POST /api/tailor` that never invents policy | DONE | |
| `/pack/[token]` with print view | DONE | |
| Checklist saved to KV by token, `POST /api/checklist` | DONE | |
| Use Vectorize index `w2-boran` | **DIVERGED** | Not used. See below. |
| Passcode middleware protecting every page and API route | **DIVERGED** | Only `/admin` is gated. See below. |
| Skeleton first, model calls last | PARTIAL | The principle was followed — the deterministic pack was built and tested with no model call, and still works with `TAILORING_ENABLED=false`. The literal sequencing was not: real transcribed content was used from the start rather than stub text. |

---

## Watch out for

| Warning | Heeded? | Evidence |
|---|---|---|
| The model rewriting policy | DONE, partially by different means | The brief suggested tight *per-section* prompts. This uses one prompt with per-slot source excerpts from a static map, plus deterministic boundary checks and per-slot fallback. The side-by-side check the brief also asked for exists and passes. |
| Get the pack out of Word into structured text; don't build a parser | DONE | `content/v1/` is hand-structured TypeScript. The only extraction is a 30-line script used for auditing, never at runtime. |
| KV is not transactional; one JSON blob per token | DONE | One `StoredPack` per token; every write is read-modify-write of that single blob. |
| Five to eight questions, and every one must change the output | PARTIAL | See Gaps — two of the eight change nothing a visitor sees when tailoring is off. |

---

## Deliverables

| Item | Status |
|---|---|
| One-page spec | DONE — `docs/spec/one-page-spec.md` |
| README | DONE |
| Handover doc | DONE — `docs/handover.md` |
| Presentation | DONE (outline) — `docs/presentation-outline.md` |
| Batched client questions | DONE — `docs/client-questions.md` |
| Change requests pitched | DONE — `docs/change-requests.md`, five, one recommended for parking |
| Deployed link | CANNOT VERIFY |

---

## Gaps

Ordered by what they would cost.

1. **Regenerate button per section — NOT DONE.** The only Excellence item with
   nothing behind it.

2. **Two wizard questions fail the brief's own test when tailoring is off.**
   The brief says "every question must change the output; if it doesn't, cut
   it". Traced properly: all eight reach the tailoring prompt, and six produce
   a "find out" checklist item when answered *don't know*
   (`FIND_OUT_ACTIONS`). But **`sector` and `size` have no find-out action and
   appear nowhere in the rendered pack** — they exist only in the tailoring
   prompt and the admin lead list. So with `TAILORING_ENABLED=false` — the
   fallback that this architecture treats as the default path — a visitor's
   sector and size change nothing they can see. Defensible, because they are
   genuinely useful lead data and they do shape the prose when tailoring is on,
   but it is a real weakness against the brief's wording and should be a
   deliberate answer rather than an accident.

3. **"Downloadable print-quality version" is a print stylesheet, not a
   download.** The user gets a PDF through the browser's print dialogue. That
   is arguably within the words but not within their spirit; a one-click file
   would be. Related: change request CR-2 proposes editable Word versions of
   Parts 3 and 4, which their own instructions arguably require more than a PDF
   does.

4. **The deployed Vercel instance is unverified.** Environment variables are
   confirmed set, but neither the deployment's currency nor its behaviour was
   checked from here. A great deal landed today.

5. **Phone testing is emulated, not physical.** Measurements are real;
   a handset is not.

---

## Where the implementation deliberately diverges

Both are starter-prompt items, and both are overridden by the brief's own
Setup section rather than by preference.

**Vectorize is not used.** The starter prompt says to use index `w2-boran` for
retrieval over the source pack. The same brief's Setup section says "You
probably don't need embeddings for this project at all", and introduces the
prompt as "a starting point, not the answer". The source is one small fixed
document with known sections, so slot-to-source is a hand-authored map in
`lib/tailoring/source-map.ts`; retrieval would add a failure mode — fetching
the wrong section — for no gain. Recorded in the README under Decisions.

**The passcode protects only `/admin`.** The starter prompt says to protect
every page and API route. The Setup section overrides this explicitly:
"Rate limiting instead of a passcode: your visitor-facing pages must stay
public (that's the product)... The admin page does get a passcode." The
implementation matches the override — `proxy.ts` matches `/admin` and
`/admin/:path*` only — and the rate limiting the override asks for instead is
in place on every endpoint.
