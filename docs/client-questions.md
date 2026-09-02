# Client questions, and the answers we got

**To:** Karl and Fred · **From:** Boran · **Re:** AI Bare Minimum Pack Generator

The brief said it was deliberately incomplete, so here is one batched message rather
than twenty pings. Questions are grouped by what they actually change in the build.
Everything already answerable from the Pack, the master prompt or the Nehemiah
example was answered from those and is not asked here.

Answers received are recorded inline, because they are the reason the spec looks the
way it does.

---

## 1. The immutable / adaptable line

**Q. What may the model change, and what must it never touch?**

> **A.** Structure, the eight controls, the sub-statements, the scoring, the bands, the
> red lines, the policy template and the staff note are fixed. The model may tailor
> language, emphasis, examples and risk scenarios only. It must never invent policy,
> regulation, sector-specific requirements or organisational facts.

**Q. Should tailoring be a real model call at runtime, or pre-authored variants
selected by rule?** Deterministic variants would make "never invents policy" a
structural guarantee rather than a probabilistic one, at the cost of the AI actually
doing anything.

> **A.** Hybrid. Keep structure, controls, scoring, Code-mapped statements and policy
> requirements deterministic. Use the model only for bounded contextualisation, ideally
> returning structured fields assembled alongside the fixed source content — so the
> guarantee is largely structural without removing the AI-tailoring part of the project.

**Q. May the model touch Part 3 (the policy) and Part 4 (the staff note)?** These are
instruments an organisation adopts and issues as its own, not explanatory prose.

> **A.** No. Parts 3 and 4 stay canonical. The only substitution permitted is
> deterministic population of explicit bracketed fields where the user actually supplied
> the value. Sector-specific examples belong in explanatory areas, never in the policy
> or staff note themselves.

**Q. Should a generated risk scenario replace Karl's worked examples (Deloitte, West
Midlands Police) or sit beside them?**

> **A.** Alongside. Never replacing.

---

## 2. What we may collect from visitors

**Q. What is off-limits?**

> **A.** Nothing you would not put on a postcard. No free text describing their data,
> their cases or their clients.

**Q. May Governance AI see the wizard answers and the score, or only that a lead
exists?** Commercially the answers are the lead; but a visitor completing an honest
self-assessment may not expect the vendor to read their failures.

> **A.** Governance AI can see the answers and the score, because that is what makes the
> lead useful — but only if it is stated clearly to the user rather than implying the
> assessment is private. Marketing consent stays separate.

**Q. The regulator question — capture the regulator's name or not?** Naming a regulator
invites the model to invent that regulator's requirements, which is the one thing it
must not do.

> **A.** Capture it, but never send the regulator name to the model. `regulated:
> yes/no/don't know` may reach the model for emphasis. Make no claims about what any
> regulator expects; use the source-supported line that regulator-specific readiness
> belongs to the fuller review.

**Q. Email capture — required or optional, and what does it unlock?**

> **A.** Optional, for sending the return link only. Separate unticked marketing opt-in.
> It unlocks nothing.

---

## 3. Where the bare minimum stops and the Full Playbook starts

**Q. How should the Full Playbook be presented — to everyone, or only where gaps
justify it?**

> **A.** The natural next step for everyone, with a stronger recommendation when specific
> gaps exist: no board-level owner, AI in consequential decisions, or no AI policy. The
> specific version converts much better than the generic one.

**Q. Anything from the Playbook that should appear in this product?** The master prompt
covers maturity scoring, risk appetite, assurance ratings and a Code-provision review —
all of which look temptingly reusable.

> **A.** No. None of that belongs here.

---

## 4. The assessment mechanics

**Q. Should the eight-point check be answered at point level (8 answers) or at the
level of the source's own sub-statements (19)?**

> **A.** Sub-statement level, presented as eight controls. A point scores yes only when
> all of its required sub-statements are yes. That also lets the checklist target the
> exact missing sub-statement rather than a whole control.

**Q. Is the assessment a frozen record or a live tracker?** The source says "complete
it, score it, keep the signed copy", which reads as evidentiary.

> **A.** Frozen, dated snapshot. Checklist progress must never mutate the score. Build
> the data so re-assessment history can be added later.

**Q. A 7/8 organisation that fails a red line — what does the page say?**

> **A.** Verdict first, score second. If point 4 or 6 fails, the headline says the minimum
> is not met even at 7/8.

**Q. Should remaining gaps be prioritised by our own weighting of the wizard context?**

> **A.** No — keep them in the source's own thirty-day-plan order. Context may change
> emphasis and explanation, never position.

---

## 5. Return links, retention and versioning

**Q. Confirmed rules?**

> **A.** Unguessable token, no login, expires after 90 days, not indexed, saved packs
> deleted after 12 months. Generated packs stay on the source version that produced
> them; if a newer version exists, offer regeneration rather than silently changing
> their pack.

**Q. Does returning to a saved pack extend the 90 days, or is expiry fixed from
creation?**

> **Still open.** Built as fixed from creation. One line from you settles it.

---

## 6. Content authority

**Q. Who signs off that the machine-readable version of the Pack faithfully represents
the original?** Every generated document inherits it, so it needs a named owner.

> **A.** Governance AI / the source owner, before any real launch. Internal review during
> the build is not that sign-off. Recorded as a pre-launch gate.

---

## Still outstanding

1. **Does returning to a saved pack extend the 90 days?** Assumed no.
2. **Content sign-off** on the transcription in `content/v1/`.
3. **Branding** — no logo, colours or tone guide received, so the current visual
   treatment is provisional and flagged as needing sign-off.
4. **Should model-written sentences be visibly marked in the pack?** Built as yes
   (italic, with a caption), because it seemed the safer default for a governance
   product carrying Karl's name.
