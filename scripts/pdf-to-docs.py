#!/usr/bin/env python3
"""
Extract Kiribati Primary Clinical Care Manual PDF into Docusaurus markdown docs.
Usage: python scripts/pdf-to-docs.py [path-to-pdf]
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("PyMuPDF required: python -m pip install pymupdf", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

# Major sections map TOC headings to output folders (order matters for parsing).
SECTION_FOLDERS: list[tuple[str, str]] = [
    (r"^Introduction$", "Introduction"),
    (r"^Patient assessment", "Assessment"),
    (r"^Pain, nausea", "Assessment"),
    (r"^Emergency$", "Emergency"),
    (r"^Critical emergencies", "Emergency"),
    (r"^Cardiovascular emergencies", "Emergency"),
    (r"^Neurological Emergencies", "Emergency"),
    (r"^Traumatic injuries", "Emergency"),
    (r"^Acute abdominal pain$", "Emergency"),
    (r"^Management of common surgical", "Emergency"),
    (r"^Common medical conditions", "Medical"),
    (r"^Non-Communicable Disease", "Medical"),
    (r"^Cardiovascular and respiratory", "Medical"),
    (r"^Ear, Nose and Throat", "Medical"),
    (r"^Oral health", "Medical"),
    (r"^Eye problems", "Medical"),
    (r"^Gastrointestinal$", "Medical"),
    (r"^Gastrointestinal emergencies", "Medical"),
    (r"^Obstetric and Gynecological", "Maternal"),
    (r"^Genitourinary emergencies", "Medical"),
    (r"^Mental health", "Medical"),
    (r"^Paediatrics$", "Pediatrics"),
    (r"^Skin problems", "Skin"),
    (r"^Infectious diseases", "Infectious-Diseases"),
    (r"^Appendix$", "Appendix"),
]

SKIP_PATTERNS = re.compile(
    r"^(Kiribati Primary Clinical Care Manual|"
    r"\d+ \| Kiribati Primary Clinical Care Manual|"
    r".*\|\s*Kiribati Primary Clinical Care Manual|"
    r"Table of contents)$",
    re.I,
)

ROMAN_VALUES = {
    "i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7,
    "viii": 8, "ix": 9, "x": 10, "xi": 11, "xii": 12, "xiii": 13,
    "xiv": 14, "xv": 15,
}

MARKER_RE = re.compile(r"-- (\d+) of 745 --")
FOOTER_RE = re.compile(r"^(\d+)\s*\|?\s*Kiribati Primary Clinical Care Manual", re.M)


def sanitize_for_markdown(text: str) -> str:
    """Escape characters that break MDX and remove control characters from PDF."""
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    text = text.replace("{", "\\{").replace("}", "\\}")
    text = re.sub(r"(?<![`<])<(?=\s*\d|[A-Za-z/!@$])", "&lt;", text)
    return text


def normalize_title(title: str) -> str:
    title = re.sub(r"[\u2002\u2003\u2009\u200b\x08\x0c\x0e-\x1f]+", " ", title)
    return re.sub(r"\s+", " ", title).strip()


def normalize_line(line: str) -> str:
    return normalize_title(re.sub(r"[\u2002\u2003\u2009\t]+", " ", line))


def slugify(title: str) -> str:
    title = normalize_title(title)
    title = re.sub(r"\s*\([^)]*\)\s*", " ", title)
    title = re.sub(r"\s*–.*$", "", title)
    title = re.sub(r"\s*-.*$", "", title)
    slug = re.sub(r"[^\w\s-]", "", title, flags=re.UNICODE)
    slug = re.sub(r"[\s_]+", "-", slug.strip()).strip("-")
    return slug[:80] or "topic"


def clean_page_text(text: str) -> str:
    lines: list[str] = []
    for line in text.splitlines():
        s = line.strip()
        if not s:
            lines.append("")
            continue
        if re.match(r"^\d+ \| Kiribati Primary Clinical Care Manual", s):
            continue
        if s == "Kiribati Primary Clinical Care Manual":
            continue
        if re.match(r"^[ivx]+\s*\|\s*Kiribati Primary Clinical Care Manual", s, re.I):
            continue
        lines.append(line.rstrip())
    return "\n".join(lines).strip()


def extract_pages(pdf_path: Path) -> list[str]:
    doc = fitz.open(pdf_path)
    pages: list[str] = []
    for i in range(len(doc)):
        pages.append(clean_page_text(doc[i].get_text()))
    doc.close()
    return pages


def find_toc_start(pages: list[str]) -> int:
    for i, page in enumerate(pages):
        if "Table of contents" in page:
            return i
    raise RuntimeError("Could not find Table of contents in PDF")


def build_page_index(pages: list[str]) -> dict[int, int]:
    """Map printed page numbers to 0-based PDF page indices."""
    index: dict[int, int] = {}
    for i, page in enumerate(pages):
        for m in MARKER_RE.finditer(page):
            index[int(m.group(1))] = i
        for m in FOOTER_RE.finditer(page):
            num = int(m.group(1))
            index.setdefault(num, i)
    return index


def parse_line_page(line: str) -> tuple[str | None, int | None]:
    """Return (title, page) when line contains a page number, else (None, None)."""
    s = normalize_line(line)
    if not s:
        return None, None

    inline = re.match(r"^(.+?)\s+(\d{1,3})$", s)
    if inline:
        title, num = inline.group(1).strip(), int(inline.group(2))
        if 1 <= num <= 745 and len(title) > 2:
            return title, num

    if re.fullmatch(r"\d{1,3}", s):
        return None, int(s)

    if re.fullmatch(r"[ivx]+", s, re.I):
        return None, ROMAN_VALUES.get(s.lower())

    return None, None


SECTION_ONLY = {
    "introduction", "emergency", "appendix", "paediatrics",
    "pain, nausea and vomiting", "critical emergencies",
    "cardiovascular emergencies", "neurological emergencies",
    "gastrointestinal emergencies", "gastrointestinal",
    "genitourinary emergencies", "mental health", "oral health",
    "eye problems", "skin problems", "infectious diseases",
    "common medical conditions", "obstetric and gynecological",
    "patient assessment and transport", "post streptococcal diseases",
    "gastrointestinal problems",
}


def flush_title(
    title_buffer: list[str],
    page_num: int,
    current_folder: str,
    entries: list[tuple[str, int, str]],
) -> str:
    if not title_buffer:
        return current_folder
    title = normalize_title(re.sub(r"\s+", " ", " ".join(title_buffer)).strip())
    if not title:
        return current_folder
    if page_num < 1 or page_num > 745:
        return current_folder

    title_key = normalize_title(title).lower().rstrip(":")

    for pattern, folder in SECTION_FOLDERS:
        if re.match(pattern, title_key.rstrip(":"), re.I) or re.match(
            pattern, title.rstrip(":").strip(), re.I
        ):
            current_folder = folder
            if title_key in SECTION_ONLY:
                return current_folder
            break

    if title_key in {"foreword", "acknowledgments", "funding"}:
        return current_folder
    if title_key.startswith("introduction") and page_num <= 2:
        return current_folder

    folder = assign_folder(title, current_folder)
    entries.append((title, page_num, folder))
    return current_folder


def assign_folder(title: str, current_folder: str) -> str:
    lower = normalize_title(title).lower()
    if lower in {"foreword", "acknowledgments", "funding"}:
        return "Introduction"
    if any(k in lower for k in ("iv therapy", "iv fluid", "iv flow")):
        return "Nursing"
    if "cannulation" in lower or "intraosseous" in lower:
        return "Nursing"
    return current_folder or "Medical"


def parse_toc(pages: list[str]) -> list[tuple[str, int, str]]:
    """Return list of (title, page_number, folder)."""
    start = find_toc_start(pages)
    entries: list[tuple[str, int, str]] = []
    current_folder = "Introduction"
    title_buffer: list[str] = []

    toc_lines: list[str] = []
    for page in pages[start : start + 10]:
        toc_lines.extend(page.splitlines())

    def flush(page_num: int) -> None:
        nonlocal current_folder, title_buffer
        current_folder = flush_title(title_buffer, page_num, current_folder, entries)
        title_buffer = []

    for raw_line in toc_lines:
        line = normalize_line(raw_line)
        if not line or line == "Table of contents":
            continue
        if SKIP_PATTERNS.match(line):
            continue
        if "Kiribati Primary Clinical Care Manual" in line and "|" in line:
            continue

        matched_section = False
        check = normalize_title(line.rstrip(":").strip())
        for pattern, folder in SECTION_FOLDERS:
            if re.match(pattern, check, re.I):
                current_folder = folder
                matched_section = True
                break
        if matched_section and line.endswith(":"):
            title_buffer = []
            continue

        title_inline, page_num = parse_line_page(line)
        if title_inline and page_num:
            title_buffer = [title_inline]
            flush(page_num)
            continue

        _, page_only = parse_line_page(line)
        if page_only is not None and title_inline is None:
            inline_check = re.match(r"^(.+?)\s+(\d{1,3})$", line)
            if inline_check:
                title_buffer = [inline_check.group(1).strip()]
                flush(int(inline_check.group(2)))
            else:
                flush(page_only)
            continue

        if not re.fullmatch(r"[ivx]+", line, re.I):
            title_buffer.append(line)

    seen: set[tuple[str, int]] = set()
    unique: list[tuple[str, int, str]] = []
    for title, page_num, folder in entries:
        key = (title.lower(), page_num)
        if key in seen:
            continue
        seen.add(key)
        unique.append((title, page_num, folder))

    unique.sort(key=lambda x: x[1])
    return unique


def page_range_text(
    pages: list[str], page_index: dict[int, int], start_page: int, end_page: int
) -> str:
    def index_for_printed(num: int) -> int:
        if num in page_index:
            return page_index[num]
        return max(0, min(len(pages) - 1, num + 14))

    start_idx = index_for_printed(start_page)
    end_idx = index_for_printed(end_page) if end_page else len(pages) - 1
    chunks = [pages[i] for i in range(start_idx, min(end_idx + 1, len(pages)))]
    return "\n\n".join(chunks).strip()


def write_topic(folder: str, title: str, body: str, position: int) -> Path:
    folder_path = DOCS / folder
    folder_path.mkdir(parents=True, exist_ok=True)
    slug = slugify(title)
    path = folder_path / f"{slug}.md"

    content = f"""---
