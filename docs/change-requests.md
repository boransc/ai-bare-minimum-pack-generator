# Change requests

**To:** Governance AI · **From:** Boran

Five proposals, pitched properly: what, why, and roughly what it costs. Say yes or park
them. None of these are in the brief; all of them came out of building the thing.

Ordered by what I think earns its keep fastest, not by how interesting they are to
build.

---

## CR-1 · Re-assessment, and showing movement over time

**What.** Let an organisation re-take the eight-point check from their saved link. Each
run is its own dated snapshot; the pack shows the trend — 4 of 8 in September, 7 of 8 in
November — and which specific points closed.

**Why.** Right now the product's job finishes at the moment of most anxiety and least
progress. Nothing brings anyone back. This is also the single most useful artefact a
board can be shown: not "we scored 4", but "we scored 4, we did the work, we now score
7, here is the date on each." It converts the pack from a diagnosis into evidence of
governance actually operating, which is precisely the Comfort → Confidence → Conviction
argument the Playbook makes. Commercially it turns a one-visit lead into a returning
one, and a returning organisation with a rising score is the warmest possible Playbook
conversation.

**Cost.** Roughly half a day. The data model was built for it — every snapshot already
records its content version, and packs are already immutable and dated. What is missing
is the history UX and a rule refusing to draw a trend line across a major content
version, since scores stop being comparable if the controls themselves change.

---

## CR-2 · Editable Word versions of the policy and the staff note

**Status: DELIVERED.** Built rather than pitched, because a requirements audit found the
"downloadable print-quality version" was a print stylesheet and nothing else, and this
was the more useful thing to build against that finding. `GET /api/download?token=…&doc=policy|staff-note`
serves each part as a Word-openable document carrying the organisation's saved field
values. Unfilled brackets stay visible so they can be completed in Word. The cost
estimate below turned out to be roughly right; the library did not prove necessary.

**What.** Alongside the print/PDF view, offer Parts 3 and 4 as editable Word downloads
with the bracketed fields intact.

**Why.** The source's own instruction for these two documents is "fill in the bracketed
fields, approve it, issue it, collect acknowledgements." A PDF cannot be filled in. At
the moment we hand someone a beautiful read-only version of a document whose entire
purpose is to be edited and adopted as their own, which quietly guarantees they will
retype it — and a retyped policy is one that drifts from the source wording immediately.
This is the difference between the pack being admired and the pack being used.

**Cost.** Half a day, most of it in making the generated document look like Governance
AI produced it rather than a script. No new service, and in the end no library either:
Word opens HTML natively when it is served as `application/msword`, which avoids taking
on a `.docx` generator for two fixed documents.

---

## CR-3 · A one-page board summary

**What.** A separate single-page printable: the verdict, the score, the red lines, the
three things being done about it, and the date. One page, designed to be read by people
who will not read twenty-five.

**Why.** The Standard says AI should be a standing item at board or senior level at
least quarterly, and point 1 fails for most organisations precisely because nobody has
anything to put in front of the board. The full pack is the working document; this is
the tabling document. It is also the artefact most likely to be forwarded to the person
who signs off a Playbook engagement, which makes it the highest-leverage single page in
the product.

**Cost.** Half a day, and it reuses everything — same data, same print pipeline, one new
layout and a tighter set of copy decisions about what earns a place on one page.

---

## CR-4 · Anonymous sector benchmarking

**What.** Once there is a reasonable volume of completions, show a visitor where they sit
against their sector in aggregate: "housing organisations completing this typically
evidence 5 of 8; the most commonly missing point is 4."

**Why.** It answers the question every organisation asks immediately after seeing a bad
score — "is this just us?" — which is currently unanswered and slightly demoralising. It
also makes the eventual lead list genuinely valuable as an asset rather than a contact
list, and gives Governance AI something publishable: a short annual "state of the bare
minimum" note, built from real data, that is a marketing surface in its own right.

**Cost.** A day, but with a hard prerequisite: it must not be shipped until the volume is
high enough that no individual organisation is identifiable from an aggregate. Below
roughly thirty completions in a sector it should not display at all. Worth building only
once traffic exists — park it until then rather than yes/no now.

**Recommendation:** park.

---

## CR-5 · The sign-off block, completed and kept

**What.** The source's Part 1 ends with a sign-off block — completed by, role,
organisation, date, points answered yes, gaps to be closed by, next review date. Make
those fields fillable on the saved pack and keep them with it.

**Why.** The source says "keep the signed copy", and a signed copy with the signature
fields left blank is not one. It costs the user thirty seconds and turns the pack from
something they read into something they own, with a name against it. It also captures
"gaps to be closed by" and "next review date" — two dates that are exactly when a
follow-up conversation is most welcome rather than most annoying.

**Cost.** Two hours. Same storage pattern as the checklist, same TTL handling; the
fields are already in the transcribed content.

**One caution:** "completed by" is a named individual, which is the first personal data
the product would hold beyond an optional email. It should stay optional, and it changes
the privacy notice, so it needs your sign-off rather than mine.
