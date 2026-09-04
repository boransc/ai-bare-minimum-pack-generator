"""
Example-contamination audit: has anything from the reference documents leaked
into the shipped product?

Two reference documents were supplied for context only:

  * Nehemiah_AI_Governance_Playbook_2.docx — ANOTHER CLIENT'S board pack,
    marked "Confidential". None of its facts, figures, roles or conclusions may
    appear in this product. The Full Playbook master prompt is explicit: "Do not copy
    facts, risks, roles, strategic pillars, numbers, regulations or conclusions
    from any previous client example."
  * karl-master-prompt.md — the Full Playbook methodology, which defines the
    tier ABOVE this product. Its vocabulary appearing in the Bare Minimum Pack
    would mean the scope boundary has drifted.

An agent that reads those files while writing content can absorb specifics from
them without anyone noticing. This check exists because that failure would be
invisible in review and serious if shipped: another organisation's confidential
board detail, on a public marketing site.

Terms are only reported when they do NOT also appear in the Bare Minimum
Pack. "ISO 42001", "EU AI Act" and "AI Transparency Index" all legitimately
appear in the Pack, so finding them in the product is correct, not a leak.

    python scripts/contamination-check.py

Exits non-zero if anything is found, so it can gate a release.
"""

import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

NEHEMIAH = Path("docs/examples/Nehemiah_AI_Governance_Playbook_2.docx")
MASTER_PROMPT = Path("docs/examples/karl-master-prompt.md")
BARE_MINIMUM_JSON = Path(".source-text.json")
REPORT = Path("docs/audit-example-contamination.md")

# Where the product's own words live. Deliberately excludes docs/ and scripts/:
# a spec or an audit report may legitimately discuss Nehemiah by name, and this
# very file names it. Only what ships to a visitor matters.
SHIPPED = ["content", "components", "app", "lib"]
SHIPPED_SUFFIXES = {".ts", ".tsx", ".css"}

# Files whose whole job is to enumerate terms that must NOT reach a visitor.
# A hit here is the guard working, not a leak — the tailoring validator lists
# "Consumer Standards" and "Housing Ombudsman" precisely to reject them if a
# model ever produces one. Classified separately rather than excluded, so the
# guard list stays visible in the report instead of silently unscanned.
GUARD_FILES = {"lib/tailoring/validate.ts"}

# Unmistakably this client. Verified present in their document before use.
NEHEMIAH_TERMS = [
    "Nehemiah",
    "1,248",
    "West Midlands",
    "BAME",
    "Finance Controller",
    "knowledge transfer partnership",
    "Corporate Plan",
    "Household Data",
    "away day",
    "Consumer Standards",
    "Housing Ombudsman",
]

# Full Playbook methodology. Presence here would mean scope has drifted upward
# out of the bare minimum, which is the boundary the whole product rests on.
PLAYBOOK_TERMS = [
    "AI Governance Code",
    "maturity",
    "risk appetite",
    "Three Lines",
    "assurance rating",
    "audit universe",
    "Conviction",
    "AI Charter",
    "Internal Audit Programme",
    "strategic pillar",
    "Not evidenced",
    "Partially met",
]


def docx_text(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    return " ".join(
        "".join(node.text or "" for node in para.iter(W + "t"))
        for para in root.iter(W + "p")
    )


def shipped_files() -> list[Path]:
    files: list[Path] = []
    for root in SHIPPED:
        base = Path(root)
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if path.suffix in SHIPPED_SUFFIXES and ".next" not in path.parts:
                # Test files are not shipped to anyone.
                if path.name.endswith((".test.ts", ".test.tsx")):
                    continue
                files.append(path)
    return files


def find(term: str, files: list[Path]) -> list[tuple[Path, int, str]]:
    hits: list[tuple[Path, int, str]] = []
    pattern = re.compile(re.escape(term), re.IGNORECASE)
    for path in files:
        try:
            for number, line in enumerate(
                path.read_text(encoding="utf8").splitlines(), start=1
            ):
                if pattern.search(line):
                    hits.append((path, number, line.strip()[:160]))
        except (UnicodeDecodeError, OSError):
            continue
    return hits


def main() -> int:
    if not BARE_MINIMUM_JSON.exists():
        print("Run `python scripts/extract-source.py` first.")
        return 1

    bare_minimum = " ".join(
        json.loads(BARE_MINIMUM_JSON.read_text(encoding="utf8"))["paragraphs"]
    ).lower()

    files = shipped_files()
    lines = [
        "# Example-contamination audit",
        "",
        "Has anything from the two reference documents leaked into the shipped",
        "product?",
        "",
        "`Nehemiah_AI_Governance_Playbook_2.docx` is **another client's board pack**,",
        "marked Confidential. The Full Playbook master prompt is explicit: *\"Do not copy facts,",
        "risks, roles, strategic pillars, numbers, regulations or conclusions from any",
        "previous client example.\"* `karl-master-prompt.md` describes the Full Playbook —",
        "the tier above this product — so its vocabulary appearing here would mean the",
        "scope boundary has drifted.",
        "",
        "A term is only reported if it does **not** also appear in the Bare Minimum",
        "Pack. `ISO 42001`, `EU AI Act` and `AI Transparency Index` are all legitimately",
        "in the Pack, so finding them in the product is correct.",
        "",
        f"Scanned {len(files)} shipped source files under {', '.join(SHIPPED)}/ "
        "(excluding tests, docs and scripts).",
        "",
        "Re-runnable: `python scripts/contamination-check.py`",
        "",
    ]

    problems: list[str] = []

    for label, terms in (
        ("Another client's specifics (Nehemiah)", NEHEMIAH_TERMS),
        ("Full Playbook methodology (scope drift)", PLAYBOOK_TERMS),
    ):
        lines.append(f"## {label}")
        lines.append("")
        found_any = False

        for term in terms:
            legitimate = term.lower() in bare_minimum
            hits = find(term, files)

            if not hits:
                continue

            if legitimate:
                lines.append(
                    f"- `{term}` — {len(hits)} occurrence(s), but this term also appears "
                    "in the Bare Minimum Pack, so it is legitimate."
                )
                continue

            guard_only = all(
                path.as_posix() in GUARD_FILES for path, _, _ in hits
            )
            if guard_only:
                lines.append(
                    f"- `{term}` — {len(hits)} occurrence(s), all inside the tailoring "
                    "validator's banned-term list. The term is there to be rejected, "
                    "which is the guard working rather than a leak."
                )
                continue

            found_any = True
            problems.append(term)
            lines.append("")
            lines.append(f"### ⚠ `{term}` — not in the Bare Minimum Pack")
            lines.append("")
            for path, number, text in hits[:10]:
                lines.append(f"- `{path.as_posix()}:{number}` — {text}")
            lines.append("")

        if not found_any:
            lines.append("Nothing found that is not also in the source Pack.")
            lines.append("")

    lines.append("## Result")
    lines.append("")
    if problems:
        lines.append(f"**{len(problems)} term(s) need review:** " + ", ".join(f"`{p}`" for p in problems))
    else:
        lines.append(
            "**Clean.** No reference-document specifics appear in the shipped product."
        )

    REPORT.write_text("\n".join(lines) + "\n", encoding="utf8")
    print(f"Scanned {len(files)} shipped files.")
    print(f"Terms needing review: {len(problems)}")
    print(f"Report: {REPORT}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