sidebar_position: {position}
---

# {title}

{sanitize_for_markdown(body)}
"""
    path.write_text(content, encoding="utf-8")
    return path


def write_category_json(folder: str, label: str, position: int, description: str) -> None:
    folder_path = DOCS / folder
    folder_path.mkdir(parents=True, exist_ok=True)
    cat_path = folder_path / "_category_.json"
    if cat_path.exists():
        return
    import json

    cat_path.write_text(
        json.dumps(
            {
                "label": label,
                "position": position,
                "link": {
                    "type": "generated-index",
                    "description": description,
                },
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def ensure_categories() -> None:
    categories = [
        ("Introduction", "Introduction", 1, "Foreword, acknowledgments, and manual overview."),
        ("Assessment", "Patient Assessment", 2, "Patient assessment, transport, pain, and nausea."),
        ("Emergency", "Emergency", 3, "Emergency and critical care protocols."),
        ("Medical", "Medical Conditions", 4, "Common medical, ENT, oral, eye, GI, and mental health."),
        ("Maternal", "Maternal & Gynecological", 5, "Obstetric and gynecological care."),
        ("Pediatrics", "Pediatrics", 6, "Pediatric assessment and conditions."),
        ("Skin", "Skin Conditions", 7, "Dermatology and skin infections."),
        ("Infectious-Diseases", "Infectious Diseases", 8, "Communicable disease protocols."),
        ("Appendix", "Appendix", 9, "Reference tables, drug dosing, and IV therapy."),
        ("Nursing", "Nursing Procedures", 10, "Nursing care and procedural guidelines."),
    ]
    for folder, label, pos, desc in categories:
        write_category_json(folder, label, pos, desc)


def write_intro(pages: list[str], page_index: dict[int, int]) -> None:
    foreword = page_range_text(pages, page_index, 1, 4)
    intro_body = page_range_text(pages, page_index, 2, 5)
    intro_path = DOCS / "intro.md"
    intro_path.write_text(
        f"""---
