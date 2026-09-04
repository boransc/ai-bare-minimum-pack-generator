# Example-contamination audit

Has anything from the two reference documents leaked into the shipped
product?

`Nehemiah_AI_Governance_Playbook_2.docx` is **another client's board pack**,
marked Confidential. Karl's master prompt is explicit: *"Do not copy facts,
risks, roles, strategic pillars, numbers, regulations or conclusions from any
previous client example."* `karl-master-prompt.md` describes the Full Playbook —
the tier above this product — so its vocabulary appearing here would mean the
scope boundary has drifted.

A term is only reported if it does **not** also appear in Karl's Bare Minimum
Pack. `ISO 42001`, `EU AI Act` and `AI Transparency Index` are all legitimately
in the Pack, so finding them in the product is correct.

Scanned 60 shipped source files under content, components, app, lib/ (excluding tests, docs and scripts).

Re-runnable: `python scripts/contamination-check.py`

## Another client's specifics (Nehemiah)

- `West Midlands` — 2 occurrence(s), but this term also appears in Karl's Bare Minimum Pack, so it is legitimate.
- `Consumer Standards` — 1 occurrence(s), all inside the tailoring validator's banned-term list. The term is there to be rejected, which is the guard working rather than a leak.
- `Housing Ombudsman` — 1 occurrence(s), all inside the tailoring validator's banned-term list. The term is there to be rejected, which is the guard working rather than a leak.
Nothing found that is not also in Karl's own Pack.

## Full Playbook methodology (scope drift)

- `risk appetite` — 5 occurrence(s), but this term also appears in Karl's Bare Minimum Pack, so it is legitimate.
- `Conviction` — 1 occurrence(s), but this term also appears in Karl's Bare Minimum Pack, so it is legitimate.
Nothing found that is not also in Karl's own Pack.

## Result

**Clean.** No reference-document specifics appear in the shipped product.
