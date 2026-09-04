# Handover

For whoever picks this up next. The README covers how to run it and why the
architecture is shaped the way it is; this covers what you need to know to take it over
without me in the room.

---

## What this is, in one paragraph

A public web product that turns Karl George's AI Bare Minimum Pack from a Word document
into something an organisation can complete in ten minutes. They answer eight questions
about themselves, work through the eight-point AI Minimum Standard at the level of its
19 sub-statements, and get a dated verdict, their specific gaps, a thirty-day plan, the
policy and staff note, a checklist they can return to, and a route into the Full
Playbook. The bracketed fields in the policy and the staff note are fillable in the page
and saved, and both download as editable Word documents. No account, no login — a
personal unguessable link is the only way back.

---

## The five things you must not break

These are not preferences. Each one exists because of a decision made deliberately, and
breaking one silently makes the product wrong rather than merely worse.

**1. The model never authors policy.** It fills three named, length-capped fields and
cannot emit a requirement, because it is never asked for one. Four layers enforce this
(narrow input, schema, deterministic boundary checks, per-slot fallback). If you add a
new tailored slot, it must go through `lib/tailoring/` and its validators. Never render
model output directly.

**2. The assessment is a frozen, dated snapshot.** Ticking a checklist item must never
change the score. To move the score, an organisation re-takes the check. If you find
yourself writing code that mutates `pack.assessment` after creation, stop.

**3. Points 4 and 6 are red lines, and the verdict leads.** A 7/8 organisation failing
either is told plainly that the minimum is not met. The score is subordinate to the
verdict everywhere it appears. This is the product's credibility; it is also the thing
most likely to get "improved" by someone who thinks 7/8 should look encouraging.

**4. Parts 3 and 4 are canonical.** The policy template and staff note are instruments an
organisation adopts as its own. No tailoring touches them. The only substitution is
deterministic population of bracketed fields where the user actually gave a value —
every other bracket stays visible for them to complete. The Word export in
`lib/export/` follows the same rule and must keep doing so: it never invents a value for
an empty bracket, and it escapes everything it interpolates, because that document
leaves the product and gets circulated.

**5. `content/v1/` is Karl's words.** Changing a string there changes what the product
tells organisations to do. It is a content decision for Governance AI, not a code
change.

---

## Pre-launch gates — not yet cleared

The product runs. It is not signed off. Three things stand between it and a public
launch, and none of them are engineering:

1. **Content sign-off.** The transcription in `content/v1/` was done carefully and
   reviewed internally, but has NOT been verified as faithful by Karl or Governance AI.
   Every generated pack inherits it, so a transcription error becomes an error in every
   document the product ever produces. This is the real blocker.
2. **Brand sign-off.** No logo, colour or tone guide was ever supplied. The current
   visual treatment is mine, derived from a prototype, and is provisional. Supplied
   names and trademarks (`The AI Transparency Framework™`, `The AI Transparency
   Index™`) are reproduced exactly as they appear in the source and must stay that way.
3. **Privacy notice.** The product discloses in-page that Governance AI can see
   completions, answers and scores, and states the 90-day and 12-month lifetimes. There
   is no formal privacy notice page. Someone needs to write one and decide whether the
   in-page wording is sufficient.

---

## One open client question

**Does returning to a saved pack extend the 90-day link expiry, or is it fixed from
creation?** Built as fixed. One sentence from Karl or Fred settles it; the change is a
few lines in `lib/storage/packs.ts` if the answer is "it should slide".

---

## Where things live

```
content/v1/        Karl's Pack as structured data. Canonical. Sign-off required.
lib/domain/        Scoring, checklist ordering, pack assembly. Pure functions, no I/O.
lib/tailoring/     Source map, prompt, schema, validators, fallbacks, KV cache.
lib/cloudflare/    KV and Workers AI over REST, via the AI Gateway.
lib/storage/       Tokens, saved packs, retention, the lead index.
lib/email/         The return-link sender. SMTP is the live path; a Resend
                   adapter sits behind it, unused.
lib/export/        Parts 3 and 4 as editable Word documents. Pure string builders.
app/               Routes. components/ holds the client pieces.
scripts/           The tailoring check and the model probe. Both opt-in, both cost money.
docs/spec/         Product and technical spec, plus the one-page client version.
docs/              This file, the client questions, the change requests, tailoring check.
```