sidebar_position: 1
title: Kiribati Primary Clinical Care Manual
---

# Kiribati Primary Clinical Care Manual 2026

**Ministry of Health and Medical Services — Republic of Kiribati**

Welcome to the digital edition of the Kiribati Primary Clinical Care Manual. This resource supports nurses, medical assistants, and allied health professionals delivering primary health care across Kiribati.

## About this manual

{intro_body}

## Foreword

{foreword}

## Quick navigation

- [Introduction](/docs/category/introduction) — Bill of Rights, Code of Conduct, frameworks
- [Emergency](/docs/category/emergency) — BLS, shock, sepsis, trauma, and critical care
- [Medical Conditions](/docs/category/medical-conditions) — Common presentations and specialty care
- [Maternal & Gynecological](/docs/category/maternal-gynecological) — Obstetric and women's health
- [Pediatrics](/docs/category/pediatrics) — Child and neonatal care
- [Appendix](/docs/category/appendix) — Drug tables, IV therapy, abbreviations

:::info License
This manual is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Feedback: pccmfeedback@mhms.gov.ki
:::
""",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert Kiribati PCCM PDF to Docusaurus docs")
    parser.add_argument(
        "pdf",
        nargs="?",
        default=r"c:\Users\ruazy\OneDrive - Ministry of Health and Medical Services\PHIT - MHMS\Android APP\Kiribati Manual_Book v7.pdf",
    )
    parser.add_argument("--limit", type=int, default=0, help="Max topics to extract (0 = all)")
    parser.add_argument("--clean", action="store_true", help="Remove existing topic .md files before extract")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        print(f"PDF not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    if args.clean:
        for folder_path in DOCS.iterdir():
            if folder_path.is_dir():
                for md in folder_path.glob("*.md"):
                    md.unlink()
        print("Cleaned existing topic files")

    print(f"Reading {pdf_path}...")
    pages = extract_pages(pdf_path)
    print(f"Extracted {len(pages)} pages")

    page_index = build_page_index(pages)
    print(f"Indexed {len(page_index)} printed page markers")

    ensure_categories()
    write_intro(pages, page_index)

    toc = parse_toc(pages)
    print(f"Parsed {len(toc)} TOC entries")

    folder_counts: dict[str, int] = {}
    written = 0
    for i, (title, page_num, folder) in enumerate(toc):
        if args.limit and written >= args.limit:
            break
        next_page = toc[i + 1][1] if i + 1 < len(toc) else 745
        if next_page <= page_num:
            next_page = page_num + 1
        body = page_range_text(pages, page_index, page_num, next_page - 1)
        if len(body) < 80:
            continue
        folder_counts[folder] = folder_counts.get(folder, 0) + 1
        write_topic(folder, title, body, folder_counts[folder])
        written += 1
        if written % 50 == 0:
            print(f"  ... {written} topics written")

    print(f"Done. Wrote {written} topic files across {len(folder_counts)} folders.")


if __name__ == "__main__":
    main()
