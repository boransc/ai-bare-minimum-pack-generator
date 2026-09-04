# AI Bare Minimum Pack Generator — product & technical specification

**Internal. Draft v0.1, 1 September 2026. Status: awaiting go-ahead before implementation.**

Source documents (in `docs/examples/`):
- `AI Bare Minimum Pack Complete.docx` — **authoritative** for everything this product generates
- `karl-master-prompt.md` — Full Playbook methodology; defines the upper boundary, not this product's scope
- `Nehemiah_AI_Governance_Playbook_2.docx` — worked Full Playbook example; boundary reference only

---

## 1. Scope boundary

| In scope (Bare Minimum) | Out of scope (Full Playbook) |
|---|---|
| The eight-point AI Minimum Standard, scored | Provision-by-provision AI Governance Code review |
| The starter guidance note and thirty-day plan | AI strategy, pillars, use-case portfolio, roadmap |
| The AI usage policy template | Governance architecture, charters, committee ToR, decision rights |
| The staff note and do/don't sheet | Maturity scoring, assurance plans, audit universe |
| Contextual emphasis and examples | Risk appetite, board capability, vendor due diligence |
| Naming what the minimum does *not* cover | Regulator-specific or EU AI Act readiness conclusions |

**Hard rule.** The product may tailor language, emphasis, examples and risk scenarios. It may never invent
policy, sector-specific requirements, regulations, obligations, dates, thresholds or organisational facts.
Structure, control list, sub-statements, scoring, bands, red lines and Code-mapped statements are fixed.

---

## 2. Stack

Per the brief: **Next.js (App Router) + TypeScript on Vercel**, **Cloudflare Workers AI** for generation,
**Cloudflare KV** for storage. Plus Tailwind, Zod, one transactional email provider.

- All model and KV access is server-side (route handlers / server actions). No key or token logic in the browser.
- Cloudflare accessed over its REST API from Vercel functions. No ORM, no Postgres, no Neon.
- Neon MCP is incidental to this session and is not part of the architecture.
- **Documented upgrade path:** if the admin view later needs real querying, move lead data to Cloudflare D1.
  Not built now.
- **Verify against current official documentation before writing code**: Next.js App Router APIs, Cloudflare
  Workers AI REST contract + available models + structured-output support, Cloudflare KV REST API + TTL
  semantics, the chosen email provider, Zod. No coding from memory.

---

## 3. Context wizard — eight questions, locked

Fixed-option only. No free text reaches the model. Organisation name is collected alongside Q1 and is not
one of the eight. "Don't know" is available where shown; it is uncertainty for tailoring and may generate a
*find out* action. It never scores as a pass, and it does not affect the 0–8 score at all — the score comes
solely from the assessment in §4.

| # | Question | Type | Options |
|---|---|---|---|
| — | Organisation name | optional text | capped, sanitised; fallback "Your organisation" |
| 1 | Which sector do you work in? | single | professional services · healthcare & social care · housing · education · charity & voluntary · financial services · legal · public sector & local government · technology · manufacturing & industrial · retail & hospitality · other |
| 2 | How many people work for your organisation? | single | 1–10 · 11–50 · 51–250 · 251–1,000 · over 1,000 |
| 3 | How would you describe your use of AI today? | single | not knowingly using it · some people use it informally · used regularly in some teams · used across the organisation · don't know |
| 4 | What do people use AI for? | multi | drafting & writing · research & summarising · meeting notes & transcription · data analysis · customer/client-facing chat · code · images or media · tools that take actions on their own · built-in features in software we already own · don't know |
| 5 | Does AI ever touch confidential, client or personal information? | single | yes routinely · yes occasionally · no · don't know |
| 6 | Is your organisation regulated? | single | yes · no · don't know |
| 6b | If yes, by whom? | multi + other | optional; common UK regulators; ICO deliberately omitted |
| 7 | Does AI play any part in decisions about people? | single | yes · no · don't know |
| 8 | Is one named person at board or senior level accountable for AI? | single | yes, named and known · someone informally · no · don't know |

Rules:
- Q3 does **not** gate Q4–Q8. "Not knowingly using it" is the strongest shadow-AI signal in the set.
- **Regulator names never reach the model.** Deterministic metadata only. `regulated: yes/no/don't know`
  may reach the model for emphasis. No claims are made about what any regulator expects; the only statement
  made is the source-supported one that regulator-specific readiness belongs to the fuller review.
- Sector `other` free text is stored as lead metadata and never sent to the model; the model sees the enum.
- Organisation name is an injection surface: length-capped, newlines stripped, passed as a delimited data
  field, never interpolated into instruction text.

---

## 4. The assessment

Presented as **eight controls**; answered at **sub-statement** level (19 statements). Each sub-statement is
Yes / No, with the source's own evidence test in the UI ("a yes needs evidence behind it… where you cannot
point to the evidence, score it no").