The one file worth reading before you touch anything: `lib/domain/assessment.ts`. It is
short, pure, and encodes the three scoring rules that everything else depends on.

---

## Operating it

**Environment.** See the README table. `CF_ACCOUNT_ID`, `CF_API_TOKEN` and
`CF_KV_NAMESPACE_ID` are required — without them packs cannot be saved and generation
returns 503. `APP_PASSCODE` is yours to choose; unset means `/admin` refuses everyone
rather than opening.

**If tailoring starts producing something embarrassing:** set
`TAILORING_ENABLED=false`. Every pack immediately renders from source content alone,
with no model call. No deploy needed. The product is complete without tailoring — that
was the design.

**If the model bill looks wrong:** tailoring results are cached in KV by a hash of the
exact inputs, so identical answers never cost twice, and every call routes through the
Cloudflare AI Gateway where you can see the traffic. Rate limits are 20/minute and
60/hour per IP. Note the honest caveat: when KV is unreachable the limiter falls back to
an in-memory window that is per-instance, not global.

**The admin lead list** is at `/admin`, reachable only by typing the URL — there is
deliberately no link to it from the public site. Sign in with `APP_PASSCODE`.

**Email** goes out over SMTP, through a Governance AI mailbox. Set `SMTP_HOST`,
`SMTP_USER`, `SMTP_PASSWORD` and `EMAIL_FROM` (see the README for the exact values) and
it works; leave them unset and the UI correctly offers to take an address rather than
promising a send it cannot make. Run `npm run email-check` for the current state, and
`EMAIL_TO=you@example.com npm run email-check` to attempt a real send and get the
provider's own error back.

The route matters, because the two obvious ones are dead ends. Brevo needs no domain but
holds new accounts behind a manual review with no timeline, and never released this one;
its adapter has been removed, because a provider that has never sent a message is not an
option, it is a trap for whoever reads the code next. Resend needs DNS records on a
domain we do not control, and its shared test sender only ever delivers to the account
owner's own address — that adapter is kept, because adding DNS records is a realistic
future and the switch would then be an environment variable rather than a code change.

Sending through a mailbox the organisation already owns needs neither: the domain already
receives mail, so its sender authentication already exists. SMTP takes precedence
whenever it is configured, and **a half-filled SMTP block is deliberately ignored**
rather than selected, so someone midway through setup cannot shadow a working Resend key
and fail every send.

---

## The deployed instance

<https://ai-bare-minimum-pack-generator.vercel.app>

Verified end to end against production, not just locally: the eight-question wizard
walked as a browser user, pack creation, tailoring, regenerate, the Word downloads,
document fields, the checklist, persistence across a reload, rate limiting with
`Retry-After`, and the security headers (production CSP carries no `unsafe-eval`;
`/pack/:token` sends `Referrer-Policy: no-referrer`). `docs/audit-deployed.md` records
what was observed, and `docs/audit-requirements.md` maps the build against the brief.

Two things there have never been exercised and are honest gaps: a genuinely expired pack
(the `410` branches), and a physical handset — the mobile measurements are real but come
from an emulated viewport.

---

## Verifying it still works

```bash
npm test                 # 228 tests, offline, no model calls, no credentials needed
npm run build
npm run tailoring-check  # live: 5 organisations through the real production path (~5 model calls)
npm run email-check      # reports email configuration; add EMAIL_TO to actually send
```

`npm test` is deliberately hermetic — it does not read `.env.local`, so it behaves the
same on a laptop and in CI. The two live checks take credentials explicitly. Do not
"fix" this by loading env globally; it was tried and it made the rate-limit tests pass
or fail depending on whether the developer happened to have credentials on disk.

