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
| …with a downloadable print-quality version | DONE | Print stylesheets in `app/pack.css` and `app/pack-documents.css` give a print-quality PDF through the browser's print dialogue. Additionally `GET /api/download` serves Parts 3 and 4 as editable Word documents carrying the organisation's saved field values. |
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
| Downloadable print-quality version | DONE | See above. |
| Two-tier structure | DONE | As above. |
| Polish worthy of a marketing site | DONE | Contrast measured to 4.5:1 across all pages, touch targets ≥44px, zero horizontal overflow at 375/768/1280. |

---

## Excellence

| Requirement | Status | Evidence |
|---|---|---|
| Admin page behind a passcode, listing every pack with its wizard answers | DONE | `/admin`, gated by `proxy.ts`; all eight answers now stored (`lib/storage/packs.ts` `LeadSummary`) and shown via an expandable row. |
| Tailoring check, ≥5 sections, results in the README | DONE | `npm run tailoring-check` → `docs/tailoring-check.md`; 5 organisations × 3 slots = 15 comparisons, 2 adversarial. Summarised in README §"The tailoring check" with the result and the injection example. |
| Optional email capture with one honest sentence | DONE | `components/save-pack.tsx`, `POST /api/email-link`. Separate unticked marketing box. |
| Regenerate button per section | DONE | `POST /api/tailor/regenerate` plus `RegenerateControl` in `components/tailored-block.tsx`, shown per tailored passage when the slot's provenance is `model`. Takes only `{token, slot, control?}` — the wizard and assessment come from storage, never the body. Runs the same `validateSlotText` boundary check as first generation, and deliberately neither reads nor writes the shared tailoring cache. 21 tests in `lib/tailoring/regenerate.test.ts`. |

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
| Five to eight questions, and every one must change the output | DONE | All eight reach the tailoring prompt; six produce a "find out" item when answered *don't know*; and all eight are now shown on the pack itself via `components/declared-context.tsx`, so `sector` and `size` change the output even with tailoring off. |

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

Ordered by what they would cost. Items 1 to 3 of the original five have since
been fixed; what they were, and what closing them changed, is recorded below so
this report stays readable as a before-and-after rather than being quietly
rewritten into a clean sheet.

### Fixed

1. **Regenerate button per section — was NOT DONE, now DONE.** It was the only
   Excellence item with nothing behind it. See the Excellence table.

2. **Two wizard questions failed the brief's own test when tailoring was off —
   now fixed.** The brief says "every question must change the output; if it
   doesn't, cut it". All eight reached the tailoring prompt and six produced a
   "find out" item, but `sector` and `size` had no find-out action and appeared
   nowhere in the rendered pack, so with `TAILORING_ENABLED=false` — the
   fallback this architecture treats as the default path — they changed nothing
   a visitor could see. Cutting them would have been wrong, because they do
   shape the tailored prose. Instead the pack now states the context it was
   assessed against, which is defensible on its own terms: a dated record that
   does not record its own inputs is a weaker record, and a reader six months
   later can see whether anything has changed enough to warrant re-taking it.

3. **"Downloadable print-quality version" — reassessed, and the more useful
   thing built instead.** The original finding called this PARTIAL because the
   PDF comes from the browser's print dialogue rather than a generated file.
   On review that was too harsh: a print stylesheet plus a print dialogue *is*
   a downloadable print-quality version, and adding a button that opens the
   same dialogue would have satisfied the letter of the audit while changing
   nothing for a user. The real deficiency was adjacent — Parts 3 and 4 are
   documents whose own instructions are "fill in the bracketed fields, approve
   it, issue it", which a PDF cannot support. `GET /api/download` now serves
   both as editable Word documents with the organisation's saved values
   substituted and unfilled brackets left visible to complete. This was CR-2,
   promoted from proposal to delivered.

### Open

4. **The deployed Vercel instance is unverified.** Environment variables are
   confirmed set, but neither the deployment's currency nor its behaviour was
   checked from here. A great deal has landed since; this needs a deployed URL
   and a pass over it.

5. **Phone testing is emulated, not physical.** Measurements are real — at
   375px the declared-context list collapses to one column, there is no
   horizontal overflow, and the Word download links are 44px tall. A handset
   is still not an emulator.

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