**A control scores Yes only when every *applicable* sub-statement is Yes. No partial credit.**

| Control | Sub-statements | Notes |
|---|---|---|
| 1. Someone owns AI | 1.1 named AI lead everyone knows · 1.2 AI use, risks and incidents reported to board/senior team at least quarterly | |
| 2. You know what is being used | 2.1 approved tools list findable in under a minute · 2.2 register of tool, user, purpose, data touched | |
| 3. You have a written AI usage policy | 3.1 issued to all staff incl. contractors and temps · 3.2 in induction, acknowledgements recorded | |
| 4. Your data rules are explicit | 4.1 written plain-language rule on confidential/client/personal data · 4.2 for approved tools touching personal data: DP terms checked, lawful basis confirmed, training on our data off where available | **RED LINE** |
| 5. Unapproved tools are brought into the open | 5.1 simple request route answered within days · 5.2 amnesty run | |
| 6. A human checks before anything leaves | 6.1 facts, figures, quotations, sources checked against a reliable source · 6.2 second qualified reviewer signs off high-impact work, recorded · 6.3 *conditional* — where AI touches a decision about a person, a named human decides and the review is shown | **RED LINE**; 6.3 applicability from wizard Q7 |
| 7. You tell people when AI is involved | 7.1 website AI statement + email footer line · 7.2 note-takers disclosed in invitation and verbally before external meetings · 7.3 client deliverables declared where AI made a substantive contribution (AI-2+) | |
| 8. People are trained, and incidents get reported | 8.1 all staff trained in last 12 months · 8.2 named incident contact, known route, incidents logged and reviewed · 8.3 people told how AI changes their work, with training behind it | |

**Conditional applicability rule.** A sub-statement may be marked not-applicable **only where the source
itself conditions it.** Today that is 6.3 alone (source: "Where AI touches a decision about a person…"),
disapplied when wizard Q7 = no. Q7 = don't know keeps it applicable. Every disapplication records its reason
so the snapshot is self-explaining. No other applicability rules are invented.

### Verdict, score and bands

Derived deterministically, in this order:

1. **Verdict** — `MINIMUM NOT MET` if control 4 or control 6 is No, whatever the total. Else the band decides.
2. **Score** — count of controls scoring Yes, 0–8, shown subordinate to the verdict.
3. **Band** (source wording, verbatim): 8 → minimum in place, ready for a full review · 6–7 → close, with
   live gaps · 3–5 → material exposure, AI in use and largely ungoverned · 0–2 → relying on luck.

A 7/8 organisation failing control 6 is told plainly the minimum is not met. This is deliberate.

### Driver mapping (source, fixed)

Resources 2, 8 · Board competence 1, 8 · Execution 3, 5, 6 · Transparency 7 · Impact 6, 8 · Behaviour 4, 5.

### Snapshot semantics

The completed assessment is a **frozen dated snapshot** — the signed copy the Standard asks for, with its
sign-off block (completed by, role, organisation, date, points answered yes, gaps to be closed by, next
review date). **Checklist progress never mutates the score.** Re-assessment (future scope) creates a new
snapshot; the data model supports it now, the history UX is not built in v1.

---

## 5. Remediation checklist / thirty-day plan

The checklist and the thirty-day plan are **the same object, two views.** Items target the exact unmet
sub-statements, not whole controls.

**Ordering is entirely source-derived. No invented weighting.**
1. Failed red lines first (controls 4 and 6) — the source says so explicitly.
2. Everything else in thirty-day-plan sequence: week 1 → controls 1, 2, 5 · week 2 → 2, 4 · week 3 → 3 ·
   week 4 → 8, 7. Effective order for non-red-lines: **1, 2, 5, 3, 8, 7**.
3. Wizard context changes **emphasis and explanation only, never position.** The model is never shown a
   priority score it could rationalise.

Plus *find out* items generated from wizard "don't know" answers.

---

## 6. Tailoring layer

### 6.1 Slot inventory (the only LLM output surface)

| Slot | Placement | Cap | Fallback |
|---|---|---|---|
| `openingContext` | Result page top + pack cover; 2–3 sentences | ~350 ch | generic source opener |
| `perControlEmphasis[1..8]` | One sentence under each control | ~200 ch each | omitted; source text stands alone |
| `riskScenario` | **Alongside** the Pack's own worked examples, never replacing them | ~600 ch | source examples only |
| `sectorDataExamples` | Makes control 4's never-list concrete; 3–5 bullets | 5 × ~80 ch | source never-list only |
| `thirtyDayFraming` | Frames the plan for their size/capacity | ~250 ch | source framing |
| `nextStepRationale` | Why the top items are first, **in the source's sequence**, in their language | ~300 ch | deterministic sentence from the gap list |