The test worth trusting most: `lib/domain/assessment.test.ts` covers every red-line
permutation and all nine score bands. If you change scoring and that suite still passes,
you probably have not changed what you think you changed.

---

## Traps I hit, so you do not have to

- **A green test suite is not evidence that a feature works.** This is the one to
  actually absorb. Per-section regenerate shipped with 21 passing tests, a clean build
  and a passing suite, and was broken for *every* real pack on production: it 404s on a
  pack with no stored tailoring, and `/api/tailor` generated the tailored text, returned
  it to the page and never saved it. The tests passed because they built a stored pack
  that already had tailoring — a state nothing in the product produced. The suite was
  self-consistent and wrong about the world. Before believing a feature works, exercise
  it against the deployed instance with a pack made by the wizard.
- **Sampling temperature interacts with the character caps.** `openingContext` allows 350
  characters against `riskScenario`'s 600, and regeneration runs hot on purpose so the
  new text differs from the old. Hot plus tightest cap meant it overran and was rejected
  roughly two times in three. Two attempts now, the second cooler. If you add a slot with
  a tight cap, expect the same and do not solve it by loosening the validator.
- **A touch target is not the thing you can see.** The checklist checkbox is 15px because
  that is the right visual weight in a document meant to look printed. It carries a
  44x44 hit area under `(pointer: coarse)` via a wrapper, so the target grew and the
  decoration did not. Measure targets on a coarse pointer, not in a resized desktop
  window.
- **Workers AI has no single reply envelope.** `@cf/openai/gpt-oss-120b` answers
  OpenAI-style (`result.choices[0].message.content`); Llama models use
  `result.response`. Reading the wrong field makes a working model look like a transport
  failure. `lib/cloudflare/workers-ai.ts` reads every known shape.
- **It is a reasoning model.** Reasoning and content share `max_tokens`. Too low and it
  thinks until it runs out, returning `content: null` with `finish_reason: "length"`.
- **Workers AI rejects `propertyNames`,** which Zod 4 emits for `z.record()`. Deriving
  the model's JSON schema from the Zod schema 400s every call. The schema sent to the
  model is hand-built from the keywords the grammar engine actually implements.
- **Never cache a degraded tailoring result.** One transient error otherwise poisons that
  exact context for the full TTL: later visitors silently get the fallback pack, no call
  is made, and nothing looks broken.
- **KV is eventually consistent.** Never save-then-redirect-then-read. The pack page
  retries only on a fresh redirect (`?new=1`); a cold link fails fast.
- **`break-inside: avoid` on a section wrapper breaks printing.** A box several pages
  tall told never to split gets clipped, not paginated. Protection belongs on small
  atomic rows.
- **A bare `1fr` grid track is `minmax(auto, 1fr)`** and will not shrink below its
  content, which silently overflowed the whole wizard on a phone.
- **next/font variables must sit on `<html>`.** On `<body>`, `:root` composes them into
  an empty value and every `font:` shorthand dies — losing the type scale, not just the
  typeface.

---

## What I would do next, in order

1. **Get content sign-off.** Nothing else matters until the transcription is verified.
2. **Re-assessment over time** (CR-1 in `docs/change-requests.md`). The strongest reason
   for anyone to come back, and the data model already supports it.
3. **Watch the validator rejection rate.** It is the early warning that tailoring is
   drifting, and nobody is currently watching it. Rejections are recorded per pack; they
   need surfacing in the admin health view.
4. **Test the expired-pack path.** Every endpoint has a `410` branch for a pack past 90
   days, and not one of them has ever run — there is no non-destructive way to age a
   record. It is the same shape of risk as the regenerate bug below: a branch that only
   the tests have ever visited.
5. **Move the lead list to D1** if it ever needs real querying. Same platform, actual
   SQL. Do not reach for Postgres.
