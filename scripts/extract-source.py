"""
Pull the plain text out of the source Pack so the transcription can be checked
against it.

Writes .source-text.json (gitignored) for scripts/content-check.test.ts to read.
The .docx itself is deliberately not in the repository — see .gitignore — so
this reads whatever is present locally and the check skips cleanly when it is
not.

    python scripts/extract-source.py
"""

import json
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
SOURCE = Path("docs/examples/AI Bare Minimum Pack Complete.docx")
OUT = Path(".source-text.json")


def paragraphs(docx_path: Path) -> list[str]:
    with zipfile.ZipFile(docx_path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))

    # One entry per <w:p>. Table cells come through as their own paragraphs,
    # which is why the check matches per-string rather than trying to
    # reconstruct the document's structure.
    return [
        "".join(node.text or "" for node in para.iter(W + "t"))
        for para in root.iter(W + "p")
    ]


def main() -> int:
    if not SOURCE.exists():
        print(f"Source document not found at {SOURCE}.")
        print("Nothing extracted; the content check will skip.")
        return 1

    lines = paragraphs(SOURCE)
    OUT.write_text(
        json.dumps({"source": str(SOURCE), "paragraphs": lines}, ensure_ascii=False),
        encoding="utf8",
    )
    print(f"Extracted {len(lines)} paragraphs to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