**Excluded from tailoring entirely:** Part 3 (policy template) and Part 4 (staff note). They are instruments
the organisation adopts and issues as its own. The only substitution there is **deterministic population of
explicit bracketed fields where the user actually supplied the value**; anything unsupplied stays a visible
`[bracket]`. Sector examples live in explanatory areas only. The model never selects or orders next steps.

### 6.2 Grounding by construction

Per slot, deterministic code assembles the prompt from:
- **the one relevant source section**, chosen via a **static hand-authored slot → source-section map checked
  into the repo.** No retrieval, no embeddings — the source is one fixed document with known sections.
- **the permitted context enums only** (sector, size, AI use, use types, sensitive data, regulated y/n/dk,
  consequential decisions, board owner; plus org name as a delimited data field).

The model is told it may describe *situations*, never *obligations* — even obligations the source states,
because restating them in a model-authored slot is where drift begins.

### 6.3 Validation layers

| Layer | Mechanism | On failure |
|---|---|---|
| 1 | Strict structured output against a Zod schema; hard caps; no markdown/lists | reject wholesale; **one retry for malformed output only** |
| 2 | Deterministic checks: prohibited terms (named regulations, standards, regulators), obligation modals, digits, dates, capitalised entity patterns | immediate per-slot fallback, **no retry** |
| 3 | Entailment check — one call per pack; given only the permitted source excerpts + context enums, marks each slot `supported` / `introduces-new-claim` | per-slot fallback |
| 4 | Deterministic fallback per slot | pack always renders |

**Layer 3 ships advisory-first.** Workers AI models are smaller than frontier models and this is a
precision task; log its verdicts alongside layer 2 during testing and only let it trigger fallbacks once
measured. Layers 1, 2 and 4 are the enforced controls and stand alone — layer 3 can be dropped without
touching anything else.

Two model calls per pack. Failure mode is always *less tailored*, never *wrong*.

### 6.4 Kill switch

A server-side flag flips the whole product to deterministic-only, using fallbacks for every slot. No
pre-publication human review; strong logging and monitoring instead.

### 6.5 Provenance

Every tailored string is machine-distinguishable from source text in the data model, so "which words did a
model write?" is always answerable. Whether provenance is *visibly* marked in the rendered pack is an open
design question. Provenance and generation records live and die with the pack (§8), not indefinitely.

---

## 7. Result page

Order, top to bottom:

1. **Verdict line** — "The minimum is not met" / "The minimum is in place". Red lines first, band second.
2. **Score**, subordinate: "7 of 8 points evidenced", with the band's source wording.
3. **Red-line block** if control 4 or 6 failed — distinct and unmissable, in the source's own reasoning,
   before anything else.
4. **What to do first** — source-ordered per §5, with `nextStepRationale`.
5. **Full eight-control breakdown**, showing which sub-statements are unmet and which are not applicable, why.
6. **Checklist / thirty-day plan.**
7. **Full Playbook pathway.**
8. **Save, return link, print / download.**

**8/8 leads positively** — "The minimum is in place" — then the source's own two next steps: maintain via the
annual refresh, and move into the fuller governance review. Visible, not a hard sell.

### Full Playbook pathway

Natural next step for everyone, argued in the source's own "what the bare minimum does not give you" terms:
risk appetite, board and leadership capability, use-case assessment, regulatory readiness, vendor and supply
chain due diligence, assurance (comfort → confidence → conviction).

**Stronger prompt triggers** (all readable from data we hold, no inference):
- no board-level owner — control 1 No, or wizard Q8 ∈ {someone informally, no, don't know}
- AI in consequential decisions — wizard Q7 = yes
- no AI policy — control 3 No

---

## 8. Data model, persistence and retention

**Save-on-completion**, stated plainly up front. Every completed assessment is stored and gets a token.

**Cloudflare KV keys**
- `pack:{token}` → `PackRecord`, **KV TTL = 12 months** (storage-enforced deletion; the legal obligation
  does not depend on our code being right)
- `idx:leads:{yyyy-mm-dd}` → compact lead summaries, appended at completion. Secondary index so the parked
  admin view later reads a handful of keys instead of scanning. KV cannot query.

**`PackRecord`** — schema version · token · createdAt · **accessExpiresAt (createdAt + 90 days, checked on
read)** · contentVersion · orgName · wizard answers · 19 assessment answers · derived block (per-control
results, applicability decisions + reasons, score, redLineFailed, band, verdict, playbook triggers) ·
checklist state (item → done, updatedAt) · tailoring (slots + per-slot provenance: model | fallback, with
validation verdicts) · consent (emailProvided, marketingOptIn) · email if supplied · regeneratedFrom ·
generation/validation events.

**Retention:** TTL enforces the 12-month deletion; the read-time `accessExpiresAt` check enforces the
90-day link expiry. Returning does **not** slide the 90 days — client decision needed to change that.

**Consistency:** KV is eventually consistent. The result page **renders from the completion response**, never
save-then-redirect-then-read. Checklist writes are last-write-wins; acceptable for single-user packs.

**Access:** no accounts, ever, in v1. The token *is* the credential. Therefore: `noindex`,
`referrer: no-referrer`, token never in a title, analytics event or referrer, and the user is told plainly
that anyone with the link can see the pack.

**Email:** optional, sends the **link only** — never the score, gaps or pack summary. Unlocks nothing;
everything is available on screen without it. Marketing opt-in separate and unticked.

**Analytics:** aggregate funnel counts only (wizard started, assessment completed, pack generated, return
visit). No user-level behavioural analytics, no identifiers, no token.

**Admin view: parked.** Data model retains everything it will need. Later, lead rows are summary-only and
opening a full pack is a deliberate, logged action.

---

## 9. Canonical content

Lives as **structured, versioned files in the repo** — reviewable, diffable, rollback-able; changing it
requires a deploy. Not editable DB records.

Contains: eight controls + 19 sub-statements + applicability rules · bands and red-line rule · driver
mapping · thirty-day plan · full policy template with typed, named bracketed fields · staff note · do/don't
table · the "what this does not cover" and "what the bare minimum does not give you" sections · all six slot
fallbacks · the slot → source-section map · the disclaimer, trademarks and contact footer, verbatim.

**Versioning:** every pack pins `contentVersion`. If a saved pack's version differs from current, offer
regeneration; regeneration creates a **new** pack and preserves the original with its original date, since
the original may have been signed. No semver semantics or nag rules in v1. Content version is recorded on
every snapshot so future history views cannot imply comparability across a structural change.

**Pre-launch gate:** the transcription must be verified as faithful by Governance AI / the source owner.
Internal review during the build is not that sign-off.

---

## 10. Routes

`/` landing · `/start` wizard · `/assessment` · `/pack` result (renders from response) · `/p/[token]` saved
pack · `/p/[token]/print` print layout · `/p/[token]/policy.docx` · `/p/[token]/staff-note.docx` ·
`POST /api/packs` generate · `POST /api/packs/[token]/checklist` · `POST /api/packs/[token]/email-link` ·
`POST /api/packs/[token]/regenerate` · `/robots.txt` (noindex on all pack routes).

**Downloads:** one print-optimised HTML layout serves both browser print-to-PDF (day one, no dependency) and
server-rendered PDF later if hosting makes it cheap — same layout either way, so it is an addition, not a
rewrite. Parts 3 and 4 also download as **editable .docx**, because their own instructions say to fill in
the brackets, approve and issue them.

---

## 11. Phased plan

| Phase | Deliverable | Exit criteria |
|---|---|---|
| **0. Foundations** | Repo scaffold, verified-from-docs stack setup, canonical content transcribed to structured files, slot → section map | Content passes internal fidelity review against the .docx; typed and unit-tested |
| **1. Deterministic core** | Wizard, assessment, scoring, verdict/red-line logic, result page, checklist, print layout — **no LLM, no persistence** | A correct, honest, printable pack end to end; scoring/red-line/applicability fully unit-tested |
| **2. Tailoring** | Workers AI generation, slot schema, layers 1–4, fallbacks, kill switch, provenance | Pack renders correctly with the model disabled, malformed, and adversarial; boundary tests pass |
| **3. Persistence & return** | KV storage, token, 90-day/12-month lifetimes, saved-pack route, optional email, consent, lead index | Expiry and deletion verified; no token leakage; render-from-response confirmed |
| **4. Downloads** | .docx for Parts 3 and 4; server PDF if cheap on Vercel | Editable policy with brackets intact; PDF fidelity acceptable |
| **5. Hardening** | Accessibility, rate limiting, abuse protection, security review, aggregate analytics, monitoring | Security review clean; a11y pass; funnel counts live |
| **6. Parked** | Admin lead + health view, reassessment history, D1 migration if needed | Not started until 0–5 land |

**Design:** port the prototype's visual language (serif/mono/Manrope pairing, grain, sheet-cover motif),
improving UX where the real product structure demands it. Provisional pending brand sign-off; no invented
brand rules; supplied names and trademarks preserved exactly.

---

## 12. Open items for the client

1. Does returning to a saved pack extend the 90 days, or is expiry fixed from creation? *(assumed fixed)*
2. Should model-authored sentences be *visibly* marked in the rendered pack?
3. Confirmation of canonical content sign-off owner.
4. Brand and trademark usage sign-off.
5. Privacy notice wording for lead visibility, lifetimes and consent.
